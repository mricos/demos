import hid

# Open the Magic Trackpad
print("Attempting to open Magic Trackpad...")
try:
    trackpad = hid.Device(vid=0x05ac, pid=0x030e)
    print("Successfully opened!")
    print(f"Manufacturer: {trackpad.manufacturer}")
    print(f"Product: {trackpad.product}")
    
    # Try to read data
    print("\nReading data (move your finger on the trackpad)...")
    print("Press Ctrl+C to stop\n")
    
    while True:
        report = trackpad.read(64, timeout=100)
        if report:
            # Print as hex for now to see the raw data
            hex_str = ' '.join([f'{b:02x}' for b in report])
            print(hex_str)
            
except OSError as e:
    print(f"Error opening device: {e}")
    print("\nYou may need to grant permissions:")
    print("System Settings > Privacy & Security > Input Monitoring")
    print("Add Terminal (or your Python app)")
except KeyboardInterrupt:
    print("\nStopped")
