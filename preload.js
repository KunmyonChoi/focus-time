const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
    // Send timer updates to main process
    sendTimerUpdate: (state) => {
        ipcRenderer.send('timer-update', state);
    },

    // Receive commands from main process (menu items)
    onToggleTimer: (callback) => {
        ipcRenderer.on('toggle-timer', callback);
    },

    onResetTimer: (callback) => {
        ipcRenderer.on('reset-timer', callback);
    }
});
