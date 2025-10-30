from Quartz import CGEventTapCreate, kCGEventTapOptionDefault, \
    kCGSessionEventTap, kCGHeadInsertEventTap, \
    kCGEventLeftMouseDown, kCGEventLeftMouseUp, kCGEventLeftMouseDragged, \
    kCGEventMouseMoved, CGEventGetLocation, CGEventGetIntegerValueField, \
    kCGMouseEventClickState, \
    CFMachPortCreateRunLoopSource, CFRunLoopGetCurrent, \
    CFRunLoopAddSource, kCFRunLoopDefaultMode, CFRunLoopRun

# Track active touches by their positions
active_touches = {}
next_id = 0

def event_callback(proxy, event_type, event, refcon):
    global next_id
    
    location = CGEventGetLocation(event)
    x_norm = location.x / 1920  # Adjust to your screen width
    y_norm = location.y / 1080  # Adjust to your screen height
    
    if event_type == kCGEventLeftMouseDown:
        # New touch
        touch_id = next_id
        next_id += 1
        active_touches[touch_id] = (x_norm, y_norm)
        print(f"Touch DOWN: ID={touch_id}, x={x_norm:.3f}, y={y_norm:.3f}")
        
    elif event_type == kCGEventLeftMouseDragged:
        # Moving touch (assume ID 0 for single touch)
        if 0 in active_touches:
            active_touches[0] = (x_norm, y_norm)
            print(f"Touch MOVE: ID=0, x={x_norm:.3f}, y={y_norm:.3f}")
        
    elif event_type == kCGEventLeftMouseUp:
        # Touch released
        if 0 in active_touches:
            del active_touches[0]
            print(f"Touch UP: ID=0")
    
    return event

print("Starting trackpad monitor...")
print("You need to grant Accessibility permission:")
print("System Settings > Privacy & Security > Accessibility > Enable Terminal")
print("\nTouch and drag on the trackpad...\n")

event_mask = (1 << kCGEventLeftMouseDown) | \
             (1 << kCGEventLeftMouseUp) | \
             (1 << kCGEventLeftMouseDragged)

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
    print("Listening for events...")
    try:
        CFRunLoopRun()
    except KeyboardInterrupt:
        print("\nStopped")
else:
    print("FAILED: Need Accessibility permission")
    print("Go to: System Settings > Privacy & Security > Accessibility")
    print("Add Terminal and enable it")
