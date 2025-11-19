package main

/*
#cgo CFLAGS: -x objective-c
#cgo LDFLAGS: -framework ApplicationServices -framework CoreFoundation -framework IOKit
#include <ApplicationServices/ApplicationServices.h>
#include <CoreFoundation/CoreFoundation.h>
#include <stdio.h>

extern void goEventCallback(int eventType, double x, double y, int buttons);

CGEventRef eventTapCallback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void *refcon) {
    CGPoint location = CGEventGetLocation(event);
    int64_t buttons = CGEventGetIntegerValueField(event, kCGMouseEventButtonNumber);
    
    goEventCallback((int)type, location.x, location.y, (int)buttons);
    
    if (*(int*)refcon) {
        return NULL;
    }
    return event;
}

CFMachPortRef createEventTap(int *blockEvents) {
    CGEventMask eventMask = CGEventMaskBit(kCGEventMouseMoved) |
                           CGEventMaskBit(kCGEventLeftMouseDown) |
                           CGEventMaskBit(kCGEventLeftMouseUp) |
                           CGEventMaskBit(kCGEventRightMouseDown) |
                           CGEventMaskBit(kCGEventRightMouseUp) |
                           CGEventMaskBit(kCGEventLeftMouseDragged) |
                           CGEventMaskBit(kCGEventRightMouseDragged) |
                           CGEventMaskBit(kCGEventScrollWheel) |
                           kCGEventMaskForAllEvents;
    
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

int checkAccessibility() {
    NSDictionary *options = @{(id)kAXTrustedCheckOptionPrompt: @YES};
    Boolean trusted = AXIsProcessTrustedWithOptions((CFDictionaryRef)options);
    return trusted ? 1 : 0;
}
*/
import "C"
import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"unsafe"
)

type TrackpadEvent struct {
	Type    EventType
	X       float64
	Y       float64
	Buttons int
}

type EventType int

const (
	EventMouseMoved EventType = iota
	EventLeftMouseDown
	EventLeftMouseUp
	EventRightMouseDown
	EventRightMouseUp
	EventLeftMouseDragged
	EventRightMouseDragged
	EventScrollWheel
	EventGesture
	EventOther
)

var (
	eventChannel chan TrackpadEvent
	eventMutex   sync.Mutex
	blockEvents  bool = true
)

func init() {
	eventChannel = make(chan TrackpadEvent, 100)
}

//export goEventCallback
func goEventCallback(eventType C.int, x C.double, y C.double, buttons C.int) {
	event := TrackpadEvent{
		Type:    mapEventType(int(eventType)),
		X:       float64(x),
		Y:       float64(y),
		Buttons: int(buttons),
	}
	
	select {
	case eventChannel <- event:
	default:
	}
}

func mapEventType(cType int) EventType {
	switch cType {
	case 5:
		return EventMouseMoved
	case 1:
		return EventLeftMouseDown
	case 2:
		return EventLeftMouseUp
	case 3:
		return EventRightMouseDown
	case 4:
		return EventRightMouseUp
	case 6:
		return EventLeftMouseDragged
	case 7:
		return EventRightMouseDragged
	case 22:
		return EventScrollWheel
	case 29:
		return EventGesture
	default:
		return EventOther
	}
}

func (e EventType) String() string {
	names := []string{
		"MouseMoved", "LeftMouseDown", "LeftMouseUp",
		"RightMouseDown", "RightMouseUp",
		"LeftMouseDragged", "RightMouseDragged",
		"ScrollWheel", "Gesture", "Other",
	}
	if int(e) < len(names) {
		return names[e]
	}
	return "Unknown"
}

type TrackpadCapture struct {
	eventTap     C.CFMachPortRef
	runLoopSrc   C.CFRunLoopSourceRef
	blockFlag    *C.int
	stopChannel  chan struct{}
}

func NewTrackpadCapture(blockEvents bool) (*TrackpadCapture, error) {
	if C.checkAccessibility() == 0 {
		return nil, fmt.Errorf("accessibility permissions not granted - please enable in System Preferences > Security & Privacy > Privacy > Accessibility")
	}
	
	tc := &TrackpadCapture{
		blockFlag:   (*C.int)(C.malloc(C.sizeof_int)),
		stopChannel: make(chan struct{}),
	}
	
	if blockEvents {
		*tc.blockFlag = 1
	} else {
		*tc.blockFlag = 0
	}
	
	tc.eventTap = C.createEventTap(tc.blockFlag)
	if uintptr(unsafe.Pointer(tc.eventTap)) == 0 {
		C.free(unsafe.Pointer(tc.blockFlag))
		return nil, fmt.Errorf("failed to create event tap - ensure accessibility permissions are granted and app is trusted")
	}
	
	tc.runLoopSrc = C.CFMachPortCreateRunLoopSource(
		C.kCFAllocatorDefault,
		tc.eventTap,
		0,
	)
	
	return tc, nil
}

func (tc *TrackpadCapture) Start() {
	C.CFRunLoopAddSource(
		C.CFRunLoopGetCurrent(),
		tc.runLoopSrc,
		C.kCFRunLoopCommonModes,
	)
	
	C.CGEventTapEnable(tc.eventTap, C.bool(true))
	
	go func() {
		C.CFRunLoopRun()
	}()
}

func (tc *TrackpadCapture) Stop() {
	C.CGEventTapEnable(tc.eventTap, C.bool(false))
	C.CFRunLoopStop(C.CFRunLoopGetCurrent())
	
	if uintptr(unsafe.Pointer(tc.runLoopSrc)) != 0 {
		C.CFRelease(C.CFTypeRef(tc.runLoopSrc))
	}
	if uintptr(unsafe.Pointer(tc.eventTap)) != 0 {
		C.CFRelease(C.CFTypeRef(tc.eventTap))
	}
	if tc.blockFlag != nil {
		C.free(unsafe.Pointer(tc.blockFlag))
	}
}

func (tc *TrackpadCapture) SetBlocking(block bool) {
	eventMutex.Lock()
	defer eventMutex.Unlock()
	
	if block {
		*tc.blockFlag = 1
	} else {
		*tc.blockFlag = 0
	}
}

func (tc *TrackpadCapture) GetEventChannel() <-chan TrackpadEvent {
	return eventChannel
}

func main() {
	fmt.Println("macOS Trackpad Capture Example")
	fmt.Println("===============================")
	fmt.Println()
	
	capture, err := NewTrackpadCapture(true)
	if err != nil {
		log.Fatalf("Error: %v", err)
	}
	defer capture.Stop()
	
	fmt.Println("✓ Trackpad capture initialized")
	fmt.Println("✓ Events will be blocked from reaching OS")
	fmt.Println("✓ Press Ctrl+C to exit")
	fmt.Println()
	
	capture.Start()
	
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
	
	go func() {
		eventCount := 0
		for event := range capture.GetEventChannel() {
			eventCount++
			
			if eventCount%10 == 0 {
				fmt.Printf("[%6d] %s at (%.1f, %.1f) buttons=%d\n",
					eventCount,
					event.Type,
					event.X,
					event.Y,
					event.Buttons)
			}
			
			if event.Type == EventRightMouseDown {
				fmt.Println("\n→ Right click detected - toggling event blocking")
			}
		}
	}()
	
	<-sigChan
	fmt.Println("\n\nShutting down...")
}

