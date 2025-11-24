import ctypes
import ctypes.util
import os

# Check if framework exists
framework_path = '/System/Library/PrivateFrameworks/MultitouchSupport.framework/MultitouchSupport'
print(f"Framework exists: {os.path.exists(framework_path)}")

if not os.path.exists(framework_path):
    # Try alternative path
    framework_path = ctypes.util.find_library('MultitouchSupport')
    print(f"Alternative path: {framework_path}")

try:
    MTLib = ctypes.CDLL(framework_path)
    print("Successfully loaded MultitouchSupport")
    
    # Try to get device list
    MTLib.MTDeviceCreateList.restype = ctypes.c_void_p
    device_list = MTLib.MTDeviceCreateList()
    print(f"Device list pointer: {device_list}")
    
    if device_list:
        # Cast to array and check first device
        devices = ctypes.cast(device_list, ctypes.POINTER(ctypes.c_void_p))
        print(f"First device pointer: {devices[0]}")
        
        if devices[0]:
            print("Found at least one multitouch device")
        else:
            print("No multitouch devices found")
    else:
        print("MTDeviceCreateList returned NULL")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
