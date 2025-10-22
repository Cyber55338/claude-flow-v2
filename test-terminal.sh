#!/bin/bash

# Claude Flow Terminal Test Script
# Tests the /api/execute endpoint with various commands

echo "╔════════════════════════════════════════╗"
echo "║   Claude Flow Terminal Test Suite     ║"
echo "╚════════════════════════════════════════╝"
echo ""

SERVER="http://localhost:3000"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test command
test_command() {
    local name="$1"
    local command="$2"

    echo -ne "${YELLOW}Testing:${NC} $name ... "

    response=$(curl -s -X POST "$SERVER/api/execute" \
        -H "Content-Type: application/json" \
        -d "{\"command\": \"$command\", \"type\": \"shell\"}")

    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ PASSED${NC}"
        echo "Output: $(echo "$response" | jq -r '.output' | head -1)"
        echo ""
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "Response: $response"
        echo ""
        ((FAILED++))
        return 1
    fi
}

echo "1. Checking server health..."
health=$(curl -s "$SERVER/api/health")
if echo "$health" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓${NC} Server is healthy"
    echo "$health" | jq .
    echo ""
else
    echo -e "${RED}✗${NC} Server is not responding"
    echo "Make sure the server is running: cd ~/claude-flow && ./start.sh"
    exit 1
fi

echo "2. Testing shell commands..."
echo ""

test_command "pwd command" "pwd"
test_command "ls command" "ls"
test_command "whoami command" "whoami"
test_command "date command" "date"
test_command "echo command" "echo Hello from Claude Flow"
test_command "uname command" "uname -a"

echo "═══════════════════════════════════════"
echo "Test Results:"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo "═══════════════════════════════════════"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "The terminal is ready to use."
    echo "Open your browser to: $SERVER"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed${NC}"
    exit 1
fi
