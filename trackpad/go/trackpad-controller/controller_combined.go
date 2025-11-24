package main

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework ApplicationServices -framework CoreFoundation -F/System/Library/PrivateFrameworks -framework MultitouchSupport

#include <ApplicationServices/ApplicationServices.h>
#include <CoreFoundation/CoreFoundation.h>

extern void goEventCallback(int eventType, double x, double y);

static CGEventRef eventTapCallback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void *refcon) {
    // If blocking is enabled, block ALL events (including single-finger trackpad movement)
    if (refcon && *(int*)refcon) {
        return NULL;  // Block everything
    }
    return event;
}

static CFMachPortRef createEventTap(int *blockEvents) {
    // Capture ALL events to ensure we block cursor movement
    CGEventMask eventMask = kCGEventMaskForAllEvents;
    
    CFMachPortRef eventTap = CGEventTapCreate(
        kCGHIDEventTap,
        kCGHeadInsertEventTap,
        kCGEventTapOptionDefault,
        eventMask,
        eventTapCallback,
        blockEvents
    );

    return eventTap;
}

typedef struct {
    float x, y;
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
typedef int (*MTContactCallbackFunction)(int, MTTouch*, int, double, int);

extern CFArrayRef MTDeviceCreateList();
extern MTDeviceRef MTDeviceCreateDefault();
extern void MTRegisterContactFrameCallback(MTDeviceRef, MTContactCallbackFunction);
extern void MTDeviceStart(MTDeviceRef, int);
extern void MTDeviceStop(MTDeviceRef);

extern int goMultitouchCallback(int device, MTTouch* touches, int numTouches, double timestamp, int frame);

static int multitouchBridge(int device, MTTouch* touches, int numTouches, double timestamp, int frame) {
    return goMultitouchCallback(device, touches, numTouches, timestamp, frame);
}

static MTDeviceRef setupMultitouch() {
    MTDeviceRef device = MTDeviceCreateDefault();
    if (device) {
        MTRegisterContactFrameCallback(device, multitouchBridge);
        MTDeviceStart(device, 0);
    }
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
	"time"
	"unsafe"
)

type Touch struct {
	ID        int
	X, Y      float64
	VelX, VelY float64
	Size      float64
	Angle     float64
}

type ControllerState struct {
	ActiveTouches map[int]Touch
	CenterX       float64
	CenterY       float64
	Radius        float64
}

var (
	controller  *TrackpadController
	eventTap    C.CFMachPortRef
	mtDevice    C.MTDeviceRef
	runLoopSrc  C.CFRunLoopSourceRef
	blockFlag   *C.int
)

type TrackpadController struct {
	state      *ControllerState
	blocking   bool
	lastUpdate time.Time
}

func NewTrackpadController() *TrackpadController {
	return &TrackpadController{
		state: &ControllerState{
			ActiveTouches: make(map[int]Touch),
			CenterX:       0.5,
			CenterY:       0.5,
			Radius:        0.2,
		},
		blocking:   false,
		lastUpdate: time.Now(),
	}
}

func (tc *TrackpadController) ProcessTouch(touch Touch) {
	tc.state.ActiveTouches[touch.ID] = touch
	
	dx := touch.X - tc.state.CenterX
	dy := touch.Y - tc.state.CenterY
	distance := math.Sqrt(dx*dx + dy*dy)
	
	if distance > tc.state.Radius {
		dx = dx / distance * tc.state.Radius
		dy = dy / distance * tc.state.Radius
	}
	
	joystickX := dx / tc.state.Radius
	joystickY := dy / tc.state.Radius
	
	fmt.Printf("Controller: Touch ID=%d → Joystick (%.2f, %.2f) Size=%.2f\n",
		touch.ID, joystickX, joystickY, touch.Size)
}

func (tc *TrackpadController) RemoveTouch(id int) {
	delete(tc.state.ActiveTouches, id)
}

func (tc *TrackpadController) SetBlocking(block bool) {
	tc.blocking = block
	if blockFlag != nil {
		if block {
			*blockFlag = 1
		} else {
			*blockFlag = 0
		}
	}
	fmt.Printf("Event blocking: %v\n", block)
}

func (tc *TrackpadController) GetGestureType() string {
	numTouches := len(tc.state.ActiveTouches)
	
	switch numTouches {
	case 0:
		return "none"
	case 1:
		return "single_touch"
	case 2:
		return "two_finger"
	case 3:
		return "three_finger"
	default:
		return fmt.Sprintf("%d_finger", numTouches)
	}
}

//export goEventCallback
func goEventCallback(eventType C.int, x C.double, y C.double) {
	// Events are blocked in the C callback
}

//export goMultitouchCallback
func goMultitouchCallback(device C.int, touches *C.MTTouch, numTouches C.int, timestamp C.double, frame C.int) C.int {
	if controller == nil {
		return 0
	}

	// Handle no touches - unblock events to allow normal mouse movement
	if numTouches == 0 {
		controller.SetBlocking(false)
		return 0
	}

	touchSlice := (*[100]C.MTTouch)(unsafe.Pointer(touches))[:numTouches:numTouches]

	currentTouches := make(map[int]bool)

	for i := 0; i < int(numTouches); i++ {
		mt := touchSlice[i]

		touch := Touch{
			ID:    int(mt.identifier),
			X:     float64(mt.normalized.position.x),
			Y:     float64(mt.normalized.position.y),
			VelX:  float64(mt.normalized.velocity.x),
			VelY:  float64(mt.normalized.velocity.y),
			Size:  float64(mt.size),
			Angle: float64(mt.angle) * 180.0 / math.Pi,
		}

		currentTouches[touch.ID] = true
		controller.ProcessTouch(touch)
	}

	for id := range controller.state.ActiveTouches {
		if !currentTouches[id] {
			controller.RemoveTouch(id)
		}
	}

	// Block events only when 2+ fingers are touching (multitouch)
	// Allow events with single finger so mouse moves normally
	if int(numTouches) >= 2 {
		controller.SetBlocking(true)
	} else {
		controller.SetBlocking(false)
	}

	return 0
}

func setupEventCapture() error {
	blockFlag = (*C.int)(C.malloc(C.sizeof_int))
	*blockFlag = 0 // Start with blocking disabled (allow single-touch movement)

	eventTap = C.createEventTap(blockFlag)
	if uintptr(unsafe.Pointer(eventTap)) == 0 {
		C.free(unsafe.Pointer(blockFlag))
		return fmt.Errorf("failed to create event tap - check accessibility permissions")
	}
	
	runLoopSrc = C.CFMachPortCreateRunLoopSource(
		C.kCFAllocatorDefault,
		eventTap,
		0,
	)
	
	C.CFRunLoopAddSource(
		C.CFRunLoopGetCurrent(),
		runLoopSrc,
		C.kCFRunLoopCommonModes,
	)
	
	C.CGEventTapEnable(eventTap, C.bool(true))
	
	mtDevice = C.setupMultitouch()
	if uintptr(unsafe.Pointer(mtDevice)) == 0 {
		return fmt.Errorf("failed to initialize multitouch")
	}
	
	return nil
}

func cleanup() {
	if uintptr(unsafe.Pointer(eventTap)) != 0 {
		C.CGEventTapEnable(eventTap, C.bool(false))
		C.CFRelease(C.CFTypeRef(eventTap))
	}
	if uintptr(unsafe.Pointer(runLoopSrc)) != 0 {
		C.CFRelease(C.CFTypeRef(runLoopSrc))
	}
	if uintptr(unsafe.Pointer(mtDevice)) != 0 {
		C.MTDeviceStop(mtDevice)
	}
	if blockFlag != nil {
		C.free(unsafe.Pointer(blockFlag))
	}
}

func printStatus(tc *TrackpadController) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()
	
	for range ticker.C {
		gesture := tc.GetGestureType()
		numTouches := len(tc.state.ActiveTouches)
		
		if numTouches > 0 {
			fmt.Printf("\r[Status] Gesture: %-15s | Active touches: %d | Blocking: %v",
				gesture, numTouches, tc.blocking)
		}
	}
}

func main() {
	fmt.Println("═══════════════════════════════════════════")
	fmt.Println("  Trackpad Controller - Combined Example")
	fmt.Println("═══════════════════════════════════════════")
	fmt.Println()
	fmt.Println("This captures raw touch data AND blocks OS events")
	fmt.Println("Use your trackpad as a controller for your software!")
	fmt.Println()
	
	controller = NewTrackpadController()
	
	if err := setupEventCapture(); err != nil {
		log.Fatalf("Setup failed: %v", err)
	}
	defer cleanup()
	
	controller.SetBlocking(false)

	fmt.Println("✓ Event capture initialized")
	fmt.Println("✓ Multitouch enabled")
	fmt.Println("✓ Single-touch moves cursor, multitouch halts movement")
	fmt.Println()
	fmt.Println("Try it:")
	fmt.Println("  • One finger = cursor moves normally")
	fmt.Println("  • Two+ fingers = cursor halts")
	fmt.Println("Press Ctrl+C to exit and restore normal operation")
	fmt.Println()
	
	go printStatus(controller)
	
	go func() {
		C.CFRunLoopRun()
	}()
	
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	<-sigChan
	
	fmt.Println("\n\nShutting down and restoring normal trackpad operation...")
	time.Sleep(500 * time.Millisecond)
}

