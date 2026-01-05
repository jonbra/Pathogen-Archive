#!/bin/bash
# Start the Microreact viewer on port 3000
# This script should be run from the project root

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
VIEWER_DIR="$PROJECT_ROOT/viewer"

if [ ! -d "$VIEWER_DIR" ]; then
    echo "Error: Microreact viewer not found at $VIEWER_DIR"
    echo "Run: git submodule update --init --recursive"
    exit 1
fi

cd "$VIEWER_DIR"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing Microreact viewer dependencies..."
    npm install
fi

echo "Starting Microreact viewer on http://localhost:3000"
npm run dev
