const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  createReceipt: (data) => ipcRenderer.invoke('create-receipt', data),
  getPoojas: () => ipcRenderer.invoke('get-poojas'),
  addPooja: (name, price) => ipcRenderer.invoke('add-pooja', name, price),
  editPooja: (id, name, price) => ipcRenderer.invoke('edit-pooja', id, name, price),
  deletePooja: (id) => ipcRenderer.invoke('delete-pooja', id),
  getReceipts: (filters) => ipcRenderer.invoke('get-receipts', filters),
  reprintReceipt: (receipt_id) => ipcRenderer.invoke('reprint-receipt', receipt_id),
  generateBackupPDF: (filters) => ipcRenderer.invoke('generate-backup-pdf', filters),
  authenticateUser: (username, password) => ipcRenderer.invoke('authenticate-user', username, password),
  onPrintPdfBuffer: (callback) => ipcRenderer.on('print-pdf-buffer', (event, pdfBuffer) => callback(pdfBuffer)),
    deleteReceipt: (id) => ipcRenderer.invoke('delete-receipt', id),
    printReceipt: (id) => ipcRenderer.invoke('print-receipt', id),
});
