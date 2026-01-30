const { contextBridge, ipcRenderer, shell } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux',
  isElectron: true,

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  isMaximized: () => ipcRenderer.invoke('is-maximized'),

  // Open URL in system browser (for OAuth flows)
  openExternal: (url) => shell.openExternal(url),

  // File system operations (if needed)
  // openFile: () => ipcRenderer.invoke('open-file'),
  // saveFile: (data) => ipcRenderer.invoke('save-file', data),
});
