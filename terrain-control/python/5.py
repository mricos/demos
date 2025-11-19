import ctypes
import ctypes.util

# Load the private MultitouchSupport framework
framework_path = '/System/Library/PrivateFrameworks/MultitouchSupport.framework/MultitouchSupport'
try:
    MTLib = ctypes.CDLL(framework_path)
except OSError:
    print("Could not load MultitouchSupport framework")
    exit(1)

# Define callback type
TouchCallback = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.c_void_p, ctypes.c_void_p, 
                                  ctypes.c_int, ctypes.c_void_p, ctypes.c_int)

# Touch data structure (simplified)
class MTTouch(ctypes.Structure):
    _fields_ = [
        ("frame", ctypes.c_int),
        ("timestamp", ctypes.c_double),
        ("identifier", ctypes.c_int),
        ("state", ctypes.c_int),
        ("unknown1", ctypes.c_int),
        ("unknown2", ctypes.c_int),
        ("normalized_x", ctypes.c_float),  # 0.0 to 1.0
        ("normalized_y", ctypes.c_float),  # 0.0 to 1.0
        ("size", ctypes.c_float),
        # ... more fields we don't need
    ]

# Define functions
MTLib.MTDeviceCreateList.restype = ctypes.c_void_p
MTLib.MTDeviceStart.argtypes = [ctypes.c_void_p, ctypes.c_int]
MTLib.MTDeviceStop.argtypes = [ctypes.c_void_p]
MTLib.MTRegisterContactFrameCallback.argtypes = [ctypes.c_void_p, TouchCallback]

# Callback function
def touch_callback(device, touches_ptr, num_touches, timestamp, frame):
    touches = ctypes.cast(touches_ptr, ctypes.POINTER(MTTouch))
    print(f"\n{num_touches} touch(es):")
    for i in range(num_touches):
        touch = touches[i]
        print(f"  Touch {touch.identifier}: x={touch.normalized_x:.3f}, y={touch.normalized_y:.3f}, state={touch.state}")
    return 0

# Get devices
device_list = MTLib.MTDeviceCreateList()
devices_array = ctypes.cast(device_list, ctypes.POINTER(ctypes.c_void_p))

print("Starting multitouch tracking...")
print("Touch the trackpad with 1, 2, or 3 fingers")
print("Press Ctrl+C to stop\n")

# Register callback on first device
callback_func = TouchCallback(touch_callback)
MTLib.MTRegisterContactFrameCallback(devices_array[0], callback_func)
MTLib.MTDeviceStart(devices_array[0], 0)

try:
    import time
    while True:
        time.sleep(0.1)
except KeyboardInterrupt:
    print("\nStopping...")
    MTLib.MTDeviceStop(devices_array[0])
