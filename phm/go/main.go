package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

const (
	apiKey     = "iamthat"
	socketPath = "/var/www/phm/api/ph-api.sock"
	uploadDir  = "/var/www/phm/uploads/"
)

// ImageUploadRequest defines the expected JSON structure
type ImageUploadRequest struct {
	Image string `json:"image"`
}

// Response struct
type UploadResponse struct {
	Message string `json:"message"`
	Path    string `json:"path"`
}

// Ensure upload directory exists
func ensureUploadDir() {
	if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
		err := os.MkdirAll(uploadDir, 0755)
		if err != nil {
			fmt.Println("Failed to create upload directory:", err)
			os.Exit(1)
		}
	}
}

// Generate next available filename
func getNextImageName() string {
	files, err := ioutil.ReadDir(uploadDir)
	if err != nil {
		fmt.Println("Failed to read upload directory:", err)
		return "img1.png"
	}

	maxIndex := 0
	for _, file := range files {
		var index int
		_, err := fmt.Sscanf(file.Name(), "img%d.png", &index)
		if err == nil && index > maxIndex {
			maxIndex = index
		}
	}
	return fmt.Sprintf("img%d.png", maxIndex+1)
}

func uploadHandler(w http.ResponseWriter, r *http.Request) {
	// Open debug log file
	logFile, _ := os.OpenFile("/tmp/ph-api-debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	defer logFile.Close()
	logger := log.New(logFile, "ph-api: ", log.LstdFlags)

	logger.Println("Received API request")

	// Ensure the request method is POST
	if r.Method != http.MethodPost {
		logger.Println("Invalid request method:", r.Method)
		http.Error(w, `{"error": "Method Not Allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	// API Key Authentication
	authHeader := r.Header.Get("Authorization")
	if authHeader != "Bearer "+apiKey {
		logger.Println("Unauthorized access attempt")
		http.Error(w, `{"error": "Unauthorized"}`, http.StatusUnauthorized)
		return
	}

	// Parse JSON request
	var req ImageUploadRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		logger.Println("Invalid JSON payload:", err)
		http.Error(w, `{"error": "Invalid JSON"}`, http.StatusBadRequest)
		return
	}

	// Validate Base64 string
	if len(req.Image) < 20 {
		logger.Println("Base64 string too short, rejecting request")
		http.Error(w, `{"error": "Invalid Base64 string"}`, http.StatusBadRequest)
		return
	}

	// Log received Base64 data (only first 50 chars if safe)
	logger.Println("Received Base64 length:", len(req.Image))
	if len(req.Image) > 50 {
		logger.Println("First 50 chars before processing:", req.Image[:50])
	} else {
		logger.Println("Base64 string too short for preview")
	}

	// Trim whitespace or unexpected characters
	base64Data := strings.TrimSpace(req.Image)

	// Ensure prefix is removed
	if strings.HasPrefix(base64Data, "data:image/png;base64,") {
		base64Data = strings.TrimPrefix(base64Data, "data:image/png;base64,")
		logger.Println("Stripped MIME prefix successfully")
	} else {
		logger.Println("MIME prefix missing, rejecting request")
		http.Error(w, `{"error": "Invalid image format"}`, http.StatusBadRequest)
		return
	}

	// Ensure Base64 padding (length should be a multiple of 4)
	for len(base64Data)%4 != 0 {
		base64Data += "="
	}

	// Decode Base64
	imageData, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		logger.Println("Base64 decode error:", err)
		http.Error(w, `{"error": "Failed to decode image"}`, http.StatusInternalServerError)
		return
	}

	// Save decoded image for debugging
	ioutil.WriteFile("/tmp/ph-api-decoded.png", imageData, 0644)

	// Ensure upload directory exists
	ensureUploadDir()

	// Generate next available filename
	filename := getNextImageName()
	filePath := filepath.Join(uploadDir, filename)

	// Save the image to the upload directory
	err = ioutil.WriteFile(filePath, imageData, 0644)
	if err != nil {
		logger.Println("Failed to save image:", err)
		http.Error(w, `{"error": "Failed to save image"}`, http.StatusInternalServerError)
		return
	}

	logger.Println("Image saved successfully:", filename)

	// Return success response
	response := UploadResponse{
		Message: "Upload successful",
		Path:    "/uploads/" + filename,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func main() {
	// Ensure upload directory exists at startup
	ensureUploadDir()

	// Remove previous socket if exists
	if _, err := os.Stat(socketPath); err == nil {
		fmt.Println("Removing existing socket:", socketPath)
		os.Remove(socketPath)
	}

	// Create socket listener
	listener, err := net.Listen("unix", socketPath)
	if err != nil {
		fmt.Println("Failed to bind to socket:", err)
		os.Exit(1)
	}
	defer listener.Close()

	// Set correct permissions for Nginx access
	os.Chmod(socketPath, 0660)

	fmt.Println("ph-api listening on", socketPath)
	http.HandleFunc("/upload", uploadHandler)

	// Start HTTP server over UNIX socket
	err = http.Serve(listener, nil)
	if err != nil {
		fmt.Println("Server error:", err)
		os.Exit(1)
	}
}
