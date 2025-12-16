const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');

let tray = null;
let mainWindow = null;
let timerState = {
    mode: 'FOCUS',
    timeLeft: 25 * 60,
    isRunning: false
};
let appSettings = {
    focusDuration: 25,
    theme: 'charcoal',
    sound: 'beep',
    autoStartRest: false,
    autoStartFocus: false
};

function createTray() {
    // Create a simple template icon for the tray
    // In production, you'd want to use actual PNG icons
    const icon = nativeImage.createEmpty();

    tray = new Tray(icon);
    tray.setToolTip('Focus Timer');
    updateTrayTitle();

    // Left-click: show context menu
    // Right-click: toggle play/pause
    tray.on('click', (event, bounds) => {
        // On macOS, we can use pressedKeys to detect which button was clicked
        // For simplicity, we'll show menu on left click
        tray.popUpContextMenu();
    });

    tray.on('right-click', () => {
        // Right-click toggles play/pause
        // Ensure window exists and is ready
        if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('toggle-timer');
        } else {
            // Create window if it doesn't exist
            createWindow();
            // Wait for window to be ready, then toggle
            mainWindow.once('ready-to-show', () => {
                mainWindow.webContents.send('toggle-timer');
            });
        }
    });

    updateTrayMenu();
}

function updateTrayMenu() {
    if (!tray) return;

    // Context menu for right-click
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Timer',
            click: () => {
                if (mainWindow) {
                    showWindow();
                } else {
                    createWindow();
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Start/Pause',
            accelerator: 'CmdOrCtrl+Space',
            click: () => {
                if (mainWindow) {
                    mainWindow.webContents.send('toggle-timer');
                }
            }
        },
        {
            label: 'Reset',
            accelerator: 'CmdOrCtrl+R',
            click: () => {
                if (mainWindow) {
                    mainWindow.webContents.send('reset-timer');
                }
            }
        },
        {
            label: 'Toggle Mode (Focus/Rest)',
            accelerator: 'CmdOrCtrl+M',
            click: () => {
                if (mainWindow) {
                    mainWindow.webContents.send('toggle-mode');
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Focus Duration',
            submenu: [
                {
                    label: '25 minutes',
                    type: 'radio',
                    checked: appSettings.focusDuration === 25,
                    click: () => {
                        appSettings.focusDuration = 25;
                        if (mainWindow) {
                            mainWindow.webContents.send('set-focus-duration', 25);
                        }
                        updateTrayMenu();
                    }
                },
                {
                    label: '50 minutes',
                    type: 'radio',
                    checked: appSettings.focusDuration === 50,
                    click: () => {
                        appSettings.focusDuration = 50;
                        if (mainWindow) {
                            mainWindow.webContents.send('set-focus-duration', 50);
                        }
                        updateTrayMenu();
                    }
                },
                {
                    label: '90 minutes',
                    type: 'radio',
                    checked: appSettings.focusDuration === 90,
                    click: () => {
                        appSettings.focusDuration = 90;
                        if (mainWindow) {
                            mainWindow.webContents.send('set-focus-duration', 90);
                        }
                        updateTrayMenu();
                    }
                }
            ]
        },
        {
            label: 'Theme',
            submenu: [
                {
                    label: 'Scenic',
                    type: 'radio',
                    checked: appSettings.theme === 'scenic',
                    click: () => {
                        appSettings.theme = 'scenic';
                        if (mainWindow) {
                            mainWindow.webContents.send('set-theme', 'scenic');
                        }
                        updateTrayMenu();
                    }
                },
                {
                    label: 'Charcoal',
                    type: 'radio',
                    checked: appSettings.theme === 'charcoal',
                    click: () => {
                        appSettings.theme = 'charcoal';
                        if (mainWindow) {
                            mainWindow.webContents.send('set-theme', 'charcoal');
                        }
                        updateTrayMenu();
                    }
                },
                {
                    label: 'Midnight',
                    type: 'radio',
                    checked: appSettings.theme === 'midnight',
                    click: () => {
                        appSettings.theme = 'midnight';
                        if (mainWindow) {
                            mainWindow.webContents.send('set-theme', 'midnight');
                        }
                        updateTrayMenu();
                    }
                },
                {
                    label: 'Sunrise',
                    type: 'radio',
                    checked: appSettings.theme === 'sunrise',
                    click: () => {
                        appSettings.theme = 'sunrise';
                        if (mainWindow) {
                            mainWindow.webContents.send('set-theme', 'sunrise');
                        }
                        updateTrayMenu();
                    }
                },
                {
                    label: 'Forest',
                    type: 'radio',
                    checked: appSettings.theme === 'forest',
                    click: () => {
                        appSettings.theme = 'forest';
                        if (mainWindow) {
                            mainWindow.webContents.send('set-theme', 'forest');
                        }
                        updateTrayMenu();
                    }
                },
                {
                    label: 'Berry',
                    type: 'radio',
                    checked: appSettings.theme === 'berry',
                    click: () => {
                        appSettings.theme = 'berry';
                        if (mainWindow) {
                            mainWindow.webContents.send('set-theme', 'berry');
                        }
                        updateTrayMenu();
                    }
                }
            ]
        },
        {
            label: 'Timer Sound',
            submenu: [
                {
                    label: 'Beep',
                    type: 'radio',
                    checked: appSettings.sound === 'beep',
                    click: () => {
                        appSettings.sound = 'beep';
                        if (mainWindow) {
                            mainWindow.webContents.send('set-sound', 'beep');
                        }
                        updateTrayMenu();
                    }
                },
                {
                    label: 'Alarm',
                    type: 'radio',
                    checked: appSettings.sound === 'alarm',
                    click: () => {
                        appSettings.sound = 'alarm';
                        if (mainWindow) {
                            mainWindow.webContents.send('set-sound', 'alarm');
                        }
                        updateTrayMenu();
                    }
                },
                {
                    label: 'Chime',
                    type: 'radio',
                    checked: appSettings.sound === 'chime',
                    click: () => {
                        appSettings.sound = 'chime';
                        if (mainWindow) {
                            mainWindow.webContents.send('set-sound', 'chime');
                        }
                        updateTrayMenu();
                    }
                },
                {
                    label: 'Mute',
                    type: 'radio',
                    checked: appSettings.sound === 'mute',
                    click: () => {
                        appSettings.sound = 'mute';
                        if (mainWindow) {
                            mainWindow.webContents.send('set-sound', 'mute');
                        }
                        updateTrayMenu();
                    }
                }
            ]
        },
        {
            label: 'Auto-start',
            submenu: [
                {
                    label: 'Auto-start Rest',
                    type: 'checkbox',
                    checked: appSettings.autoStartRest,
                    click: (menuItem) => {
                        appSettings.autoStartRest = menuItem.checked;
                        if (mainWindow) {
                            mainWindow.webContents.send('set-auto-start-rest', menuItem.checked);
                        }
                        updateTrayMenu();
                    }
                },
                {
                    label: 'Auto-start Focus',
                    type: 'checkbox',
                    checked: appSettings.autoStartFocus,
                    click: (menuItem) => {
                        appSettings.autoStartFocus = menuItem.checked;
                        if (mainWindow) {
                            mainWindow.webContents.send('set-auto-start-focus', menuItem.checked);
                        }
                        updateTrayMenu();
                    }
                }
            ]
        },
        { type: 'separator' },
        {
            label: 'Quit',
            accelerator: 'CmdOrCtrl+Q',
            click: () => {
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);
}

function updateTrayTitle() {
    if (!tray) return;

    const minutes = Math.floor(timerState.timeLeft / 60);
    const seconds = timerState.timeLeft % 60;
    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const modeIcon = timerState.mode === 'FOCUS' ? '🎯' : '☕';
    const statusIcon = timerState.isRunning ? '▶' : '⏸';

    tray.setTitle(`${modeIcon} ${timeString} ${statusIcon}`);
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 400,
        height: 500,
        minWidth: 320,
        minHeight: 400,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        // macOS specific: frameless window with vibrancy
        titleBarStyle: 'hiddenInset',
        vibrancy: 'under-window',
        visualEffectState: 'active',
        resizable: true
    });

    mainWindow.loadFile('index.html');

    mainWindow.on('close', (event) => {
        // Don't quit the app, just hide the window
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.once('ready-to-show', () => {
        showWindow();
    });

    // Open DevTools in development
    // mainWindow.webContents.openDevTools();
}

function showWindow() {
    if (!mainWindow) return;

    mainWindow.show();
    mainWindow.focus();

    // Position window near the tray icon
    if (tray) {
        const trayBounds = tray.getBounds();
        const windowBounds = mainWindow.getBounds();

        const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
        const y = Math.round(trayBounds.y + trayBounds.height + 4);

        mainWindow.setPosition(x, y, false);
    }
}

// IPC handlers for timer updates from renderer
ipcMain.on('timer-update', (event, state) => {
    timerState = state;
    updateTrayTitle();
});

// IPC handler for settings sync from renderer
ipcMain.on('settings-sync', (event, settings) => {
    appSettings.focusDuration = settings.focusDuration / 60; // Convert seconds to minutes
    appSettings.theme = settings.theme;
    appSettings.sound = settings.sound;
    appSettings.autoStartRest = settings.autoStartRest;
    appSettings.autoStartFocus = settings.autoStartFocus;
    updateTrayMenu();
});

// IPC handlers for window control from renderer
ipcMain.on('request-show-window', () => {
    if (mainWindow) {
        showWindow();
    }
});

ipcMain.on('request-hide-window', () => {
    if (mainWindow) {
        mainWindow.hide();
    }
});

ipcMain.on('request-fullscreen', () => {
    if (mainWindow) {
        if (!mainWindow.isFullScreen()) {
            mainWindow.setFullScreen(true);
        }
    }
});

ipcMain.on('request-exit-fullscreen', () => {
    if (mainWindow) {
        if (mainWindow.isFullScreen()) {
            mainWindow.setFullScreen(false);
        }
    }
});

app.whenReady().then(() => {
    createTray();
    createWindow();
});

app.on('before-quit', () => {
    app.isQuitting = true;
});

app.on('window-all-closed', () => {
    // Don't quit on macOS when all windows are closed
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    } else {
        showWindow();
    }
});
