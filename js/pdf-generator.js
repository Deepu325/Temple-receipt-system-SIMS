const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

class PdfGenerator {
    constructor() {
        this.browser = null;
        this.templatePath = path.join(__dirname, '../assets/receipt-template.html');
    }

    async initialize() {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox']
            });
        }
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
        }
    }

    async generateBackupPDF({ pdfPath, rows }) {
        try {
            await this.initialize();
            const page = await this.browser.newPage();

            // Set up the HTML content for the backup
            const html = this.generateBackupHTML(rows);
            await page.setContent(html, {
                waitUntil: 'networkidle0'
            });

            // Add custom fonts
            await page.addStyleTag({
                content: `
                    @font-face {
                        font-family: 'NotoSansKannada';
                        src: url('${path.join(__dirname, '../assets/NotoSansKannada-Regular.ttf')}') format('truetype');
                        font-weight: normal;
                        font-style: normal;
                    }
                    body {
                        font-family: 'NotoSansKannada', system-ui, -apple-system, sans-serif;
                    }
                `
            });

            // Generate PDF
            await page.pdf({
                path: pdfPath,
                format: 'A4',
                margin: {
                    top: '40px',
                    bottom: '40px',
                    left: '40px',
                    right: '40px'
                },
                printBackground: true
            });

            await page.close();
            return { success: true, pdfPath };
        } catch (error) {
            console.error('PDF Generation Error:', error);
            return { success: false, error: error.message };
        }
    }

    generateBackupHTML(rows) {
        // Calculate totals
        const totalCount = rows.length;
        const totalAmount = rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        const totalCash = rows.filter(r => (r.payment_mode || '').toLowerCase() === 'cash')
            .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        const totalOnline = rows.filter(r => (r.payment_mode || '').toLowerCase() === 'online')
            .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

        return `<!DOCTYPE html>
        <html lang="kn">
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: 'NotoSansKannada', system-ui, -apple-system, sans-serif;
                    padding: 20px;
                    line-height: 1.5;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f5f5f5;
                }
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .summary {
                    margin: 20px 0;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>ಶ್ರೀ ಸೌಂದರ್ಯ ವೆಂಕಟರಮಣ ಸ್ವಾಮಿ ದೇವಸ್ಥಾನ</h1>
                <p>೧೨ನೇ ಅಡ್ಡ ರಸ್ತೆ, ೧ನೇ ಮುಖ್ಯ ರಸ್ತೆ, ಸೌಂದರ್ಯ ನಗರ, ಸಿಡೆದಹಳ್ಳಿ</p>
            </div>
            <div class="summary">
                <p>ಒಟ್ಟು ರಸೀದಿಗಳು: ${totalCount}</p>
                <p>ಒಟ್ಟು ಮೊತ್ತ: ₹${totalAmount.toFixed(2)}</p>
                <p>ನಗದು: ₹${totalCash.toFixed(2)}</p>
                <p>ಆನ್‌ಲೈನ್: ₹${totalOnline.toFixed(2)}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>ಕ್ರಮ ಸಂಖ್ಯೆ</th>
                        <th>ದಿನಾಂಕ</th>
                        <th>ಹೆಸರು</th>
                        <th>ವಿಳಾಸ</th>
                        <th>ಮೊತ್ತ</th>
                        <th>ಪಾವತಿ ವಿಧಾನ</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.map((r, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${r.date || ''}</td>
                            <td>${r.devotee_name || ''}</td>
                            <td>${r.address || ''}</td>
                            <td>₹${(r.amount || 0).toFixed(2)}</td>
                            <td>${r.payment_mode || ''}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>`;
    }
}

module.exports = new PdfGenerator();
