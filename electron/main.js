const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development';
const isMac = process.platform === 'darwin';

// App protocol for deep linking (OAuth callbacks)
const PROTOCOL = 'quizzerd';

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    // Use toolbar as title bar
    // macOS: hiddenInset keeps native traffic lights
    // Windows/Linux: frameless with custom controls in toolbar
    frame: isMac,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    trafficLightPosition: isMac ? { x: 18, y: 12 } : undefined,
    backgroundColor: '#09090b',
    show: false,
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app - start at welcome page for auth flow
  const url = isDev
    ? 'http://localhost:3000/welcome'
    : `file://${path.join(__dirname, '../out/welcome.html')}`;

  mainWindow.loadURL(url);

  // Handle OAuth and external links - open in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open all http(s) links in system browser
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Handle navigation - open OAuth providers in system browser
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow navigation to our app URLs
    const appUrl = isDev ? 'http://localhost:3000' : 'file://';
    if (url.startsWith(appUrl)) {
      return; // Allow
    }

    // OAuth callback URLs - allow them
    if (url.includes('/sso-callback') || url.includes('/sign-in') || url.includes('/sign-up')) {
      return; // Allow
    }

    // OAuth provider URLs - open in system browser
    const oauthProviders = [
      'accounts.google.com',
      'github.com/login',
      'discord.com/oauth',
      'clerk.com',
      'clerk.dev',
      'accounts.clerk',
    ];

    const isOAuth = oauthProviders.some(provider => url.includes(provider));
    if (isOAuth) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

// Register custom protocol for deep linking
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// Handle deep link on macOS
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (mainWindow) {
    // Convert deep link to http URL
    const httpUrl = url.replace(`${PROTOCOL}://`, isDev ? 'http://localhost:3000/' : '/');
    mainWindow.loadURL(httpUrl);
    mainWindow.focus();
  }
});

// Handle app lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle deep link on Windows/Linux (second instance)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    // Find the deep link URL in the command line args
    const deepLink = commandLine.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (deepLink && mainWindow) {
      const httpUrl = deepLink.replace(`${PROTOCOL}://`, isDev ? 'http://localhost:3000/' : '/');
      mainWindow.loadURL(httpUrl);
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// IPC handlers for window controls
ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('close-window', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});
