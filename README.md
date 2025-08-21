# Electron Offline App Skeleton

This is a minimal Electron.js desktop application skeleton that works fully offline.

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
