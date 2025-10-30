import hid

# List devices
print("Available HID devices:")
for device in hid.enumerate():
    if 'trackpad' in device['product_string'].lower() or 'magic' in device['product_string'].lower():
        print(f"  {device['product_string']}")
        print(f"    VID: 0x{device['vendor_id']:04x}")
        print(f"    PID: 0x{device['product_id']:04x}")
        print()

# Open device (replace with your actual VID/PID)
trackpad = hid.Device(vid=0x05ac, pid=0x030e)  # Example for Magic Trackpad

# Read data
while True:
    report = trackpad.read(64, timeout=10)
    if report:
        print([f"{b:02x}" for b in report])
