package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/charmbracelet/bubbles/textarea"
	"github.com/charmbracelet/bubbles/viewport"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"github.com/joho/godotenv"
)

// ======== THEMES & STYLING ========

type Theme struct {
	HeaderBg lipgloss.Color
	HeaderFg lipgloss.Color

	PaneBorderActive   lipgloss.Color
	PaneBorderInactive lipgloss.Color

	FooterBg lipgloss.Color
	FooterFg lipgloss.Color
	ComplFg  lipgloss.Color
}

// defaultTheme provides a fallback if theme files are missing.
func defaultTheme() Theme {
	return Theme{
		HeaderBg:           lipgloss.Color("#5C5C5C"),
		HeaderFg:           lipgloss.Color("#FFFFFF"),
		PaneBorderActive:   lipgloss.Color("#AD58B4"),
		PaneBorderInactive: lipgloss.Color("#5C5C5C"),
		FooterBg:           lipgloss.Color("#3C3C3C"),
		FooterFg:           lipgloss.Color("#FFFFFF"),
		ComplFg:            lipgloss.Color("#00ADD8"),
	}
}

func loadTheme(path string) (Theme, error) {
	env, err := godotenv.Read(path)
	if err != nil {
		return Theme{}, err
	}
	return Theme{
		HeaderBg:           lipgloss.Color(env["HEADER_BG"]),
		HeaderFg:           lipgloss.Color(env["HEADER_FG"]),
		PaneBorderActive:   lipgloss.Color(env["PANE_BORDER_ACTIVE"]),
		PaneBorderInactive: lipgloss.Color(env["PANE_BORDER_INACTIVE"]),
		FooterBg:           lipgloss.Color(env["FOOTER_BG"]),
		FooterFg:           lipgloss.Color(env["FOOTER_FG"]),
		ComplFg:            lipgloss.Color(env["COMPL_FG"]),
	}, nil
}

// ======== COMMANDS ========

type Command struct {
	Name        string
	Description string
	Executor    func(m *model, args []string) (string, error)
}

// ======== MODEL ========

type pane int

const (
	leftPane pane = iota
	rightPane
	replPane
)

// Styles holds all the lipgloss styles, derived from the current theme.
type Styles struct {
	header           lipgloss.Style
	footer           lipgloss.Style
	completion       lipgloss.Style
	paneBorder       lipgloss.Style
	paneBorderActive lipgloss.Style
	repl             lipgloss.Style
}

func (m *model) getStyles() Styles {
	return Styles{
		header: lipgloss.NewStyle().
			Background(m.currentTheme.HeaderBg).
			Foreground(m.currentTheme.HeaderFg).
			Padding(0, 1),
		footer: lipgloss.NewStyle().
			Background(m.currentTheme.FooterBg).
			Foreground(m.currentTheme.FooterFg).
			Padding(0, 1),
		completion: lipgloss.NewStyle().
			Foreground(m.currentTheme.ComplFg),
		paneBorder: lipgloss.NewStyle().
			Border(lipgloss.NormalBorder()).
			BorderForeground(m.currentTheme.PaneBorderInactive),
		paneBorderActive: lipgloss.NewStyle().
			Border(lipgloss.NormalBorder()).
			BorderForeground(m.currentTheme.PaneBorderActive),
		repl: lipgloss.NewStyle().
			Border(lipgloss.NormalBorder()).
			BorderForeground(m.currentTheme.PaneBorderActive),
	}
}

type model struct {
	// Panes & Viewports
	leftVP       viewport.Model
	rightVP      viewport.Model
	repl         textarea.Model
	activePane   pane
	leftContent  []string
	rightContent []string

	// Sizing
	width  int
	height int

	// Commands & API
	commands   map[string]Command
	apiPort    string
	httpServer *http.Server
	program    *tea.Program // Reference to the program to send messages

	// Theming & Footer
	themes        map[string]Theme
	currentTheme  Theme
	themeName     string
	suggestions   []string
	footerHelp    string
}

// serverLogMsg is a custom message to send logs from the server to the TUI.
type serverLogMsg struct{ content string }
type mainLogMsg struct{ content string }

func initialModel(port string) model {
	// --- Initial Content ---
	leftContent := []string{
		"Welcome to Tubes!",
		"This is the primary log pane.",
	}

	// --- Themes ---
	themes := make(map[string]Theme)
	oceanTheme, err := loadTheme("dark_ocean.theme")
	if err != nil {
		leftContent = append(leftContent, "Warning: could not load dark_ocean.theme, using default.")
		themes["ocean"] = defaultTheme()
	} else {
		themes["ocean"] = oceanTheme
	}

	neonTheme, err := loadTheme("cyber_neon.theme")
	if err != nil {
		leftContent = append(leftContent, "Warning: could not load cyber_neon.theme, using default.")
		themes["neon"] = defaultTheme()
	} else {
		themes["neon"] = neonTheme
	}

	// --- REPL ---
	ta := textarea.New()
	ta.Placeholder = "Type a /command and press Enter..."
	ta.Focus()
	ta.Prompt = "┃ "
	ta.CharLimit = 280
	ta.SetHeight(1) // Single line input
	ta.KeyMap.InsertNewline.SetEnabled(false)

	m := model{
		repl:         ta,
		activePane:   replPane,
		themes:       themes,
		currentTheme: themes["ocean"],
		themeName:    "ocean",
		apiPort:      port,
		leftContent:  leftContent,
		rightContent: []string{
			"API Log",
			fmt.Sprintf("API server starting on port %s", port),
		},
		footerHelp: "Tab: Cycle Panes | Up/Down: Scroll | Ctrl+C: Quit",
	}

	m.loadCommands()
	return m
}

// ======== BUBBLETEA LIFECYCL ========

func (m *model) Init() tea.Cmd {
	return tea.Batch(textarea.Blink, m.startServerCmd())
}

func (m *model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	var cmds []tea.Cmd
	var cmd tea.Cmd

	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.resizeLayout()

	case tea.KeyMsg:
		// Always handle typing in the REPL if active
		if m.activePane == replPane && msg.Type != tea.KeyEnter && msg.Type != tea.KeyTab {
			m.repl, cmd = m.repl.Update(msg)
			m.updateSuggestions()
			cmds = append(cmds, cmd)
		}

		switch msg.Type {
		case tea.KeyCtrlC, tea.KeyEsc:
			return m, tea.Sequence(m.shutdownServerCmd(), tea.Quit)
		case tea.KeyTab:
			if m.activePane == replPane {
				m.applySuggestion()
			} else {
				m.cyclePane()
			}
		case tea.KeyEnter:
			if m.activePane == replPane {
				m.handleInput()
			}
		default:
			// Pass key messages to the active viewport for scrolling
			if m.activePane != replPane {
				switch m.activePane {
				case leftPane:
					m.leftVP, cmd = m.leftVP.Update(msg)
					cmds = append(cmds, cmd)
				case rightPane:
					m.rightVP, cmd = m.rightVP.Update(msg)
					cmds = append(cmds, cmd)
				}
			}
		}

	// Custom messages for thread-safe logging
	case serverLogMsg:
		m.rightContent = append(m.rightContent, msg.content)
		m.rightVP.SetContent(strings.Join(m.rightContent, "\n"))
		m.rightVP.GotoBottom()
	case mainLogMsg:
		m.leftContent = append(m.leftContent, msg.content)
		m.leftVP.SetContent(strings.Join(m.leftContent, "\n"))
		m.leftVP.GotoBottom()
	}

	return m, tea.Batch(cmds...)
}

func (m *model) View() string {
	if m.width == 0 {
		return "Initializing..."
	}

	s := m.getStyles()
	header := s.header.Width(m.width).Render("Tubes")
	footer := m.renderFooter(s)

	leftWidth := m.width / 3
	rightWidth := m.width - leftWidth
	paneHeight := m.height - lipgloss.Height(header) - lipgloss.Height(footer) - 3 // 3 = repl height with borders

	leftPaneStyle := s.paneBorder
	rightPaneStyle := s.paneBorder

	switch m.activePane {
	case leftPane:
		leftPaneStyle = s.paneBorderActive
	case rightPane:
		rightPaneStyle = s.paneBorderActive
	}

	left := leftPaneStyle.Width(leftWidth - 2).Height(paneHeight).Render(m.leftVP.View())
	right := rightPaneStyle.Width(rightWidth - 2).Height(paneHeight).Render(m.rightVP.View())

	content := lipgloss.JoinHorizontal(lipgloss.Top, left, right)
	repl := s.repl.Width(m.width - 2).Render(m.repl.View())

	return lipgloss.JoinVertical(lipgloss.Left, header, content, repl, footer)
}

// ======== HELPERS (Layout, Panes, Input) ========

func (m *model) resizeLayout() {
	headerHeight := lipgloss.Height(m.getStyles().header.Render(""))
	footerHeight := lipgloss.Height(m.getStyles().footer.Render(""))
	replHeight := 3 // textarea height + border

	leftWidth := m.width / 3
	rightWidth := m.width - leftWidth
	paneHeight := m.height - headerHeight - footerHeight - replHeight

	m.leftVP.Width = leftWidth - 2
	m.leftVP.Height = paneHeight
	m.leftVP.SetContent(strings.Join(m.leftContent, "\n"))

	m.rightVP.Width = rightWidth - 2
	m.rightVP.Height = paneHeight
	m.rightVP.SetContent(strings.Join(m.rightContent, "\n"))

	m.repl.SetWidth(m.width - 2)
}

func (m *model) cyclePane() {
	m.activePane = (m.activePane + 1) % 3
	if m.activePane == replPane {
		m.repl.Focus()
	} else {
		m.repl.Blur()
	}
}

func (m *model) handleInput() {
	input := strings.TrimSpace(m.repl.Value())
	if input == "" {
		return
	}

	m.leftContent = append(m.leftContent, "▶ "+input)
	parts := strings.Fields(input)
	cmdName := parts[0]
	args := parts[1:]

	if cmd, ok := m.commands[cmdName]; ok {
		result, err := cmd.Executor(m, args)
		if err != nil {
			m.leftContent = append(m.leftContent, "Error: "+err.Error())
		} else if result != "" {
			m.leftContent = append(m.leftContent, result)
		}
	} else {
		m.leftContent = append(m.leftContent, "Error: Unknown command '"+cmdName+"'")
	}

	m.repl.Reset()
	m.updateSuggestions()
	m.leftVP.SetContent(strings.Join(m.leftContent, "\n"))
	m.leftVP.GotoBottom()
}

func (m *model) renderFooter(s Styles) string {
	var footerText strings.Builder
	footerText.WriteString(m.footerHelp)

	if len(m.suggestions) > 0 && m.activePane == replPane {
		footerText.WriteString(" | Suggest: ")
		sugStr := strings.Join(m.suggestions, ", ")
		footerText.WriteString(s.completion.Render(sugStr))
	}
	return s.footer.Width(m.width).Render(footerText.String())
}

// ======== COMMANDS & COMPLETION ========

func (m *model) loadCommands() {
	m.commands = map[string]Command{
		"/help": {
			Name:        "/help",
			Description: "Shows this help message.",
			Executor: func(model *model, args []string) (string, error) {
				var b strings.Builder
				b.WriteString("Available commands:\n")
				keys := make([]string, 0, len(model.commands))
				for k := range model.commands {
					keys = append(keys, k)
				}
				sort.Strings(keys)
				for _, k := range keys {
					b.WriteString(fmt.Sprintf("  %s: %s\n", model.commands[k].Name, model.commands[k].Description))
				}
				return b.String(), nil
			},
		},
		"/clear": {
			Name:        "/clear",
			Description: "Clears the main content pane.",
			Executor: func(model *model, args []string) (string, error) {
				model.leftContent = []string{"Log cleared."}
				model.leftVP.SetContent("Log cleared.")
				return "", nil
			},
		},
		"/theme": {
			Name:        "/theme [ocean|neon]",
			Description: "Changes the current color theme.",
			Executor: func(model *model, args []string) (string, error) {
				if len(args) != 1 {
					return "", errors.New("usage: /theme [ocean|neon]")
				}
				themeName := args[0]
				if theme, ok := model.themes[themeName]; ok {
					model.currentTheme = theme
					model.themeName = themeName
					return fmt.Sprintf("Theme changed to '%s'", themeName), nil
				}
				return "", fmt.Errorf("theme '%s' not found", themeName)
			},
		},
		"/api": {
			Name:        "/api/list",
			Description: "Describes the available API endpoints.",
			Executor: func(model *model, args []string) (string, error) {
				var b strings.Builder
				b.WriteString(fmt.Sprintf("API server is running on http://localhost:%s\n", model.apiPort))
				b.WriteString("Available endpoints:\n")
				b.WriteString("  GET /api/list: Lists and explains API endpoints.\n")
				b.WriteString("  GET /fzf/api: Lists common fzf use cases and commands.\n")
				b.WriteString("  POST /log: Adds a message to the left TUI pane. (JSON: {\"message\": \"...\"})\n")
				return b.String(), nil
			},
		},
		"/fzf": {
			Name:        "/fzf",
			Description: "Lists common fzf examples.",
			Executor:    getFZFInfo,
		},
	}
}

func (m *model) updateSuggestions() {
	input := m.repl.Value()
	m.suggestions = []string{}
	if !strings.HasPrefix(input, "/") || strings.Contains(input, " ") {
		return
	}
	for name := range m.commands {
		if strings.HasPrefix(name, input) {
			m.suggestions = append(m.suggestions, name)
		}
	}
	sort.Strings(m.suggestions)
}

func (m *model) applySuggestion() {
	if len(m.suggestions) > 0 {
		m.repl.SetValue(m.suggestions[0] + " ")
		m.repl.SetCursor(len(m.repl.Value()))
		m.updateSuggestions()
	}
}

func getFZFInfo(m *model, args []string) (string, error) {
	var b strings.Builder
	b.WriteString("FZF is a powerful command-line fuzzy finder.\n")
	b.WriteString("Common Commands (run in your shell):\n")
	b.WriteString("  - `find . -type f | fzf`: Find any file in the current directory.\n")
	b.WriteString("  - `git log | fzf`: Interactively search git log.\n")
	b.WriteString("  - `history | fzf`: Fuzzy search your command history.\n")
	b.WriteString("See https://github.com/junegunn/fzf for more.\n")
	return b.String(), nil
}

// ======== API SERVER ========

func (m *model) startServerCmd() tea.Cmd {
	return func() tea.Msg {
		handler := http.NewServeMux()

		logServer := func(msg string) {
			if m.program != nil {
				m.program.Send(serverLogMsg{content: fmt.Sprintf("[%s] %s", time.Now().Format("15:04:05"), msg)})
			}
		}

		logMain := func(msg string) {
			if m.program != nil {
				m.program.Send(mainLogMsg{content: msg})
			}
		}

		handler.HandleFunc("/api/list", func(w http.ResponseWriter, r *http.Request) {
			logServer("GET /api/list")
			w.Header().Set("Content-Type", "application/json")
			info, _ := m.commands["/api"].Executor(m, nil)
			json.NewEncoder(w).Encode(map[string]string{"description": info})
		})

		handler.HandleFunc("/fzf/api", func(w http.ResponseWriter, r *http.Request) {
			logServer("GET /fzf/api")
			w.Header().Set("Content-Type", "application/json")
			info, _ := getFZFInfo(m, nil)
			json.NewEncoder(w).Encode(map[string]string{"description": info})
		})

		handler.HandleFunc("/log", func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost {
				http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
				return
			}
			var body struct {
				Message string `json:"message"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				http.Error(w, "Invalid JSON", http.StatusBadRequest)
				return
			}
			logServer(fmt.Sprintf("POST /log - msg: '%s'", body.Message))
			logMain("[API] " + body.Message)
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]string{"status": "logged"})
		})

		m.httpServer = &http.Server{
			Addr:    ":" + m.apiPort,
			Handler: handler,
		}

		if err := m.httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("API server failed: %v", err)
		}
		return nil
	}
}

func (m *model) shutdownServerCmd() tea.Cmd {
	return func() tea.Msg {
		if m.httpServer != nil {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			m.httpServer.Shutdown(ctx)
		}
		return nil
	}
}

// ======== MAIN ========

func main() {
	f, err := os.OpenFile("tubes.log", os.O_RDWR|os.O_CREATE|os.O_APPEND, 0666)
	if err != nil {
		log.Fatalf("error opening file: %v", err)
	}
	defer f.Close()
	log.SetOutput(f)

	port := flag.String("port", "8080", "Port for the API server")
	flag.Parse()

	m := initialModel(*port)
	p := tea.NewProgram(
		&m,
		tea.WithAltScreen(),
		tea.WithMouseCellMotion(),
	)
	m.program = p // Give the model a reference to the program for sending messages

	if _, err := p.Run(); err != nil {
		log.Fatalf("Error running Tubes: %v", err)
	}
}

