import ctypes
import ctypes.util
import time

# Try to use dlopen to load from shared cache
libSystem = ctypes.CDLL('/usr/lib/libSystem.dylib')
dlopen = libSystem.dlopen
dlopen.argtypes = [ctypes.c_char_p, ctypes.c_int]
dlopen.restype = ctypes.c_void_p

RTLD_NOW = 2
RTLD_GLOBAL = 8

# Try loading from shared cache
framework_path = b'/System/Library/PrivateFrameworks/MultitouchSupport.framework/MultitouchSupport'
handle = dlopen(framework_path, RTLD_NOW | RTLD_GLOBAL)

if not handle:
    print("❌ Could not load MultitouchSupport")
    print("Checking if it's available via shared cache...")
    
    # Try alternative loading method
    try:
        MTLib = ctypes.CDLL(None)  # Load from main process
        # Try to access a known function
        MTLib.MTDeviceCreateList
        print("✓ Loaded via process symbols")
    except:
        print("❌ Framework not accessible")
        exit(1)
else:
    MTLib = ctypes.CDLL(None)  # Now it's loaded in process space
    print("✓ Loaded MultitouchSupport from shared cache")

# Define structures
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
        ("normalized", MTPoint),
        ("size", ctypes.c_float),
        ("foo3", ctypes.c_int),
        ("angle", ctypes.c_float),
        ("major_axis", ctypes.c_float),
        ("minor_axis", ctypes.c_float),
        ("absolute", MTPoint),
    ]

MTContactCallbackFunction = ctypes.CFUNCTYPE(
    ctypes.c_int,
    ctypes.c_void_p,
    ctypes.c_void_p,
    ctypes.c_int,
    ctypes.c_double,
    ctypes.c_int
)

# Setup functions
MTLib.MTDeviceCreateList.restype = ctypes.c_void_p
MTLib.MTDeviceStart.argtypes = [ctypes.c_void_p, ctypes.c_int]
MTLib.MTDeviceStop.argtypes = [ctypes.c_void_p]
MTLib.MTRegisterContactFrameCallback.argtypes = [ctypes.c_void_p, MTContactCallbackFunction]
MTLib.MTDeviceIsBuiltIn.argtypes = [ctypes.c_void_p]
MTLib.MTDeviceIsBuiltIn.restype = ctypes.c_bool

def touch_callback(device, data_ptr, num_fingers, timestamp, frame):
    if num_fingers > 0:
        touches = ctypes.cast(data_ptr, ctypes.POINTER(MTTouch))
        print(f"\n{num_fingers} finger(s):")
        for i in range(min(num_fingers, 3)):
            touch = touches[i]
            print(f"  [{touch.identifier}] x={touch.normalized.x:.3f}, y={touch.normalized.y:.3f}")
    return 0

# Get devices
device_list = MTLib.MTDeviceCreateList()
devices = ctypes.cast(device_list, ctypes.POINTER(ctypes.c_void_p))

device = None
for i in range(10):
    dev = devices[i]
    if not dev:
        break
    if MTLib.MTDeviceIsBuiltIn(dev):
        device = dev
        print("✓ Found built-in trackpad\n")
        break

if not device:
    print("❌ No trackpad found")
    exit(1)

callback = MTContactCallbackFunction(touch_callback)
MTLib.MTRegisterContactFrameCallback(device, callback)
MTLib.MTDeviceStart(device, 0)

print("Touch trackpad with 1-3 fingers (Ctrl+C to stop)\n")

try:
    while True:
        time.sleep(0.1)
except KeyboardInterrupt:
    MTLib.MTDeviceStop(device)
    print("\nDone")
