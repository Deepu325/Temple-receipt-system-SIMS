const { app, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

async function setupCloudConfig() {
    const userDataPath = app.getPath('userData');
    const keyPath = path.join(userDataPath, 'google-cloud-key.json');

    // Check if key already exists
    if (!fs.existsSync(keyPath)) {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'JSON Files', extensions: ['json'] }
            ],
            title: 'Select your Google Cloud service account key file'
        });

        if (!result.canceled && result.filePaths.length > 0) {
            // Copy the key file to app data directory
            fs.copyFileSync(result.filePaths[0], keyPath);
            return true;
        }
        return false;
    }
    return true;
}

module.exports = { setupCloudConfig };
