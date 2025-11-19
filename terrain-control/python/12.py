from Quartz import CGEventTapCreate, kCGEventTapOptionDefault, \
    kCGSessionEventTap, kCGHeadInsertEventTap, \
    kCGEventMouseMoved, CGEventGetLocation, CGEventGetIntegerValueField, \
    kCGMouseEventSubtype, \
    CFMachPortCreateRunLoopSource, CFRunLoopGetCurrent, \
    CFRunLoopAddSource, kCFRunLoopDefaultMode, CFRunLoopRun

# Event subtypes
kCGEventMouseSubtypeDefault = 0
kCGEventMouseSubtypeTabletPoint = 1
kCGEventMouseSubtypeTabletProximity = 2

def event_callback(proxy, event_type, event, refcon):
    location = CGEventGetLocation(event)
    
    # Try to detect source device
    subtype = CGEventGetIntegerValueField(event, kCGMouseEventSubtype)
    
    print(f"Position: ({location.x:.0f}, {location.y:.0f}), Subtype: {subtype}")
    
    return event

print("Move trackpad and mouse separately - let's see if subtypes differ\n")

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
    try:
        CFRunLoopRun()
    except KeyboardInterrupt:
        print("\nStopped")
