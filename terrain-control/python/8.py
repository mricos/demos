import ctypes
import ctypes.util

framework_path = ctypes.util.find_library('MultitouchSupport')
MTLib = ctypes.CDLL(framework_path)

# Define more functions to get device info
MTLib.MTDeviceCreateList.restype = ctypes.c_void_p
MTLib.MTDeviceGetDeviceID.argtypes = [ctypes.c_void_p]
MTLib.MTDeviceGetDeviceID.restype = ctypes.c_uint64
MTLib.MTDeviceIsBuiltIn.argtypes = [ctypes.c_void_p]
MTLib.MTDeviceIsBuiltIn.restype = ctypes.c_bool

# Get all devices
device_list = MTLib.MTDeviceCreateList()
devices = ctypes.cast(device_list, ctypes.POINTER(ctypes.c_void_p))

print("Multitouch devices found:")
for i in range(10):  # Check first 10 slots
    device = devices[i]
    if not device:
        break
    
    device_id = MTLib.MTDeviceGetDeviceID(device)
    is_builtin = MTLib.MTDeviceIsBuiltIn(device)
    
    print(f"Device {i}: ID={device_id}, Built-in={is_builtin}")

print("\nWhich device number is your external Magic Trackpad?")
