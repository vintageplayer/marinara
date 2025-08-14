#!/bin/bash

# Quick packaging script for Chrome Web Store
# Creates a zip file from the dist directory

set -e

# Colors for output
GREEN='\033[0;32m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
ZIP_NAME="marinara-v${VERSION}.zip"

# Handle existing zip file
if [ -f "$ZIP_NAME" ]; then
    print_status "Existing package found: $ZIP_NAME"
    print_status "Removing old package..."
    rm "$ZIP_NAME"
fi

print_status "Creating package: $ZIP_NAME"

# Clean and build
npm run clean
npm run build

# Create zip file
cd dist
zip -r "../$ZIP_NAME" ./*
cd ..

# Display file size
FILE_SIZE=$(ls -lh "$ZIP_NAME" | awk '{print $5}')
print_status "Package created: $ZIP_NAME ($FILE_SIZE)"

print_status "✅ Package ready for Chrome Web Store upload!"