from Quartz import CGEventTapCreate, kCGEventTapOptionDefault, \
    kCGSessionEventTap, kCGHeadInsertEventTap, \
    kCGEventMouseMoved, CGEventGetLocation, \
    CFMachPortCreateRunLoopSource, CFRunLoopGetCurrent, \
    CFRunLoopAddSource, kCFRunLoopDefaultMode, CFRunLoopRun
import time

# Track min/max to find trackpad bounds
min_x, min_y = float('inf'), float('inf')
max_x, max_y = float('-inf'), float('-inf')
calibration_mode = True
calibration_samples = 0
TARGET_SAMPLES = 100

def event_callback(proxy, event_type, event, refcon):
    global min_x, min_y, max_x, max_y, calibration_mode, calibration_samples
    
    location = CGEventGetLocation(event)
    x, y = location.x, location.y
    
    if calibration_mode:
        # Track bounds
        min_x = min(min_x, x)
        min_y = min(min_y, y)
        max_x = max(max_x, x)
        max_y = max(max_y, y)
        
        calibration_samples += 1
        
        if calibration_samples >= TARGET_SAMPLES:
            calibration_mode = False
            print(f"\n✓ Calibration complete!")
            print(f"Trackpad bounds: X[{min_x:.0f} - {max_x:.0f}], Y[{min_y:.0f} - {max_y:.0f}]")
            print(f"Size: {max_x - min_x:.0f} x {max_y - min_y:.0f}")
            print(f"\nNow showing normalized 0.0-1.0 positions:\n")
    else:
        # Normalize to 0.0-1.0 based on calibrated bounds
        x_norm = (x - min_x) / (max_x - min_x) if max_x > min_x else 0.5
        y_norm = (y - min_y) / (max_y - min_y) if max_y > min_y else 0.5
        
        # Clamp to 0-1
        x_norm = max(0.0, min(1.0, x_norm))
        y_norm = max(0.0, min(1.0, y_norm))
        
        print(f"Trackpad position: X={x_norm:.3f}, Y={y_norm:.3f}")
    
    return event

print("=== CALIBRATION MODE ===")
print("Move your finger all around the trackpad edges")
print("Touch all four corners to calibrate the bounds")
print(f"Collecting {TARGET_SAMPLES} samples...\n")

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
else:
    print("FAILED: Need Accessibility permission")
