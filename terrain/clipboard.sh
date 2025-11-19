#!/bin/bash

# Universal Clipboard Sync Script
# Can run as server (Linux) or client (Mac/Linux)
# Usage:
#   Server mode:  ./clipboard.sh server [port]
#   Client mode:  ./clipboard.sh [server:port]
#   Shell mode:   ./clipboard.sh shell [port]
#   Stop server:  ./clipboard.sh stop

VERSION="1.0"
DEFAULT_PORT=8377
CLIP_FILE="/tmp/clipboard_$USER.txt"
PID_FILE="/tmp/clipboard_server_$USER.pid"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_help() {
    cat << EOF
Universal Clipboard Sync v$VERSION

USAGE:
    $(basename $0) server [port]              Start clipboard server (default port: $DEFAULT_PORT)
    $(basename $0) shell [port]               Start server + interactive shell with 'clip'
    $(basename $0) stop                       Stop the clipboard server
    $(basename $0) [host[:port]]              Fetch clipboard from server (client mode)
    $(basename $0) -h, --help                 Show this help

EXAMPLES:
    # Start server on default port
    ./clipboard.sh server
    
    # Start server on custom port
    ./clipboard.sh server 9000
    
    # Start server with interactive shell
    ./clipboard.sh shell
    
    # Fetch from server (client mode)
    ./clipboard.sh myserver.com
    ./clipboard.sh 192.168.1.100:9000
    ./clipboard.sh localhost
    
    # Stop server
    ./clipboard.sh stop

SERVER USAGE:
    After starting the server, use the 'clip' command:
    
    export PATH="/tmp:\$PATH"
    clip Hello World              # Copy text
    cat file.txt | clip           # Copy file
    ls -la | clip                 # Copy command output

CLIENT USAGE:
    Run the script with your server address to fetch clipboard
    content. On Mac, it will automatically copy to pbcopy.
    On Linux, it will display the content.

EOF
}

# Check if running on Mac
is_mac() {
    [[ "$OSTYPE" == "darwin"* ]]
}

# Create the clip command
create_clip_command() {
    cat > /tmp/clip_$USER.sh << 'EOF'
#!/bin/bash
if [ -t 0 ]; then
    echo "$@" > /tmp/clipboard_$USER.txt
else
    cat > /tmp/clipboard_$USER.txt
fi
echo "✓ Copied to clipboard ($(wc -c < /tmp/clipboard_$USER.txt) bytes)"
EOF
    chmod +x /tmp/clip_$USER.sh
}

# Start server
start_server() {
    local PORT=${1:-$DEFAULT_PORT}
    
    # Check if already running
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        echo -e "${YELLOW}Clipboard server already running (PID: $(cat $PID_FILE))${NC}"
        return 1
    fi
    
    # Check for netcat
    if ! command -v nc &> /dev/null; then
        echo -e "${RED}Error: 'nc' (netcat) command not found${NC}"
        echo "Install it with: sudo apt-get install netcat"
        exit 1
    fi
    
    # Create clip command
    create_clip_command
    
    # Start HTTP server in background
    (
        while true; do
            echo -e "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nAccess-Control-Allow-Origin: *\r\n\r\n$(cat $CLIP_FILE 2>/dev/null)" | nc -l -p $PORT -q 1 > /dev/null 2>&1
        done
    ) &
    
    echo $! > "$PID_FILE"
    echo -e "${GREEN}✓ Clipboard server started on port $PORT (PID: $!)${NC}"
    echo ""
    echo "To use the 'clip' command, run:"
    echo -e "  ${BLUE}export PATH=\"/tmp:\$PATH\"${NC}"
    echo ""
    echo "Or use the full path:"
    echo -e "  ${BLUE}/tmp/clip_$USER.sh your text here${NC}"
    echo ""
    echo "Examples:"
    echo "  clip Hello World"
    echo "  cat file.txt | clip"
    echo "  ls -la | clip"
    echo ""
    echo "To stop the server:"
    echo -e "  ${BLUE}$(basename $0) stop${NC}"
}

# Stop server
stop_server() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 $PID 2>/dev/null; then
            kill $PID
            rm "$PID_FILE"
            echo -e "${GREEN}✓ Clipboard server stopped${NC}"
        else
            rm "$PID_FILE"
            echo -e "${YELLOW}Server was not running${NC}"
        fi
    else
        echo -e "${YELLOW}No server PID file found${NC}"
    fi
}

# Interactive shell mode
shell_mode() {
    local PORT=${1:-$DEFAULT_PORT}
    
    # Start server if not running
    if [ ! -f "$PID_FILE" ] || ! kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        start_server $PORT
        echo ""
    fi
    
    echo -e "${BLUE}Starting interactive shell with 'clip' command available...${NC}"
    echo "Type 'exit' to return to your normal shell"
    echo ""
    
    # Create a temporary bashrc that sets up the clip command
    TEMP_RC="/tmp/clipboard_bashrc_$USER.sh"
    cat > "$TEMP_RC" << 'RCEOF'
# Clipboard shell setup
export PATH="/tmp:$PATH"
alias clip="/tmp/clip_$USER.sh"
echo -e "\033[0;32m✓ 'clip' command is ready to use!\033[0m"
echo ""
RCEOF
    
    PS1="(clipboard) \u@\h:\w\$ " bash --rcfile "$TEMP_RC"
    rm -f "$TEMP_RC"
    
    echo ""
    echo -e "${YELLOW}Exited clipboard shell${NC}"
    read -p "Stop the clipboard server? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        stop_server
    fi
}

# Client mode - fetch clipboard from server
client_mode() {
    local SERVER_ADDR=$1
    local SERVER=""
    local PORT=$DEFAULT_PORT
    
    # Parse server:port format
    if [[ $SERVER_ADDR == *":"* ]]; then
        SERVER="${SERVER_ADDR%:*}"
        PORT="${SERVER_ADDR#*:}"
    else
        SERVER="$SERVER_ADDR"
    fi
    
    echo "Fetching clipboard from $SERVER:$PORT..."
    
    # Fetch clipboard content
    RESPONSE=$(curl -s --connect-timeout 5 "http://$SERVER:$PORT" 2>&1)
    CURL_EXIT=$?
    
    if [ $CURL_EXIT -ne 0 ]; then
        echo -e "${RED}Error: Could not connect to server${NC}"
        echo "Make sure:"
        echo "  1. The server is running: $(basename $0) server"
        echo "  2. Port $PORT is accessible"
        echo "  3. Server address '$SERVER' is correct"
        exit 1
    fi
    
    if [ -z "$RESPONSE" ]; then
        echo -e "${YELLOW}Warning: Clipboard is empty on server${NC}"
        exit 0
    fi
    
    # Copy to clipboard or display
    if is_mac && command -v pbcopy &> /dev/null; then
        echo "$RESPONSE" | pbcopy
        BYTES=$(echo -n "$RESPONSE" | wc -c | tr -d ' ')
        LINES=$(echo "$RESPONSE" | wc -l | tr -d ' ')
        echo -e "${GREEN}✓ Copied $BYTES bytes ($LINES lines) to Mac clipboard${NC}"
    elif command -v xclip &> /dev/null; then
        echo "$RESPONSE" | xclip -selection clipboard
        BYTES=$(echo -n "$RESPONSE" | wc -c | tr -d ' ')
        echo -e "${GREEN}✓ Copied $BYTES bytes to clipboard (xclip)${NC}"
    else
        # No clipboard command available, just display
        echo -e "${BLUE}Clipboard content:${NC}"
        echo "----------------------------------------"
        echo "$RESPONSE"
        echo "----------------------------------------"
        if is_mac; then
            echo -e "${YELLOW}Note: pbcopy not found${NC}"
        else
            echo -e "${YELLOW}Note: Install xclip for automatic clipboard copy${NC}"
        fi
    fi
}

# Main script logic
case "$1" in
    server)
        start_server $2
        ;;
    shell)
        shell_mode $2
        ;;
    stop)
        stop_server
        ;;
    -h|--help|help)
        print_help
        ;;
    "")
        echo -e "${RED}Error: No command specified${NC}"
        echo ""
        print_help
        exit 1
        ;;
    *)
        # Client mode - fetching from server
        client_mode "$1"
        ;;
esac
