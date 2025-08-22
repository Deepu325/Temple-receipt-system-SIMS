const crypto = require('crypto');
const bcrypt = require('bcrypt');

class UserService {
    constructor(db) {
        this.db = db;
    }

    async hashPassword(password) {
        return await bcrypt.hash(password, 10);
    }

    async verifyPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    async authenticateUser(username, password) {
        const user = this.db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
        if (!user) {
            throw new Error('User not found');
        }

        const isValid = await this.verifyPassword(password, user.password);
        if (!isValid) {
            throw new Error('Invalid password');
        }

        return {
            id: user.id,
            username: user.username,
            role: user.role
        };
    }

    getUsers() {
        return this.db.prepare('SELECT id, username, role FROM users WHERE active = 1').all();
    }

    getUser(userId) {
        return this.db.prepare('SELECT id, username, role FROM users WHERE id = ? AND active = 1').get(userId);
    }

    async createUser(userData) {
        const hashedPassword = await this.hashPassword(userData.password);
        const stmt = this.db.prepare(`
            INSERT INTO users (username, password, role, sync_id)
            VALUES (?, ?, ?, ?)
        `);
        
        return stmt.run(
            userData.username,
            hashedPassword,
            userData.role,
            crypto.randomUUID()
        );
    }

    async updateUser(userData) {
        let stmt;
        let params;

        if (userData.password) {
            const hashedPassword = await this.hashPassword(userData.password);
            stmt = this.db.prepare(`
                UPDATE users 
                SET username = ?, password = ?, role = ?,
                    last_modified = CURRENT_TIMESTAMP, is_synced = 0
                WHERE id = ?
            `);
            params = [userData.username, hashedPassword, userData.role, userData.id];
        } else {
            stmt = this.db.prepare(`
                UPDATE users 
                SET username = ?, role = ?,
                    last_modified = CURRENT_TIMESTAMP, is_synced = 0
                WHERE id = ?
            `);
            params = [userData.username, userData.role, userData.id];
        }

        return stmt.run(...params);
    }

    deleteUser(userId) {
        return this.db.prepare(`
            UPDATE users 
            SET active = 0, last_modified = CURRENT_TIMESTAMP, is_synced = 0
            WHERE id = ?
        `).run(userId);
    }

    changePassword(userId, currentPassword, newPassword) {
        const user = this.db.prepare('SELECT password FROM users WHERE id = ? AND active = 1').get(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const isValid = await this.verifyPassword(currentPassword, user.password);
        if (!isValid) {
            throw new Error('Current password is incorrect');
        }

        const hashedPassword = await this.hashPassword(newPassword);
        return this.db.prepare(`
            UPDATE users 
            SET password = ?, last_modified = CURRENT_TIMESTAMP, is_synced = 0
            WHERE id = ?
        `).run(hashedPassword, userId);
    }
}

module.exports = UserService;
