#!/bin/bash
# Percy Visual Testing Script for PAVI
# Runs comprehensive desktop visual regression tests

set -e

echo "🎨 Starting Percy Visual Testing..."
echo ""

# Check for Percy token
if [ -z "$PERCY_TOKEN" ]; then
    echo "❌ Error: PERCY_TOKEN environment variable not set"
    echo ""
    echo "Set your Percy token:"
    echo "  export PERCY_TOKEN=your_token_here"
    echo ""
    echo "Get your token from: https://percy.io/settings"
    exit 1
fi

# Switch to Node 24
echo "📦 Setting up Node environment..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 24

# Check if Percy CLI is installed
if ! npm list @percy/cli >/dev/null 2>&1; then
    echo "📥 Installing Percy CLI..."
    npm install --save-dev @percy/cli
fi

echo ""
echo "🚀 Running Percy snapshot tests..."
echo "   - Testing 22 pages/states"
echo "   - 10 desktop widths (1024px - 2000px)"
echo "   - Expected: ~220+ screenshots"
echo ""

# Run Percy
npx percy snapshot percy-desktop-extensive.yml

echo ""
echo "✅ Percy test complete!"
echo ""
echo "View your results at:"
echo "   https://percy.io/9c6ee113/web/pavi-88961a86"
echo ""
