# SI## Features
- Receipt generation and printing
- Pooja management system
- Backup functionality
- SQLite database for offline storage
- Auto-update capability
- Works completely offline
- Secure and reliable data management

## Download and Installation

### For Users
1. Go to the [Releases page](https://github.com/Deepu325/Temple-receipt-system-SIMS/releases)
2. Download the latest version's installer (`SIMS TRS Setup x.x.x.exe`)
3. Run the installer
4. Choose your installation directory when prompted
5. Launch SIMS TRS from:
   - Desktop shortcut
   - Start Menu
   - Installation directory

The application will automatically check for and notify you about updates.

### System Requirements
- Windows 10 or later
- At least 512MB RAM
- 200MB free disk space

## For Developers
1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm start` to launch the development version

### Build Commands
- `npm start` — Launch in development mode
- `npm run build` — Create development build
- `npm run dist` — Create distribution package

## Security Features
- Context Isolation enabled
- Node Integration disabled
- Secure IPC communication
- Local SQLite database
- Automatic updates via GitHub releases

## Support
If you encounter any issues, please:
1. Check the [Issues page](https://github.com/Deepu325/Temple-receipt-system-SIMS/issues)
2. Create a new issue if your problem isn't already reported

## Updates
The application automatically checks for updates on startup. When an update is available:
1. You'll receive a notification
2. Choose to download and install
3. The app will restart automatically to apply the updateeipt System)

A comprehensive desktop application for managing temple receipts and poojas.

## Features
- Uses Electron’s latest stable version
- Secure: `contextIsolation: true`, `nodeIntegration: false`
- Loads `src/index.html` as the startup page
- Includes `main.js` (main process) and `preload.js` (safe IPC exposure)
- Folder structure: `/src`, `/db`, `/assets`, `/css`, `/js`
- No network dependencies; all assets are local

## Scripts
- `npm start` — Launch the Electron app
- `npm run build` — (No build step required for this skeleton)

## Getting Started
1. Run `npm install` to install Electron locally.
2. Run `npm start` to launch the app.

---
Replace placeholder files and folders as needed for your project.
