#!/bin/bash

# Chrome Web Store Deployment Script for Marinara Extension
# This script automates the build and deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
print_status "Deploying Marinara Extension v${VERSION}"

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    print_error "Not in a git repository. Please initialize git or run from the correct directory."
    exit 1
fi

# Check for uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    print_warning "You have uncommitted changes. Consider committing them before deployment."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Deployment cancelled."
        exit 1
    fi
fi

# Clean previous build
print_status "Cleaning previous build..."
npm run clean

# Install dependencies
print_status "Installing dependencies..."
npm install

# Run tests (skip if no test files exist)
if [ -d "src/__tests__" ] || [ -n "$(find src -name "*.test.*" -o -name "*.spec.*" 2>/dev/null)" ]; then
    print_status "Running tests..."
    npm test
else
    print_warning "No test files found, skipping tests"
fi

# Build the extension
print_status "Building extension..."
npm run build

# Check if dist directory exists
if [ ! -d "dist" ]; then
    print_error "Build failed - dist directory not found"
    exit 1
fi

# Create deployment directory
DEPLOY_DIR="deploy"
DEPLOY_ZIP="marinara-v${VERSION}.zip"

# Handle existing zip file
if [ -f "$DEPLOY_ZIP" ]; then
    print_status "Existing deployment package found: $DEPLOY_ZIP"
    print_status "Removing old package..."
    rm "$DEPLOY_ZIP"
fi

print_status "Creating deployment package..."
rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy dist contents to deploy directory
cp -r dist/* $DEPLOY_DIR/

# Remove any .DS_Store files
find $DEPLOY_DIR -name ".DS_Store" -delete

# Create zip file
cd $DEPLOY_DIR
zip -r "../$DEPLOY_ZIP" ./*
cd ..

# Clean up temporary deploy directory
print_status "Cleaning up temporary files..."
rm -rf $DEPLOY_DIR

print_status "Deployment package created: $DEPLOY_ZIP"

# Display file size
FILE_SIZE=$(ls -lh "$DEPLOY_ZIP" | awk '{print $5}')
print_status "Package size: $FILE_SIZE"

# Verify zip contents
print_status "Verifying package contents..."
unzip -l "$DEPLOY_ZIP" | grep -E "(manifest.json|js/background.js|options.html)"

echo
print_status "✅ Deployment package ready!"
echo
print_status "Next steps:"
echo "1. Go to Chrome Web Store Developer Dashboard"
echo "2. Select your extension"
echo "3. Upload the new package: $DEPLOY_ZIP"
echo "4. Update version notes if needed"
echo "5. Submit for review"
echo
print_status "Chrome Web Store Developer Dashboard:"
print_status "https://chrome.google.com/webstore/devconsole"

# Optional: Open Chrome Web Store Developer Dashboard
read -p "Open Chrome Web Store Developer Dashboard? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v open >/dev/null 2>&1; then
        open "https://chrome.google.com/webstore/devconsole"
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "https://chrome.google.com/webstore/devconsole"
    else
        print_status "Please manually open: https://chrome.google.com/webstore/devconsole"
    fi
fi

print_status "Deployment script completed successfully! 🚀"