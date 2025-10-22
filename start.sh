#!/bin/bash
#
# Claude Flow Starter Script
# Easy launcher for the WebSocket server
#

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print banner
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════╗"
echo "║                                       ║"
echo "║         Claude Flow Server            ║"
echo "║     WebSocket-Powered Visualization   ║"
echo "║                                       ║"
echo "╚═══════════════════════════════════════╝"
echo -e "${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js first:"
    echo "  pkg install nodejs"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v)
echo -e "${GREEN}Node.js version: ${NODE_VERSION}${NC}"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}Dependencies installed!${NC}"
else
    echo -e "${GREEN}Dependencies already installed${NC}"
fi

# Check for data directory
if [ ! -d "data" ]; then
    echo -e "${YELLOW}Creating data directory...${NC}"
    mkdir -p data
fi

# Port configuration
PORT=${PORT:-3000}

echo ""
echo -e "${BLUE}Starting Claude Flow Server...${NC}"
echo -e "${GREEN}Port: ${PORT}${NC}"
echo -e "${GREEN}URL: http://localhost:${PORT}${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Start the server
node server.js
