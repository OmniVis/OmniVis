/* eslint-disable @typescript-eslint/no-require-imports */
const { autoUpdater } = require('electron-updater');
const { dialog, BrowserWindow } = require('electron');

let updateCheckInProgress = false;

function initAutoUpdater() {
  // Configure auto-updater
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('🔍 Checking for updates...');
    updateCheckInProgress = true;
  });

  autoUpdater.on('update-available', (info) => {
    console.log('✅ Update available:', info.version);
    updateCheckInProgress = false;

    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (!mainWindow) return;

    dialog
      .showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (v${info.version}) of Graphi Desktop is available.`,
        detail: 'Would you like to download and install it now?',
        buttons: ['Download & Install', 'Later'],
        defaultId: 0,
        cancelId: 1
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('👍 App is up-to-date.');
    updateCheckInProgress = false;
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const msg = `Download speed: ${Math.round(progressObj.bytesPerSecond / 1024)} KB/s - ${Math.round(progressObj.percent)}%`;
    console.log(msg);

    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.setProgressBar(progressObj.percent / 100);
    }
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('📦 Update downloaded. Will install on restart.');

    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow) {
      mainWindow.setProgressBar(-1); // Remove progress bar
    }

    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'Update has been downloaded.',
        detail: 'The application will restart to apply the update.',
        buttons: ['Restart Now', 'Later']
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
    updateCheckInProgress = false;
  });

  // Check for updates after a short delay (don't block startup)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('Update check failed:', err);
    });
  }, 5000);
}

function checkForUpdatesManually() {
  if (updateCheckInProgress) return;
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('Manual update check failed:', err);
  });
}

module.exports = { initAutoUpdater, checkForUpdatesManually };
