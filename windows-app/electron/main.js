import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: true, // Lockdown: Kiosk mode by default
    frame: false,
    alwaysOnTop: true,
    kiosk: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the Vite dev server in development, else load built output
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // mainWindow.webContents.openDevTools(); // Uncomment for dev debugging
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Security: Block shortcuts that could exit lockdown
  mainWindow.on('focus', () => {
    globalShortcut.register('CommandOrControl+Esc', () => { console.log('Blocked Ctrl+Esc'); });
    globalShortcut.register('Alt+Tab', () => { console.log('Blocked Alt+Tab'); });
    globalShortcut.register('CommandOrControl+Shift+Esc', () => { console.log('Blocked TaskManager'); });
    globalShortcut.register('Alt+F4', () => { console.log('Blocked Alt+F4'); });
  });

  mainWindow.on('blur', () => {
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('web-contents-created', (e, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    event.preventDefault();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('quit-app', () => {
  app.quit();
});
