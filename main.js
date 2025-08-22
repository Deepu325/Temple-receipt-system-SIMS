// --- HTML Receipt Print Logic ---
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const db = require('better-sqlite3')(path.join(__dirname, 'db/temple.db'));

// Configure auto-updater
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';
autoUpdater.autoDownload = false;

function embedFont(filename) {
  try {
    const fontPath = path.join(__dirname, 'assets', filename);
    const fontData = fs.readFileSync(fontPath);
    return `data:font/truetype;charset=utf-8;base64,${fontData.toString('base64')}`;
  } catch (e) {
    console.error(`Error loading font ${filename}:`, e);
    return '';
  }
}

function getTextLengthAttribute(text) {
  if (!text) return '';
  const length = text.length;
  if (length > 35) return ' data-length="long"';
  if (length > 25) return ' data-length="medium"';
  return '';
}

function printReceipt(receiptId) {
  // 1. Fetch receipt data
  const receipt = db.prepare('SELECT * FROM receipts WHERE id = ?').get(receiptId);
  if (!receipt) return;
  
  // Get base64 encoded fonts
  const regularFont = embedFont('NotoSansKannada-Regular.ttf');
  
  // 2. Load HTML template
  let html = fs.readFileSync(path.join(__dirname, 'assets/receipt-template.html'), 'utf8');
  // 3. Inject data and embed fonts
  html = html
    .replace(/@font-face\s*{[^}]*}/g, `@font-face {
      font-family: 'NotoSansKannada';
      src: url('${regularFont}') format('truetype');
      font-weight: normal;
      font-style: normal;
      font-display: block;
    }`)
    .replace('id="receiptNo"></span>', `id="receiptNo">${receipt.id}</span>`)
    .replace('id="date"></span>', `id="date">${receipt.date}</span>`)
    .replace('id="name"></span>', `id="name">${receipt.devotee_name}</span>`)
    .replace('id="address"></span>', `id="address">${receipt.address}</span>`)
    .replace('id="pooja1"></span>', `id="pooja1"${getTextLengthAttribute(receipt.pooja_name.split(',')[0])}>${receipt.pooja_name.split(',')[0] || ''}</span>`)
    .replace(/style="display: none;"/, receipt.pooja_name.includes(',') ? '' : 'style="display: none;"')
    .replace('id="pooja2"></span>', `id="pooja2"${getTextLengthAttribute(receipt.pooja_name.split(',')[1])}>${receipt.pooja_name.split(',')[1] || ''}</span>`)
    .replace('id="amount"></span>', `id="amount">${receipt.amount}</span>`)
    .replace('id="paymentMode"></span>', `id="paymentMode">${receipt.payment_mode}</span>`);
  // 4. Embed PNG images as base64 data URLs
  const assetsPath = path.join(__dirname, 'assets');
  function imgToDataUrl(filename) {
    try {
      const img = fs.readFileSync(path.join(assetsPath, filename));
      return `data:image/png;base64,${img.toString('base64')}`;
    } catch (e) {
      console.error(`Error loading image ${filename}:`, e);
      // Return a visible placeholder image (red X)
      return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36"><rect width="36" height="36" fill="white"/><line x1="6" y1="6" x2="30" y2="30" stroke="red" stroke-width="4"/><line x1="30" y1="6" x2="6" y2="30" stroke="red" stroke-width="4"/></svg>';
    }
  }
  html = html
    .replace(/src="temple logo\.png"/, `src="${imgToDataUrl('temple logo.png')}"`)
    .replace(/src="symbols\.png"/, `src="${imgToDataUrl('symbols.png')}"`)
    .replace(/src="SET logo\.png"/, `src="${imgToDataUrl('SET logo.png')}"`);
  // 5. Create hidden window and print
  const printWin = new BrowserWindow({ 
    show: true,
    webPreferences: {
      webSecurity: true,
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: false,
      sandbox: true
    }
  });
  // Set CSP header to allow local resources
  printWin.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' data: file: blob:;"
        ]
      }
    });
  });
  
  // Write HTML to a temporary file and load it silently
  const tmp = require('os').tmpdir();
  const tmpFile = path.join(tmp, `receipt-print-${Date.now()}.html`);
  fs.writeFileSync(tmpFile, html, 'utf8');
  printWin.loadFile(tmpFile);
  printWin.webContents.on('did-finish-load', () => {
    printWin.webContents.print({ 
      silent: false, 
      printBackground: true, 
      pageSize: 'A5',
      landscape: true
    }, (success, errorType) => {
      printWin.close();
    });
  });
}

// IPC handler for Save & Print and Reprint
ipcMain.handle('print-receipt', async (event, receiptId) => {
  await printReceipt(receiptId);
  return { success: true };
});
// (Removed duplicate destructuring of electron)
const receipt = require('./js/receipt');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'src', 'login.html'));

  // Check for updates
  autoUpdater.checkForUpdates();

  // Update event handlers
  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `Version ${info.version} is available with improvements. Would you like to download it now?`,
      buttons: ['Yes', 'No']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'Update has been downloaded. The application will restart to install the update.',
      buttons: ['Restart Now']
    }).then(() => {
      autoUpdater.quitAndInstall(false, true);
    });
  });

  autoUpdater.on('error', (err) => {
    dialog.showErrorBox('Error', 'Error while updating: ' + err.message);
  });
}

function registerIpcHandlers() {
  // --- Delete Receipt IPC Handler ---
  ipcMain.handle('delete-receipt', async (event, id) => {
    try {
      return await receipt.deleteReceipt(id);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  // --- User Authentication ---
  ipcMain.handle('authenticate-user', async (event, username, password) => {
    return receipt.authenticateUser(username, password);
  });
  // --- Generate Backup PDF IPC Handler ---
  ipcMain.handle('generate-backup-pdf', async (event, filters) => {
    try {
      return await receipt.generateBackupPDF(filters);
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  // --- Reprint Receipt IPC Handler ---
    ipcMain.handle('reprint-receipt', async (event, receipt_id) => {
      try {
        const result = await receipt.reprintReceipt(receipt_id);
        if (result.success && result.pdfBuffer) {
          event.sender.send('print-pdf-buffer', result.pdfBuffer);
        }
        return { success: true };
      } catch (err) {
        return { success: false, error: err.message };
      }
    });
  // --- Receipt History IPC Handler ---
  ipcMain.handle('get-receipts', async (event, filters) => {
    try {
      const rows = await receipt.getReceipts(filters);
      return { success: true, receipts: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  // --- Pooja CRUD IPC Handlers ---
  ipcMain.handle('get-poojas', async () => {
    try {
      const rows = await receipt.getPoojas();
      return { success: true, poojas: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('add-pooja', async (event, name, price) => {
    return await receipt.addPooja(name, price);
  });

  ipcMain.handle('edit-pooja', async (event, id, name, price) => {
    return await receipt.editPooja(id, name, price);
  });

  ipcMain.handle('delete-pooja', async (event, id) => {
    return await receipt.deletePooja(id);
  });

  // IPC handler for createReceipt
  ipcMain.handle('create-receipt', async (event, data) => {
    try {
      const result = await receipt.createReceipt(data);
      return result;
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  registerIpcHandlers();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
