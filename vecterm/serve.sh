#!/bin/bash
# Simple HTTP server for vecterm
# Usage: ./serve.sh [port]

PORT=${1:-8000}

echo "Starting vecterm server on http://localhost:$PORT"
echo "Press Ctrl+C to stop"
echo ""

# Try python3 first, then python, then node
if command -v python3 &> /dev/null; then
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer $PORT
elif command -v npx &> /dev/null; then
    npx http-server -p $PORT
else
    echo "Error: No HTTP server available"
    echo "Install one of: python3, python, or node.js"
    exit 1
fi
