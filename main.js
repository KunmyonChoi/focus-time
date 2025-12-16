const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron');
const path = require('path');

let tray = null;
let mainWindow = null;
let timerState = {
    mode: 'FOCUS',
    timeLeft: 25 * 60,
    isRunning: false
};

function createTray() {
    // Create a simple template icon for the tray
    // In production, you'd want to use actual PNG icons
    const icon = nativeImage.createEmpty();

    tray = new Tray(icon);
    tray.setToolTip('Focus Timer');
    updateTrayTitle();

    tray.on('click', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                showWindow();
            }
        } else {
            createWindow();
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
                    checked: true,
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('set-focus-duration', 25);
                        }
                    }
                },
                {
                    label: '50 minutes',
                    type: 'radio',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('set-focus-duration', 50);
                        }
                    }
                },
                {
                    label: '90 minutes',
                    type: 'radio',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('set-focus-duration', 90);
                        }
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
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('set-theme', 'scenic');
                        }
                    }
                },
                {
                    label: 'Charcoal',
                    type: 'radio',
                    checked: true,
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('set-theme', 'charcoal');
                        }
                    }
                },
                {
                    label: 'Midnight',
                    type: 'radio',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('set-theme', 'midnight');
                        }
                    }
                },
                {
                    label: 'Sunrise',
                    type: 'radio',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('set-theme', 'sunrise');
                        }
                    }
                },
                {
                    label: 'Forest',
                    type: 'radio',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('set-theme', 'forest');
                        }
                    }
                },
                {
                    label: 'Berry',
                    type: 'radio',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('set-theme', 'berry');
                        }
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
                    checked: true,
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('set-sound', 'beep');
                        }
                    }
                },
                {
                    label: 'Alarm',
                    type: 'radio',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('set-sound', 'alarm');
                        }
                    }
                },
                {
                    label: 'Chime',
                    type: 'radio',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('set-sound', 'chime');
                        }
                    }
                },
                {
                    label: 'Mute',
                    type: 'radio',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.send('set-sound', 'mute');
                        }
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
                    click: (menuItem) => {
                        if (mainWindow) {
                            mainWindow.webContents.send('set-auto-start-rest', menuItem.checked);
                        }
                    }
                },
                {
                    label: 'Auto-start Focus',
                    type: 'checkbox',
                    click: (menuItem) => {
                        if (mainWindow) {
                            mainWindow.webContents.send('set-auto-start-focus', menuItem.checked);
                        }
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
