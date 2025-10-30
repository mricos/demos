from Quartz import CGEventTapCreate, kCGEventTapOptionDefault, \
    kCGSessionEventTap, kCGHeadInsertEventTap, \
    kCGEventLeftMouseDown, kCGEventLeftMouseUp, \
    kCGEventMouseMoved, CGEventGetLocation, \
    CFMachPortCreateRunLoopSource, CFRunLoopGetCurrent, \
    CFRunLoopAddSource, kCFRunLoopDefaultMode, CFRunLoopRun

import time

last_update = 0
UPDATE_INTERVAL = 0.05  # Only print every 50ms to avoid spam

def event_callback(proxy, event_type, event, refcon):
    global last_update
    
    location = CGEventGetLocation(event)
    x_norm = location.x / 1920  # Adjust to your screen width
    y_norm = location.y / 1080  # Adjust to your screen height
    
    current_time = time.time()
    
    # Throttle output
    if current_time - last_update > UPDATE_INTERVAL:
        if event_type == kCGEventMouseMoved:
            print(f"Position: x={x_norm:.3f}, y={y_norm:.3f}")
        last_update = current_time
    
    return event

print("Starting trackpad position monitor...")
print("Move your finger on the external trackpad (don't click)\n")

# Monitor mouse movement events
event_mask = (1 << kCGEventMouseMoved)

tap = CGEventTapCreate(
    kCGSessionEventTap,
    kCGHeadInsertEventTap,
    kCGEventTapOptionDefault,
    event_mask,
    event_callback,
    None
)

if tap:
    run_loop_source = CFMachPortCreateRunLoopSource(None, tap, 0)
    CFRunLoopAddSource(CFRunLoopGetCurrent(), run_loop_source, kCFRunLoopDefaultMode)
    print("Listening... (Ctrl+C to stop)")
    try:
        CFRunLoopRun()
    except KeyboardInterrupt:
        print("\nStopped")
else:
    print("FAILED: Need Accessibility permission")
