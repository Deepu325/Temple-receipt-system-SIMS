const UserService = require('./js/user-service');
let userService = null;

function registerUserHandlers() {
    // Initialize user service
    const db = initializeDatabase();
    userService = new UserService(db);

    // User Management IPC Handlers
    ipcMain.handle('check-online', async () => {
        return require('is-online')();
    });

    ipcMain.handle('get-users', async (event) => {
        const isOnline = await require('is-online')();
        if (!isOnline) {
            throw new Error('This feature requires internet connection');
        }
        return userService.getUsers();
    });

    ipcMain.handle('get-user', async (event, userId) => {
        const isOnline = await require('is-online')();
        if (!isOnline) {
            throw new Error('This feature requires internet connection');
        }
        return userService.getUser(userId);
    });

    ipcMain.handle('save-user', async (event, userData) => {
        const isOnline = await require('is-online')();
        if (!isOnline) {
            throw new Error('This feature requires internet connection');
        }

        if (userData.id) {
            return await userService.updateUser(userData);
        } else {
            return await userService.createUser(userData);
        }
    });

    ipcMain.handle('delete-user', async (event, userId) => {
        const isOnline = await require('is-online')();
        if (!isOnline) {
            throw new Error('This feature requires internet connection');
        }
        return userService.deleteUser(userId);
    });

    ipcMain.handle('change-password', async (event, data) => {
        const isOnline = await require('is-online')();
        if (!isOnline) {
            throw new Error('This feature requires internet connection');
        }
        return userService.changePassword(data.userId, data.currentPassword, data.newPassword);
    });

    // Update authentication to use UserService
    ipcMain.handle('authenticate-user', async (event, username, password) => {
        try {
            const user = await userService.authenticateUser(username, password);
            return { success: true, user };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });
}
