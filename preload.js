const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
    // Send timer updates to main process
    sendTimerUpdate: (state) => {
        ipcRenderer.send('timer-update', state);
    },

    // Send settings sync to main process
    sendSettingsSync: (settings) => {
        ipcRenderer.send('settings-sync', settings);
    },

    // Receive commands from main process (menu items)
    onToggleTimer: (callback) => {
        ipcRenderer.on('toggle-timer', callback);
    },

    onResetTimer: (callback) => {
        ipcRenderer.on('reset-timer', callback);
    },

    onToggleMode: (callback) => {
        ipcRenderer.on('toggle-mode', callback);
    },

    onSetFocusDuration: (callback) => {
        ipcRenderer.on('set-focus-duration', callback);
    },

    onSetTheme: (callback) => {
        ipcRenderer.on('set-theme', callback);
    },

    onSetSound: (callback) => {
        ipcRenderer.on('set-sound', callback);
    },

    onSetAutoStartRest: (callback) => {
        ipcRenderer.on('set-auto-start-rest', callback);
    },

    onSetAutoStartFocus: (callback) => {
        ipcRenderer.on('set-auto-start-focus', callback);
    },

    // Request window actions from renderer
    requestShowWindow: () => {
        ipcRenderer.send('request-show-window');
    },

    requestHideWindow: () => {
        ipcRenderer.send('request-hide-window');
    },

    requestFullscreen: () => {
        ipcRenderer.send('request-fullscreen');
    }
});
