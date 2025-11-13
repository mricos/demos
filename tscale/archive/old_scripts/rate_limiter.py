#!/usr/bin/env python3
# rate_limiter.py - replay timestamped data at real-time or scaled speed
# Usage: cat data.txt | python rate_limiter.py [speed_multiplier]
#   speed=1.0 (default) = real-time
#   speed=10.0 = 10x faster
#   speed=0.5 = half speed (slow motion)

import sys
import time

speed = float(sys.argv[1]) if len(sys.argv) > 1 else 1.0
start_wall = None
start_data = None

for line in sys.stdin:
    # Pass through headers and comments immediately
    if line.startswith('#') or line.startswith('t'):
        print(line, end='', flush=True)
        continue

    # Extract timestamp from first column
    try:
        t = float(line.split()[0])
    except (ValueError, IndexError):
        # Invalid line, skip it
        continue

    # Initialize timing on first data sample
    if start_wall is None:
        start_wall = time.time()
        start_data = t

    # Calculate when this sample should be output
    data_elapsed = t - start_data
    target_wall = start_wall + (data_elapsed / speed)

    # Sleep if we're ahead of schedule
    now = time.time()
    if now < target_wall:
        time.sleep(target_wall - now)

    # Output the line
    print(line, end='', flush=True)
