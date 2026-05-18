/* eslint-disable @typescript-eslint/no-require-imports */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('graphiDesktop', {
  // App info
  getVersion: () => ipcRenderer.invoke('get-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  // File association — listen for files opened externally
  onFileOpened: (callback) => {
    ipcRenderer.on('open-file', (_event, fileData) => {
      callback(fileData);
    });
  },

  // Platform info
  platform: process.platform,
  isElectron: true
});
