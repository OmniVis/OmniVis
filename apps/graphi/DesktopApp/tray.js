/* eslint-disable @typescript-eslint/no-require-imports */
const { Tray, Menu, nativeImage, BrowserWindow } = require('electron');
const path = require('path');

let tray = null;

function createTray(app, createWindowFn) {
  // Load the icon
  const iconPath = path.join(__dirname, 'graphi-icon.png');
  let icon = nativeImage.createFromPath(iconPath);
  // Resize for tray (16x16 on Windows, 22x22 on Linux, 18x18 on macOS)
  icon = icon.resize({ width: 16, height: 16 });

  tray = new Tray(icon);
  tray.setToolTip('Graphi Desktop');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Graphi',
      click: () => {
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          const win = windows[0];
          if (win.isMinimized()) win.restore();
          win.show();
          win.focus();
        } else {
          createWindowFn();
        }
      }
    },
    {
      label: 'Quick New Diagram',
      click: () => {
        // Open a new window directly in the editor
        const win = new BrowserWindow({
          width: 900,
          height: 650,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          },
          autoHideMenuBar: true,
          icon: iconPath,
          title: 'Graphi - Quick Diagram'
        });

        // Load editor page directly
        const windows = BrowserWindow.getAllWindows();
        const mainWin = windows.find((w) => w !== win);
        if (mainWin) {
          // Get base URL from main window and navigate to /edit
          const currentUrl = mainWin.webContents.getURL();
          const baseUrl = currentUrl.split('/edit')[0].split('#')[0];
          win.loadURL(baseUrl + '/edit/');
        } else {
          createWindowFn();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Graphi',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);

  // Double-click on tray icon opens the app
  tray.on('double-click', () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const win = windows[0];
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    } else {
      createWindowFn();
    }
  });

  return tray;
}

function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

module.exports = { createTray, destroyTray };
