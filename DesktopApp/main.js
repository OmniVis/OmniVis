/* eslint-disable @typescript-eslint/no-require-imports */
const { app, BrowserWindow, ipcMain } = require('electron');
const serve = require('electron-serve');
const path = require('path');
const fs = require('fs');
const { createTray } = require('./tray');

// Determine if we are in development mode
const isDev = !app.isPackaged;

// Determine the path to the static files
let docsPath;
if (isDev) {
  docsPath = path.join(__dirname, '../docs');
} else {
  docsPath = path.join(__dirname, 'docs');
}

// Initialize the file server
const loadURL = serve({ directory: docsPath });

let mainWindow;
let pendingFilePath = null; // For file association

// --- File Association: capture file path from command line args ---
function getFileFromArgs(argv) {
  // Look for .graphi or .mermaid files in the arguments
  for (const arg of argv) {
    if (arg.endsWith('.graphi') || arg.endsWith('.mermaid') || arg.endsWith('.mmd')) {
      if (fs.existsSync(arg)) {
        return arg;
      }
    }
  }
  return null;
}

// Check launch args for file association
pendingFilePath = getFileFromArgs(process.argv);

// Prevent multiple instances — focus existing window or pass file to it
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    // When a second instance is launched (e.g. double-click on .graphi file)
    const filePath = getFileFromArgs(argv);
    if (filePath) {
      pendingFilePath = filePath;
      if (mainWindow) {
        sendFileToRenderer(filePath);
      }
    }
    // Focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function sendFileToRenderer(filePath) {
  if (mainWindow && filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      mainWindow.webContents.send('open-file', {
        path: filePath,
        content: content,
        name: path.basename(filePath)
      });
    } catch (err) {
      console.error('Failed to read file:', err);
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'graphi-icon.png')
  });

  // Open DevTools only in dev mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Load the application
  loadURL(mainWindow)
    .then(() => {
      // Once loaded, send any pending file
      if (pendingFilePath) {
        // Small delay to let the renderer initialize
        setTimeout(() => {
          sendFileToRenderer(pendingFilePath);
          pendingFilePath = null;
        }, 1500);
      }
    })
    .catch((err) => {
      console.error('Failed to load application:', err);
    });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  // Minimize to tray instead of closing (unless explicitly quitting)
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// --- IPC Handlers ---
ipcMain.handle('get-version', () => {
  return app.getVersion();
});

ipcMain.handle('check-for-updates', () => {
  try {
    const { checkForUpdatesManually } = require('./autoUpdater');
    checkForUpdatesManually();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// --- App lifecycle ---
app.on('ready', () => {
  createWindow();

  // Create system tray
  createTray(app, createWindow);

  // Initialize auto-updater (only in production)
  if (!isDev) {
    try {
      const { initAutoUpdater } = require('./autoUpdater');
      initAutoUpdater();
    } catch (err) {
      console.error('Auto-updater init failed:', err);
    }
  }
});

app.on('window-all-closed', function () {
  // On macOS, keep the app running in the dock
  // On other platforms, keep running in tray (don't quit)
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

// macOS: handle open-file event for file association
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (mainWindow) {
    sendFileToRenderer(filePath);
  } else {
    pendingFilePath = filePath;
  }
});

// Cleanup before quit
app.on('before-quit', () => {
  app.isQuitting = true;
});
