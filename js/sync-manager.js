const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Storage } = require('@google-cloud/storage');
const log = require('electron-log');

class SyncManager {
    constructor(db, role) {
        this.db = db;
        this.role = role; // 'ADMIN' or 'STAFF'
        this.systemId = this.getOrCreateSystemId();
        this.storage = new Storage({
            keyFilename: path.join(app.getPath('userData'), 'google-cloud-key.json')
        });
        this.bucket = this.storage.bucket('sims-trs-sync');
        
        // Initialize system role in database
        this.initializeSystem();
    }

    getOrCreateSystemId() {
        const idPath = path.join(app.getPath('userData'), 'system-id');
        if (fs.existsSync(idPath)) {
            return fs.readFileSync(idPath, 'utf8');
        }
        const newId = crypto.randomUUID();
        fs.writeFileSync(idPath, newId);
        return newId;
    }

    initializeSystem() {
        const stmt = this.db.prepare(`
            INSERT OR IGNORE INTO sync_state (system_role, system_id)
            VALUES (?, ?)
        `);
        stmt.run(this.role, this.systemId);
    }

    async uploadChanges() {
        try {
            // Get unsynced records based on role
            let unsyncedData = {};
            
            if (this.role === 'STAFF') {
                // Staff uploads receipt data
                unsyncedData.receipts = this.db.prepare(`
                    SELECT * FROM receipts WHERE is_synced = 0
                `).all();
            } else if (this.role === 'ADMIN') {
                // Admin uploads pooja and settings data
                unsyncedData.poojas = this.db.prepare(`
                    SELECT * FROM poojas WHERE is_synced = 0
                `).all();
                unsyncedData.settings = this.db.prepare(`
                    SELECT * FROM settings WHERE is_synced = 0
                `).all();
            }

            // Upload to cloud storage
            const timestamp = new Date().toISOString();
            const filename = `${this.systemId}_${timestamp}.json`;
            const file = this.bucket.file(filename);
            
            await file.save(JSON.stringify(unsyncedData), {
                metadata: {
                    systemId: this.systemId,
                    role: this.role,
                    timestamp
                }
            });

            // Update sync status
            if (this.role === 'STAFF') {
                this.db.prepare(`
                    UPDATE receipts SET is_synced = 1 WHERE is_synced = 0
                `).run();
            } else {
                this.db.prepare(`
                    UPDATE poojas SET is_synced = 1 WHERE is_synced = 0
                `).run();
                this.db.prepare(`
                    UPDATE settings SET is_synced = 1 WHERE is_synced = 0
                `).run();
            }

            // Update last sync timestamp
            this.db.prepare(`
                UPDATE sync_state 
                SET last_sync_timestamp = ?, cloud_last_sync = ?
                WHERE system_id = ?
            `).run(timestamp, timestamp, this.systemId);

            log.info(`Successfully uploaded changes to cloud storage: ${filename}`);
            return true;
        } catch (error) {
            log.error('Error uploading changes:', error);
            throw error;
        }
    }

    async downloadChanges() {
        try {
            // Get last sync timestamp
            const syncState = this.db.prepare(`
                SELECT last_sync_timestamp FROM sync_state WHERE system_id = ?
            `).get(this.systemId);

            const [files] = await this.bucket.getFiles({
                prefix: this.role === 'STAFF' ? 'ADMIN_' : 'STAFF_'
            });

            const relevantFiles = files.filter(file => {
                const metadata = file.metadata;
                return (!syncState?.last_sync_timestamp || 
                        metadata.timestamp > syncState.last_sync_timestamp);
            });

            for (const file of relevantFiles) {
                const [content] = await file.download();
                const data = JSON.parse(content.toString());

                // Begin transaction
                this.db.prepare('BEGIN TRANSACTION').run();

                try {
                    if (this.role === 'STAFF') {
                        // Staff receives pooja and settings updates
                        if (data.poojas) {
                            this.updatePoojas(data.poojas);
                        }
                        if (data.settings) {
                            this.updateSettings(data.settings);
                        }
                    } else {
                        // Admin receives receipt data
                        if (data.receipts) {
                            this.updateReceipts(data.receipts);
                        }
                    }

                    this.db.prepare('COMMIT').run();
                } catch (error) {
                    this.db.prepare('ROLLBACK').run();
                    throw error;
                }
            }

            // Update last sync timestamp
            if (relevantFiles.length > 0) {
                const lastTimestamp = relevantFiles[relevantFiles.length - 1].metadata.timestamp;
                this.db.prepare(`
                    UPDATE sync_state 
                    SET last_sync_timestamp = ?
                    WHERE system_id = ?
                `).run(lastTimestamp, this.systemId);
            }

            log.info('Successfully downloaded and applied changes from cloud storage');
            return true;
        } catch (error) {
            log.error('Error downloading changes:', error);
            throw error;
        }
    }

    updatePoojas(poojas) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO poojas (
                sync_id, name, price, last_modified, sync_version
            ) VALUES (?, ?, ?, ?, ?)
        `);
        
        for (const pooja of poojas) {
            stmt.run(
                pooja.sync_id,
                pooja.name,
                pooja.price,
                pooja.last_modified,
                pooja.sync_version
            );
        }
    }

    updateSettings(settings) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO settings (
                sync_id, key, value, last_modified, sync_version
            ) VALUES (?, ?, ?, ?, ?)
        `);
        
        for (const setting of settings) {
            stmt.run(
                setting.sync_id,
                setting.key,
                setting.value,
                setting.last_modified,
                setting.sync_version
            );
        }
    }

    updateReceipts(receipts) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO receipts (
                sync_id, date, devotee_name, address, pooja_name,
                amount, payment_mode, last_modified, sync_version
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const receipt of receipts) {
            stmt.run(
                receipt.sync_id,
                receipt.date,
                receipt.devotee_name,
                receipt.address,
                receipt.pooja_name,
                receipt.amount,
                receipt.payment_mode,
                receipt.last_modified,
                receipt.sync_version
            );
        }
    }

    async createBackup() {
        if (this.role !== 'ADMIN') {
            throw new Error('Only admin can create backups');
        }

        try {
            // Export entire database
            const timestamp = new Date().toISOString();
            const backupData = {
                receipts: this.db.prepare('SELECT * FROM receipts').all(),
                poojas: this.db.prepare('SELECT * FROM poojas').all(),
                settings: this.db.prepare('SELECT * FROM settings').all(),
                sync_state: this.db.prepare('SELECT * FROM sync_state').all()
            };

            // Save to cloud storage
            const filename = `backup_${timestamp}.json`;
            const file = this.bucket.file(`backups/${filename}`);
            
            await file.save(JSON.stringify(backupData), {
                metadata: {
                    type: 'backup',
                    timestamp
                }
            });

            // Also save locally
            const backupDir = path.join(app.getPath('userData'), 'backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir);
            }
            
            const localBackupPath = path.join(backupDir, filename);
            fs.writeFileSync(localBackupPath, JSON.stringify(backupData, null, 2));

            log.info(`Backup created successfully: ${filename}`);
            return {
                cloudPath: `backups/${filename}`,
                localPath: localBackupPath
            };
        } catch (error) {
            log.error('Error creating backup:', error);
            throw error;
        }
    }
}

module.exports = SyncManager;
