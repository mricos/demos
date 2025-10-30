import hid

print("All HID devices with full info:")
for device in hid.enumerate():
    print(f"Product: {device['product_string']}")
    print(f"  Manufacturer: {device['manufacturer_string']}")
    print(f"  VID: 0x{device['vendor_id']:04x}")
    print(f"  PID: 0x{device['product_id']:04x}")
    print(f"  Serial: {device['serial_number']}")
    print(f"  Path: {device['path']}")
    print()
