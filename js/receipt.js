// Using better-sqlite3 for synchronous, offline database access in Electron
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const PDFDocument = require('pdfkit');
const { shell } = require('electron');

const dbPath = path.join(__dirname, '../db/temple.db');
const db = new Database(dbPath);

const receiptsDir = path.join(__dirname, '../receipts');
const kannadaFontPath = path.join(__dirname, '../assets/NotoSansKannada-Regular.ttf');

// Ensure receipts table exists and has payment_mode column
db.prepare(`CREATE TABLE IF NOT EXISTS receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  devotee_name TEXT,
  address TEXT,
  pooja_name TEXT,
  amount REAL,
  date TEXT,
  payment_mode TEXT DEFAULT 'Cash'
)`).run();
// Add payment_mode column if missing (for upgrades)
try {
  db.prepare('ALTER TABLE receipts ADD COLUMN payment_mode TEXT DEFAULT "Cash"').run();
} catch (e) { /* ignore if exists */ }

// Ensure users table exists and insert default users if empty
db.prepare(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  password TEXT,
  role TEXT CHECK(role IN ('admin', 'staff'))
)`).run();

const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
if (userCount === 0) {
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', 'admin123', 'admin');
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('staff', 'staff123', 'staff');
}



// Authenticate user by username and password
function authenticateUser(username, password) {
  const row = db.prepare('SELECT username, role FROM users WHERE username = ? AND password = ?').get(username, password);
  return row || null;
}



// Ensure poojas table exists
db.prepare(`CREATE TABLE IF NOT EXISTS poojas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL
)`).run();

// Seed default Kannada pooja list if table is empty
const poojaSeed = [
  { name: 'ಪಂಚಾಮೃತ ಅಭಿಷೇಕ', price: 500 },
  { name: 'ಅಬಿಷೇಕ', price: 30 },
  { name: 'ಕರ್ಪೂರ ಆರತಿ', price: 20 },
  { name: 'ಅಲಂಕೃತ ಅಬಿಷೇಕ', price: 100 },
  { name: 'ಶುಕ್ರವಾರದ ಅಭಿಷೇಕ', price: 1500 },
  { name: 'ಶುಕ್ರವಾರದ ಪೂಜಾ ಸೇವೆ', price: 5000 },
  { name: 'ಅಲಂಕೃತ ಪೂಜೆ ದಿನಸರಿ', price: 500 },
  { name: 'ತೋಮಳೆ ಸೇವೆ', price: 1500 },
  { name: 'ಶನಿವಾರದ ಸಪ್ತಸಂಗೀತ', price: 9000 },
  { name: 'ಶನಿವಾರದ ಪೂಜಾ ಸೇವೆ', price: 5000 },
  { name: 'ತಿಥಿ ಪೂಜಾ', price: 100 },
  { name: 'ಸತ್ಯನಾರಾಯಣ ಪೂಜೆ', price: 5000 },
  { name: 'ಸಾಮೂಹಿಕ ಸತ್ಯನಾರಾಯಣ ಪೂಜೆ', price: 6000 },
  { name: 'ಗಣಹೋಮ', price: 500 },
  { name: 'ಸಾಮೂಹಿಕ ಗಣಹೋಮ', price: 201 },
  { name: 'ದಿನ ನಿತ್ಯ ಏಕಾದಶ ಸೇವೆ', price: 350 },
  { name: 'ಶುಕ್ರವಾರ ಹಾಗೂ ಶನಿವಾರದ ಏಕಾದಶ ಸೇವೆ', price: 350 },
  { name: 'ಕಲ್ಯಾಣೋತ್ಸವ', price: 35000 },
  { name: 'ಸಾಮೂಹಿಕ ಕಲ್ಯಾಣೋತ್ಸವ', price: 3000 },
  { name: 'ಆಂಜನೇಯ ಹೋಮ/ಸಪ್ತಸಂಗೀತ/ಪಾಲಾಂಕಿತ ಸೇವೆ', price: 10000 },
  { name: 'ನಾಮಕರಣ', price: 201 },
  { name: 'ಉಪನಯನ', price: 201 },
  { name: 'ಚೋಳ', price: 201 },
  { name: 'ಅಷ್ಟೋತ್ತರ ಅಬಿಷೇಕ', price: 201 },
  { name: 'ಅನ್ನಸಂತರ್ಪಣೆ', price: 201 },
  { name: 'ವಾಹನ ಪೂಜೆ 2 Wheelers', price: 150 },
  { name: 'ವಾಹನ ಪೂಜೆ 4 Wheelers', price: 250 },
  { name: 'ವಾಸ್ತು', price: 201 },
  { name: 'ಕೃತಿಕ ಮಾಸದ ದೀಪೋತ್ಸವ', price: 10000 },
  { name: 'ಆನಂದ ಸೇವೆ', price: 500 },
  { name: 'ಹೂವಿನ ಅಲಂಕೃತ ಪೂಜೆ', price: 5000 },
  { name: 'ವಾಲ್ಕಾನೃತ್ಯೋತ್ಸವ', price: 5000 },
  { name: 'ಬಹೋತ್ಸವ 5 ದಿನಗಳು', price: 50000 },
  { name: 'ಮಹೋತ್ಸವ', price: 25000 },
  { name: 'ಸರಸ್ವತಿ ಕಲಾಭಿಷೇಕ: 108 ಕಲಶ', price: 25000 },
  { name: 'ಚೆನ್ನಪಟ್ನಾಭಿಷೇಕ', price: 25000 },
  { name: 'ಅಷ್ಟೋತ್ತರ ಪೂಜೆ: 108 ಬೆಳ್ಳಿ ಹೂವು', price: 25000 },
  { name: 'ಶಾಲಾ ಸ್ಥಾಪಿತ ಪೂಜೆ', price: 25000 },
];
const poojaCount = db.prepare('SELECT COUNT(*) as cnt FROM poojas').get().cnt;
if (poojaCount === 0) {
  const insert = db.prepare('INSERT INTO poojas (name, price) VALUES (?, ?)');
  for (const p of poojaSeed) {
    insert.run(p.name, p.price);
  }
}

// --- Pooja Functions ---
function getPoojas() {
  return db.prepare('SELECT * FROM poojas ORDER BY name ASC').all();
}

function addPooja(name, price) {
  const stmt = db.prepare('INSERT INTO poojas (name, price) VALUES (?, ?)');
  const info = stmt.run([name, price]);
  return { id: info.lastInsertRowid };
}

function editPooja(id, name, price) {
  console.log(`[editPooja] Attempting to update pooja id=${id} to name='${name}', price=${price}`);
  const stmt = db.prepare('UPDATE poojas SET name = ?, price = ? WHERE id = ?');
  const info = stmt.run([name, price, id]);
  console.log(`[editPooja] Update result: changes=${info.changes}`);
  return { success: info.changes > 0 };
}

function deletePooja(id) {
  const stmt = db.prepare('DELETE FROM poojas WHERE id = ?');
  const info = stmt.run([id]);
  return { success: info.changes > 0 };
}

// --- Receipt Functions ---
function createReceipt(data) {
  const now = new Date();
  // Format: dd/mm/yyyy HH:MM:ss
  const pad = n => n.toString().padStart(2, '0');
  const dateStr = `${pad(now.getDate())}/${pad(now.getMonth()+1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const stmt = db.prepare(
    `INSERT INTO receipts (devotee_name, address, pooja_name, amount, date, payment_mode) VALUES (?, ?, ?, ?, ?, ?)`
  );
  const info = stmt.run([
    data.devotee_name,
    data.address,
    data.pooja_name,
    data.amount,
    dateStr,
    data.payment_mode || 'Cash',
  ]);
  const receiptId = info.lastInsertRowid;
  return { success: true, receiptId };
}

function getReceipts(filters = {}) {
  let sql = 'SELECT * FROM receipts WHERE 1=1';
  const params = [];
  if (filters.pooja) {
    sql += ' AND pooja_name = ?';
    params.push(filters.pooja);
  }
  if (filters.name) {
    sql += ' AND devotee_name LIKE ?';
    params.push(`%${filters.name}%`);
  }
  sql += ' ORDER BY date DESC, id DESC';
  let rows = db.prepare(sql).all(params);
  // Date filter in JS since date is dd/mm/yyyy HH:MM:ss
  function convertToDateObject(str) {
    if (!str) return null;
    if (str.includes('/')) { // dd/mm/yyyy format from DB
      const [datePart] = str.split(' ');
      const [d, m, y] = datePart.split('/').map(Number);
      return new Date(y, m - 1, d);
    } else { // YYYY-MM-DD format from frontend
      const [y, m, d] = str.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
  }

  if (filters.from) {
    const fromDate = convertToDateObject(filters.from);
    fromDate.setHours(0, 0, 0, 0);
    rows = rows.filter(r => {
      const rowDate = convertToDateObject(r.date);
      rowDate.setHours(0, 0, 0, 0);
      return rowDate >= fromDate;
    });
  }
  if (filters.to) {
    const toDate = convertToDateObject(filters.to);
    toDate.setHours(23, 59, 59, 999);
    rows = rows.filter(r => {
      const rowDate = convertToDateObject(r.date);
      return rowDate <= toDate;
    });
  }
  return rows;
}

function reprintReceipt(receipt_id) {
  const row = db.prepare(`SELECT * FROM receipts WHERE id = ?`).get([receipt_id]);
  if (!row) return { success: false, error: 'Receipt not found.' };
  return generateReceiptPDFBuffer({
    receiptId: row.id,
    dateStr: row.date,
    ...row
  });
}


function deleteReceipt(id) {
  const stmt = db.prepare('DELETE FROM receipts WHERE id = ?');
  const info = stmt.run(id);
  return { success: info.changes > 0 };
}

module.exports = {
  getPoojas,
  addPooja,
  editPooja,
  deletePooja,
  createReceipt,
  getReceipts,
  reprintReceipt,
  generateBackupPDF,
  authenticateUser,
  deleteReceipt,
};
// Generate PDF as a Buffer in memory for printing
function generateReceiptPDFBuffer({ receiptId, dateStr, devotee_name, address, pooja_name, amount, payment_mode }) {
  return new Promise((resolve) => {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A5', margin: 40 });
    const buffers = [];
  // A5 size, margin 40
  // --- HEADER ICONS ---
  // Paths
  const path = require('path');
  const setLogo = path.join(__dirname, '../assets/SET logo.png');
  const templeLogo = path.join(__dirname, '../assets/temple logo.png');
  const symbols = path.join(__dirname, '../assets/symbols.png');
  const iconY = doc.y;
  const iconSize = 44;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  // SET logo (left)
  doc.image(setLogo, doc.page.margins.left + 10, iconY, { width: iconSize, height: iconSize });
  // Symbols (center, wider)
  const symbolsWidth = 70;
  doc.image(symbols, doc.page.margins.left + pageWidth/2 - symbolsWidth/2, iconY, { width: symbolsWidth, height: iconSize });
  // Temple logo (right)
  doc.image(templeLogo, doc.page.margins.left + pageWidth - iconSize - 10, iconY, { width: iconSize, height: iconSize });
  // Move below icons
  doc.y = iconY + iconSize + 4;
  // --- TEMPLE NAME ---
  doc.font(kannadaFontPath).fontSize(18).text('ಶ್ರೀ ಸೌಂದರ್ಯ ವೆಂಕಟರಮಣ ಸ್ವಾಮಿ ದೇವಸ್ಥಾನ', { align: 'center', lineGap: 2 });
  doc.moveDown(0.1);
  // --- ADDRESS ---
  doc.font(kannadaFontPath).fontSize(11).text('ಜಿ.ಎನ್.ಇ ಕ್ಲಾಸ್, ಗೇಟ್ ಮೇನ್ ರಸ್ತೆ, ಸೌಂದರ್ಯ ನಗರ,', { align: 'center' });
  doc.font(kannadaFontPath).text('ಸೀಡೆದಹಳ್ಳಿ, ನಾಗಸಂದ್ರ ಅಂಚೆ, ಬೆಂಗಳೂರು', { align: 'center' });
  doc.moveDown(0.2);
  // --- TOP LINE ---
  let y = doc.y + 8;
  doc.save().moveTo(doc.page.margins.left, y).lineTo(doc.page.margins.left + pageWidth, y).lineWidth(2).stroke();
  doc.restore();
  doc.moveDown(0.7);
  // --- RECEIPT FIELDS ---
  doc.font(kannadaFontPath).fontSize(12);
  const labelWidth = 110;
  const startX = doc.page.margins.left + 10;
  y = doc.y;
  // Receipt number and date/time on same line
  doc.text('ರಸೀತಿ ಸಂಖ್ಯೆ:', startX, y, { continued: true });
  doc.font('Helvetica').text(String(receiptId || ''), startX + 70, y, { continued: true });
  doc.font(kannadaFontPath).text('        ದಿನಾಂಕ:', startX + labelWidth + 60, y, { continued: true });
  doc.font('Helvetica').text(String(dateStr || ''), startX + labelWidth + 120, y, { continued: false });
  y = doc.y + 6;
  doc.font(kannadaFontPath).text('ಹೆಸರು:', startX, y, { continued: true });
  doc.font('Helvetica').text(String(devotee_name || ''), startX + labelWidth, y, { continued: false });
  y = doc.y + 6;
  doc.font(kannadaFontPath).text('ವಿಳಾಸ:', startX, y, { continued: true });
  doc.font('Helvetica').text(String(address || ''), startX + labelWidth, y, { continued: false });
  y = doc.y + 6;
  doc.font(kannadaFontPath).text('ಪೂಜೆ:', startX, y, { continued: true });
  doc.font(kannadaFontPath).text(String(pooja_name || ''), startX + labelWidth, y, { continued: false });
  y = doc.y + 6;
  doc.font(kannadaFontPath).text('ಮೊತ್ತ:', startX, y, { continued: true });
  doc.font(kannadaFontPath).text(`₹${String(amount || '')}`, startX + labelWidth, y, { continued: false });
  y = doc.y + 6;
  doc.font(kannadaFontPath).text('ಪಾವತಿ ವಿಧಾನ:', startX, y, { continued: true });
  doc.font('Helvetica').text(String(payment_mode || ''), startX + labelWidth, y, { continued: false });
  // --- BOTTOM LINE ---
  y = doc.y + 16;
  doc.save().moveTo(doc.page.margins.left, y).lineTo(doc.page.margins.left + pageWidth, y).lineWidth(2).stroke();
  doc.restore();
  // --- FOOTER ---
  doc.moveDown(1.2);
  doc.font(kannadaFontPath).fontSize(11).text('ನಿಮ್ಮ ಸೇವೆಗೆ ಶ್ರೀ ಸೌಂದರ್ಯ ವೆಂಕಟರಮಣನ ಆಶೀರ್ವಾದ ಸದಾ ಇರಲಿ', { align: 'center' });
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(buffers);
      resolve({ success: true, pdfBuffer });
    });
    doc.end();
  });
}


async function generateBackupPDF(filters = {}) {
  let sql = `SELECT r.id, r.date, r.devotee_name, r.address, r.amount, r.payment_mode
             FROM receipts r
             ORDER BY r.id ASC`;
  const rows = db.prepare(sql).all();
  // Date filter in JS since r.date is dd/mm/yyyy HH:MM:ss
  let filteredRows = rows;
  function parseDateOnly(str) {
    // dd/mm/yyyy HH:MM:ss or dd/mm/yyyy
    if (!str) return null;
    const [datePart] = str.split(' ');
    const [d, m, y] = datePart.split('/').map(Number);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  if (filters.from) {
    const fromStr = filters.from;
    filteredRows = filteredRows.filter(r => {
      const dtStr = parseDateOnly(r.date);
      return dtStr && dtStr >= fromStr;
    });
  }
  if (filters.to) {
    const toStr = filters.to;
    filteredRows = filteredRows.filter(r => {
      const dtStr = parseDateOnly(r.date);
      return dtStr && dtStr <= toStr;
    });
  }
  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);
  const now = new Date();
  const dateStr = now.toISOString().slice(0,10);
  const timeStr = now.toTimeString().slice(0,8).replace(/:/g, '-');
  const pdfPath = path.join(backupDir, `backup_${dateStr}_${timeStr}.pdf`);
  
  // Use the new Puppeteer-based PDF generator
  const pdfGenerator = require('./pdf-generator');
  return await pdfGenerator.generateBackupPDF({ pdfPath, rows: filteredRows });
}

// --- PDFKit Utility Functions ---
function generateReceiptPDF({ pdfPath, receiptId, dateStr, devotee_name, address, pooja_name, amount }) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A5', margin: 40 });
    doc.font(kannadaFontPath).fontSize(16).text('ಶ್ರೀ ಸೌಂದರ್ಯ ವೆಂಕಟರಮಣ ಸ್ವಾಮಿ ದೇವಸ್ಥಾನ', { align: 'center' });
    doc.moveDown(0.2);
    doc.font(kannadaFontPath).fontSize(12).text('ಪ್ರಕೃತಿ ಲೇಔಟ್, ಸೌಂದರ್ಯ ಲೇಔಟ್', { align: 'center' });
    doc.font(kannadaFontPath).text('ಸೀಡೆದಹಳ್ಳಿ, ಬೆಂಗಳೂರು - 560073', { align: 'center' });
    doc.moveDown(1);
    doc.font(kannadaFontPath).fontSize(12).text(`ರಸೀತಿ ಸಂಖ್ಯೆ: ${String(receiptId)}      ದಿನಾಂಕ: ${String(dateStr)}`);
    doc.font(kannadaFontPath).text(`ಹೆಸರು: ${String(devotee_name || '')}`);
    doc.font(kannadaFontPath).text(`ವಿಳಾಸ: ${String(address || '')}`);
    doc.font(kannadaFontPath).text(`ಪೂಜೆ: ${String(pooja_name || '')}`);
    doc.font(kannadaFontPath).text(`ಮೊತ್ತ: ₹${String(amount || '')}`);
    doc.moveDown(1);
    doc.font(kannadaFontPath).text('ನಿಮ್ಮ ಭಕ್ತಿಗೆ ಧನ್ಯವಾದಗಳು.', { align: 'center' });
    doc.end();
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);
    stream.on('finish', resolve);
  });
}

// Removed old PDFKit-based backup generator as it's replaced by Puppeteer implementation in pdf-generator.js

