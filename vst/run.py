#!/usr/bin/env python3
"""
Vargraph Server Launcher
"""

import os
from vargraph.server import run_server

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print("=" * 60)
    print("  Vargraph Server")
    print(f"  http://localhost:{port}/vst-demo")
    print(f"  http://localhost:{port}/vst-demo/graph")
    print("=" * 60)
    run_server(host='0.0.0.0', port=port, debug=True)
