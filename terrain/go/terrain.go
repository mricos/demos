package main

/*
#cgo LDFLAGS: -framework IOKit -framework CoreFoundation
#include <IOKit/IOKitLib.h>
#include <IOKit/hid/IOHIDManager.h>
#include <IOKit/hid/IOHIDDevice.h>
#include <CoreFoundation/CoreFoundation.h>
#include <stdio.h>

CFStringRef createCFString(const char *str) {
    return CFStringCreateWithCString(kCFAllocatorDefault, str, kCFStringEncodingUTF8);
}

void deviceMatchedCallback(void *context, IOReturn result, void *sender, IOHIDDeviceRef device) {
    CFStringRef productName = IOHIDDeviceGetProperty(device, CFSTR(kIOHIDProductKey));
    CFNumberRef usagePage = IOHIDDeviceGetProperty(device, CFSTR(kIOHIDPrimaryUsagePageKey));
    CFNumberRef usage = IOHIDDeviceGetProperty(device, CFSTR(kIOHIDPrimaryUsageKey));
    CFNumberRef maxInputSize = IOHIDDeviceGetProperty(device, CFSTR(kIOHIDMaxInputReportSizeKey));
    
    char name[256] = "Unknown";
    int up = 0, u = 0, maxSize = 0;
    
    if (productName) CFStringGetCString(productName, name, sizeof(name), kCFStringEncodingUTF8);
    if (usagePage) CFNumberGetValue(usagePage, kCFNumberIntType, &up);
    if (usage) CFNumberGetValue(usage, kCFNumberIntType, &u);
    if (maxInputSize) CFNumberGetValue(maxInputSize, kCFNumberIntType, &maxSize);
    
    printf("✓ Device: %s\n", name);
    printf("  Primary Usage: Page=%d, Usage=%d\n", up, u);
    printf("  Max input size: %d bytes\n", maxSize);
    
    // UsagePage 13 (Digitizer) is multitouch!
    if (up == 13) {
        printf("  >>> THIS IS THE MULTITOUCH INTERFACE! <<<\n");
    }
    printf("\n");
}

void inputCallback(void *context, IOReturn result, void *sender, IOHIDValueRef value) {
    IOHIDElementRef element = IOHIDValueGetElement(value);
    uint32_t usagePage = IOHIDElementGetUsagePage(element);
    uint32_t usage = IOHIDElementGetUsage(element);
    CFIndex intValue = IOHIDValueGetIntegerValue(value);
    
    printf("VALUE: Page=%d, Usage=%d, Value=%ld\n", usagePage, usage, (long)intValue);
}
*/
import "C"
import (
	"fmt"
	"runtime"
	"time"
	"unsafe"
)

func main() {
	runtime.LockOSThread()

	manager := C.IOHIDManagerCreate(C.kCFAllocatorDefault, C.kIOHIDOptionsTypeNone)
	if manager == 0 {
		fmt.Println("Failed to create HID manager")
		return
	}
	defer C.CFRelease(C.CFTypeRef(manager))

	// Match by VID only to see ALL interfaces
	vendorKey := C.createCFString(C.CString("VendorID"))
	defer C.CFRelease(C.CFTypeRef(vendorKey))

	vendorID := C.int(0x05ac)
	vendorNum := C.CFNumberCreate(C.kCFAllocatorDefault, C.kCFNumberIntType, unsafe.Pointer(&vendorID))
	defer C.CFRelease(C.CFTypeRef(vendorNum))

	keys := []unsafe.Pointer{unsafe.Pointer(vendorKey)}
	values := []unsafe.Pointer{unsafe.Pointer(vendorNum)}

	matchDict := C.CFDictionaryCreate(
		C.kCFAllocatorDefault,
		&keys[0],
		&values[0],
		1,
		&C.kCFTypeDictionaryKeyCallBacks,
		&C.kCFTypeDictionaryValueCallBacks,
	)

	C.IOHIDManagerSetDeviceMatching(manager, C.CFDictionaryRef(matchDict))
	
	C.IOHIDManagerRegisterDeviceMatchingCallback(manager, C.IOHIDDeviceCallback(C.deviceMatchedCallback), nil)
	C.IOHIDManagerRegisterInputValueCallback(manager, C.IOHIDValueCallback(C.inputCallback), nil)
	
	fmt.Println("Scanning for ALL Apple devices to find multitouch interface...\n")
	result := C.IOHIDManagerOpen(manager, C.kIOHIDOptionsTypeNone)
	if result != C.kIOReturnSuccess {
		fmt.Printf("❌ Failed: error %d\n", result)
		return
	}

	C.IOHIDManagerScheduleWithRunLoop(
		manager,
		C.CFRunLoopGetCurrent(),
		C.kCFRunLoopDefaultMode,
	)

	fmt.Println("Touch the trackpad...\n")
	
	for i := 0; i < 100; i++ {
		C.CFRunLoopRunInMode(C.kCFRunLoopDefaultMode, 0.1, 1)
		time.Sleep(100 * time.Millisecond)
	}

	C.IOHIDManagerClose(manager, C.kIOHIDOptionsTypeNone)
	fmt.Println("\nLook for 'UsagePage 13 (Digitizer)' interface above")
}
