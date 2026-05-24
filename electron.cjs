const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: true,
    autoHideMenuBar: true,
    show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
    icon: path.join(__dirname, 'dist', 'app-icon.ico'),  
  });
  mainWindow.setMenu(null);
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    console.log('Loading Electron file:', indexPath);
    mainWindow.loadFile(indexPath);
  }

  const webContents = mainWindow.webContents;

  webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`Renderer console [${level}] ${sourceId}:${line} - ${message}`);
  });

  webContents.on('did-finish-load', () => {
    console.log('Electron did-finish-load');
    console.log('Electron URL on finish:', webContents.getURL());
    webContents.executeJavaScript(`
      console.log('renderer ping', window.electronDebug?.ping && window.electronDebug.ping());
      console.log('root innerHTML', document.getElementById('root')?.innerHTML);
      console.log('body innerHTML', document.body.innerHTML);
      console.log('document title', document.title);
    `).catch((error) => console.error('executeJavaScript error:', error));
  });

  webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error('Electron did-fail-load', errorCode, errorDescription, validatedURL, isMainFrame);
  });

  webContents.on('did-fail-provisional-load', (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error('Electron did-fail-provisional-load', errorCode, errorDescription, validatedURL, isMainFrame);
  });

  webContents.on('dom-ready', () => {
    console.log('Electron dom-ready');
  });

  webContents.on('crashed', () => {
    console.error('Electron renderer crashed');
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});