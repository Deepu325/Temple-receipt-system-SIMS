const path = require('path');
const fs = require('fs');

function initializeDatabase(db) {
    try {
        // Apply migrations
        const migrationPath = path.join(__dirname, 'migrations', 'sync-schema.sql');
        const migration = fs.readFileSync(migrationPath, 'utf8');
        db.exec(migration);

        // Check if admin user exists, if not create default admin
        const adminExists = db.prepare('SELECT id FROM users WHERE role = "ADMIN" LIMIT 1').get();
        if (!adminExists) {
            db.prepare(`
                INSERT INTO users (username, password, role, sync_id)
                VALUES (?, ?, 'ADMIN', ?)
            `).run('admin', 'admin123', crypto.randomUUID());
        }

        return true;
    } catch (error) {
        console.error('Database initialization error:', error);
        return false;
    }
}

module.exports = { initializeDatabase };
