# Packaging Fylr for Distribution

This document provides instructions for packaging the Fylr application for distribution.

## Prerequisites

- Node.js and npm
- Python 3.x
- macOS for .dmg creation (for Windows or Linux packages, see variations below)

## Building the Application

### For macOS (.dmg)

1. Install dependencies:
   ```
   npm install
   ```

2. Build the application:
   ```
   npm run build:dmg
   ```
   This will create a .dmg installer in the `dist` folder.

### For all platforms

```
npm run dist
```

This will build packages for the current platform.

## Configuration Files

- `package.json`: Contains build configuration
- `entitlements.mac.plist`: macOS security entitlements
- `postinstall.js`: Handles Python dependencies installation
- `create-icon.sh`: Script to generate macOS icons from PNG

## Signing for Distribution

For distribution on macOS App Store or notarized distribution:

1. Get an Apple Developer ID
2. Use the following command to build and sign:
   ```
   electron-builder --mac --sign="Developer ID Application: Your Name (TEAM_ID)"
   ```

## Troubleshooting

- **Missing dependencies**: Make sure all npm dependencies are installed
- **Python issues**: Ensure Python 3.x is in your PATH
- **Icon generation**: If icon generation fails, manually create the .icns file using macOS IconUtil

## After Installation

The postinstall script will automatically install Python dependencies when the application is first launched. 