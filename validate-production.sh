#!/bin/bash

# Claude Flow V2 - Production Validation Script
# This script validates all production requirements are met

echo "======================================"
echo "Claude Flow V2 - Production Validation"
echo "======================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

# Function to check and report
check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $1"
        ((FAIL++))
    fi
}

# 1. Check Node.js version
echo "1. Checking Node.js..."
node --version > /dev/null 2>&1
check "Node.js installed"

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 14 ]; then
    echo -e "${GREEN}✓${NC} Node.js version >= 14 (found: v$NODE_VERSION)"
    ((PASS++))
else
    echo -e "${RED}✗${NC} Node.js version >= 14 required (found: v$NODE_VERSION)"
    ((FAIL++))
fi

# 2. Check required files
echo ""
echo "2. Checking production files..."

REQUIRED_FILES=(
    "index-production.html"
    "server.js"
    "package.json"
    "start.sh"
    "bridge.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file exists"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $file missing"
        ((FAIL++))
    fi
done

# 3. Check core modules
echo ""
echo "3. Checking core modules..."

CORE_MODULES=(
    "ui-utils.js"
    "parser-v2.js"
    "canvas-v2.js"
    "app-v2.js"
    "style-v2.css"
)

for module in "${CORE_MODULES[@]}"; do
    if [ -f "$module" ]; then
        echo -e "${GREEN}✓${NC} $module"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $module missing"
        ((FAIL++))
    fi
done

# 4. Check advanced features
echo ""
echo "4. Checking advanced feature modules..."

FEATURE_MODULES=(
    "performance.js"
    "virtual-canvas.js"
    "interactions.js"
    "export.js"
    "history.js"
    "minimap.js"
)

for module in "${FEATURE_MODULES[@]}"; do
    if [ -f "$module" ]; then
        echo -e "${GREEN}✓${NC} $module"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠${NC} $module missing (optional)"
    fi
done

# 5. Check documentation
echo ""
echo "5. Checking documentation..."

DOC_FILES=(
    "README.md"
    "DEPLOYMENT-GUIDE.md"
    "BMAD-V6-FINAL-SUMMARY.md"
)

for doc in "${DOC_FILES[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✓${NC} $doc"
        ((PASS++))
    else
        echo -e "${YELLOW}⚠${NC} $doc missing"
    fi
done

# 6. Check dependencies
echo ""
echo "6. Checking dependencies..."

if [ -f "package.json" ]; then
    if grep -q "express" package.json && grep -q "ws" package.json; then
        echo -e "${GREEN}✓${NC} Required dependencies declared (express, ws)"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} Missing required dependencies"
        ((FAIL++))
    fi
fi

if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules directory exists"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} node_modules not found - run 'npm install'"
fi

# 7. Check data directory
echo ""
echo "7. Checking data directory..."

if [ -d "data" ]; then
    echo -e "${GREEN}✓${NC} data/ directory exists"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} data/ directory missing - will be created on first run"
fi

if [ -f "data/flow.json" ]; then
    echo -e "${GREEN}✓${NC} Sample data (data/flow.json) exists"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} Sample data missing"
fi

# 8. Check permissions
echo ""
echo "8. Checking permissions..."

if [ -x "start.sh" ]; then
    echo -e "${GREEN}✓${NC} start.sh is executable"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} start.sh not executable - run 'chmod +x start.sh'"
    chmod +x start.sh 2>/dev/null && echo -e "${GREEN}✓${NC} Fixed: start.sh is now executable"
fi

# 9. Check port availability
echo ""
echo "9. Checking port availability..."

if ! lsof -i:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Port 3000 is available"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC} Port 3000 is in use - server may already be running"
fi

# 10. Syntax validation
echo ""
echo "10. Validating JavaScript syntax..."

JS_ERRORS=0
for jsfile in *.js; do
    if [ -f "$jsfile" ]; then
        node --check "$jsfile" 2>/dev/null
        if [ $? -ne 0 ]; then
            echo -e "${RED}✗${NC} Syntax error in $jsfile"
            ((JS_ERRORS++))
            ((FAIL++))
        fi
    fi
done

if [ $JS_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓${NC} All JavaScript files valid"
    ((PASS++))
fi

# Summary
echo ""
echo "======================================"
echo "Validation Summary"
echo "======================================"
echo -e "${GREEN}Passed:${NC} $PASS checks"
echo -e "${RED}Failed:${NC} $FAIL checks"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ Production validation PASSED${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. npm install          # Install dependencies"
    echo "  2. ./start.sh           # Start server"
    echo "  3. Open http://localhost:3000"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Production validation FAILED${NC}"
    echo ""
    echo "Please fix the issues above before deployment."
    echo ""
    exit 1
fi
