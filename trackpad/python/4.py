import hid

# Find all Work-TP paths
print("Finding all Magic Trackpad endpoints:")
trackpad_paths = []
for device in hid.enumerate(vid=0x05ac, pid=0x030e):
    print(f"Path: {device['path']}")
    print(f"  Usage Page: {device.get('usage_page', 'N/A')}")
    print(f"  Usage: {device.get('usage', 'N/A')}")
    trackpad_paths.append(device['path'])
    print()

# Try each path
for i, path in enumerate(trackpad_paths):
    print(f"\n=== Trying path {i+1}/{len(trackpad_paths)} ===")
    try:
        trackpad = hid.Device(path=path)
        print(f"Opened successfully")
        print("Touch the trackpad now...")
        
        # Try reading for 3 seconds
        import time
        start = time.time()
        got_data = False
        
        while time.time() - start < 3:
            report = trackpad.read(64, timeout=100)
            if report:
                got_data = True
                hex_str = ' '.join([f'{b:02x}' for b in report])
                print(hex_str)
        
        if not got_data:
            print("No data received on this endpoint")
        else:
            print("SUCCESS! This is the right endpoint")
            break
            
        trackpad.close()
        
    except Exception as e:
        print(f"Error: {e}")

print("\nDone")
