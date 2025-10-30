import ctypes
import ctypes.util
import time

# Load framework
framework_path = ctypes.util.find_library('MultitouchSupport')
MTLib = ctypes.CDLL(framework_path)

# Define callback type - this is the key part
MTContactCallbackFunction = ctypes.CFUNCTYPE(
    ctypes.c_int,           # return type
    ctypes.c_void_p,        # device
    ctypes.c_void_p,        # data (MTTouch array)
    ctypes.c_int,           # num_fingers
    ctypes.c_double,        # timestamp
    ctypes.c_int            # frame
)

# Simplified touch structure
class MTPoint(ctypes.Structure):
    _fields_ = [
        ("x", ctypes.c_float),
        ("y", ctypes.c_float)
    ]

class MTTouch(ctypes.Structure):
    _fields_ = [
        ("frame", ctypes.c_int),
        ("timestamp", ctypes.c_double),
        ("identifier", ctypes.c_int),
        ("state", ctypes.c_int),
        ("foo1", ctypes.c_int),
        ("foo2", ctypes.c_int),
        ("normalized", MTPoint),  # Normalized position (0-1)
        ("size", ctypes.c_float),
        ("foo3", ctypes.c_int),
        ("angle", ctypes.c_float),
        ("major_axis", ctypes.c_float),
        ("minor_axis", ctypes.c_float),
        ("absolute", MTPoint),  # Absolute position
    ]

# Setup function signatures
MTLib.MTDeviceCreateList.restype = ctypes.c_void_p
MTLib.MTDeviceStart.argtypes = [ctypes.c_void_p, ctypes.c_int]
MTLib.MTDeviceStop.argtypes = [ctypes.c_void_p]
MTLib.MTRegisterContactFrameCallback.argtypes = [ctypes.c_void_p, MTContactCallbackFunction]

# Callback function
def touch_callback(device, data_ptr, num_fingers, timestamp, frame):
    if num_fingers > 0:
        touches = ctypes.cast(data_ptr, ctypes.POINTER(MTTouch))
        print(f"\nFrame {frame}, {num_fingers} finger(s):")
        for i in range(num_fingers):
            touch = touches[i]
            print(f"  ID={touch.identifier}: x={touch.normalized.x:.3f}, y={touch.normalized.y:.3f}, state={touch.state}")
    return 0

# Get device
device_list = MTLib.MTDeviceCreateList()
devices = ctypes.cast(device_list, ctypes.POINTER(ctypes.c_void_p))
device = devices[0]

print("Registering callback and starting device...")
callback = MTContactCallbackFunction(touch_callback)
MTLib.MTRegisterContactFrameCallback(device, callback)
MTLib.MTDeviceStart(device, 0)

print("Touch the trackpad with 1, 2, or 3 fingers!")
print("Press Ctrl+C to stop\n")

try:
    while True:
        time.sleep(0.1)
except KeyboardInterrupt:
    print("\nStopping...")
    MTLib.MTDeviceStop(device)
    print("Done")
