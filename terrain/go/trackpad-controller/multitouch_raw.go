package main

/*
#cgo LDFLAGS: -F/System/Library/PrivateFrameworks -framework MultitouchSupport -framework CoreFoundation

#include <CoreFoundation/CoreFoundation.h>
#include <stdint.h>

typedef struct {
    float x;
    float y;
} MTPoint;

typedef struct {
    MTPoint position;
    MTPoint velocity;
} MTVector;

typedef struct {
    int32_t frame;
    double timestamp;
    int32_t identifier;
    int32_t state;
    int32_t unknown1;
    int32_t unknown2;
    MTVector normalized;
    float size;
    int32_t unknown3;
    float angle;
    float majorAxis;
    float minorAxis;
    MTVector absolute;
    int32_t unknown4;
    int32_t unknown5;
    float density;
} MTTouch;

typedef void* MTDeviceRef;
typedef int (*MTContactCallbackFunction)(int device, MTTouch* touches, int numTouches, double timestamp, int frame);

extern CFArrayRef MTDeviceCreateList();
extern MTDeviceRef MTDeviceCreateDefault();
extern void MTRegisterContactFrameCallback(MTDeviceRef device, MTContactCallbackFunction callback);
extern void MTDeviceStart(MTDeviceRef device, int unknown);
extern void MTDeviceStop(MTDeviceRef device);
extern void MTDeviceRelease(MTDeviceRef device);

extern int goMultitouchCallback(int device, MTTouch* touches, int numTouches, double timestamp, int frame);

static int multitouchCallbackBridge(int device, MTTouch* touches, int numTouches, double timestamp, int frame) {
    return goMultitouchCallback(device, touches, numTouches, timestamp, frame);
}

static MTDeviceRef setupMultitouch() {
    MTDeviceRef device = MTDeviceCreateDefault();
    if (device == NULL) {
        return NULL;
    }
    MTRegisterContactFrameCallback(device, multitouchCallbackBridge);
    MTDeviceStart(device, 0);
    return device;
}
*/
import "C"
import (
	"fmt"
	"log"
	"math"
	"os"
	"os/signal"
	"syscall"
	"unsafe"
)

type TouchState int

const (
	TouchNotTracking TouchState = iota
	TouchStartInRange
	TouchHoverInRange
	TouchMakeTouch
	TouchTouching
	TouchBreakTouch
	TouchLingerInRange
	TouchOutOfRange
)

func (ts TouchState) String() string {
	states := []string{
		"NotTracking", "StartInRange", "HoverInRange",
		"MakeTouch", "Touching", "BreakTouch",
		"LingerInRange", "OutOfRange",
	}
	if int(ts) < len(states) {
		return states[ts]
	}
	return "Unknown"
}

type Touch struct {
	Frame      int
	Timestamp  float64
	Identifier int
	State      TouchState
	
	X          float64
	Y          float64
	
	VelX       float64
	VelY       float64
	
	Size       float64
	Density    float64
	
	Angle      float64
	MajorAxis  float64
	MinorAxis  float64
	
	AbsX       float64
	AbsY       float64
}

type TouchFrame struct {
	Timestamp float64
	Frame     int
	Touches   []Touch
}

var (
	touchChannel chan TouchFrame
)

func init() {
	touchChannel = make(chan TouchFrame, 100)
}

//export goMultitouchCallback
func goMultitouchCallback(device C.int, touches *C.MTTouch, numTouches C.int, timestamp C.double, frame C.int) C.int {
	if numTouches == 0 {
		return 0
	}
	
	touchSlice := (*[100]C.MTTouch)(unsafe.Pointer(touches))[:numTouches:numTouches]
	
	touchFrame := TouchFrame{
		Timestamp: float64(timestamp),
		Frame:     int(frame),
		Touches:   make([]Touch, 0, numTouches),
	}
	
	for i := 0; i < int(numTouches); i++ {
		mt := touchSlice[i]
		
		angleDeg := float64(mt.angle) * 180.0 / math.Pi
		
		touch := Touch{
			Frame:      int(mt.frame),
			Timestamp:  float64(mt.timestamp),
			Identifier: int(mt.identifier),
			State:      TouchState(mt.state),
			X:          float64(mt.normalized.position.x),
			Y:          float64(mt.normalized.position.y),
			VelX:       float64(mt.normalized.velocity.x),
			VelY:       float64(mt.normalized.velocity.y),
			Size:       float64(mt.size),
			Density:    float64(mt.density),
			Angle:      angleDeg,
			MajorAxis:  float64(mt.majorAxis),
			MinorAxis:  float64(mt.minorAxis),
			AbsX:       float64(mt.absolute.position.x),
			AbsY:       float64(mt.absolute.position.y),
		}
		
		touchFrame.Touches = append(touchFrame.Touches, touch)
	}
	
	select {
	case touchChannel <- touchFrame:
	default:
	}
	
	return 0
}

type MultitouchCapture struct {
	device C.MTDeviceRef
}

func NewMultitouchCapture() (*MultitouchCapture, error) {
	device := C.setupMultitouch()
	if uintptr(unsafe.Pointer(device)) == 0 {
		return nil, fmt.Errorf("failed to initialize multitouch device - is this a Mac with a trackpad?")
	}
	
	return &MultitouchCapture{
		device: device,
	}, nil
}

func (mc *MultitouchCapture) Stop() {
	if uintptr(unsafe.Pointer(mc.device)) != 0 {
		C.MTDeviceStop(mc.device)
		C.MTDeviceRelease(mc.device)
		mc.device = nil
	}
}

func (mc *MultitouchCapture) GetTouchChannel() <-chan TouchFrame {
	return touchChannel
}

type TouchProcessor struct {
	lastTouches map[int]Touch
}

func NewTouchProcessor() *TouchProcessor {
	return &TouchProcessor{
		lastTouches: make(map[int]Touch),
	}
}

func (tp *TouchProcessor) ProcessFrame(frame TouchFrame) {
	currentTouches := make(map[int]Touch)
	
	for _, touch := range frame.Touches {
		currentTouches[touch.Identifier] = touch
		
		if _, exists := tp.lastTouches[touch.Identifier]; !exists {
			if touch.State == TouchTouching {
				fmt.Printf("🔵 New touch: ID=%d at (%.3f, %.3f)\n",
					touch.Identifier, touch.X, touch.Y)
			}
		}
	}
	
	numTouches := len(frame.Touches)
	
	if numTouches == 2 {
		touches := frame.Touches
		if len(touches) == 2 {
			dx := touches[0].X - touches[1].X
			dy := touches[0].Y - touches[1].Y
			distance := math.Sqrt(dx*dx + dy*dy)
			
			_ = distance
		}
	}
	
	tp.lastTouches = currentTouches
}

func main() {
	fmt.Println("macOS Raw Multitouch Data Capture")
	fmt.Println("==================================")
	fmt.Println()
	fmt.Println("This captures raw multitouch data from your trackpad.")
	fmt.Println("Note: This does NOT block events from reaching the OS.")
	fmt.Println("Combine with CGEventTap example for full control.")
	fmt.Println()
	
	capture, err := NewMultitouchCapture()
	if err != nil {
		log.Fatalf("Error: %v", err)
	}
	defer capture.Stop()
	
	fmt.Println("✓ Multitouch capture initialized")
	fmt.Println("✓ Touch your trackpad to see raw data")
	fmt.Println("✓ Press Ctrl+C to exit")
	fmt.Println()
	
	processor := NewTouchProcessor()
	
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	
	go func() {
		frameCount := 0
		for touchFrame := range capture.GetTouchChannel() {
			frameCount++
			
			processor.ProcessFrame(touchFrame)
			
			if len(touchFrame.Touches) > 0 {
				fmt.Printf("\n[Frame %d] %.3fs - %d touch(es):\n",
					touchFrame.Frame, touchFrame.Timestamp, len(touchFrame.Touches))
				
				for i, touch := range touchFrame.Touches {
					fmt.Printf("  Touch %d [ID:%d]:\n", i+1, touch.Identifier)
					fmt.Printf("    State:    %s\n", touch.State)
					fmt.Printf("    Position: (%.3f, %.3f)\n", touch.X, touch.Y)
					fmt.Printf("    Velocity: (%.3f, %.3f)\n", touch.VelX, touch.VelY)
					fmt.Printf("    Size:     %.3f\n", touch.Size)
					fmt.Printf("    Pressure: %.3f\n", touch.Density)
					fmt.Printf("    Angle:    %.1f°\n", touch.Angle)
					fmt.Printf("    Ellipse:  %.3f x %.3f\n", touch.MajorAxis, touch.MinorAxis)
					fmt.Printf("    Absolute: (%.2fmm, %.2fmm)\n", touch.AbsX, touch.AbsY)
				}
			}
		}
	}()
	
	<-sigChan
	fmt.Println("\n\nShutting down...")
}
