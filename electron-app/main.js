const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const http = require('http');

let mainWindow;
let tray;
let isQuitting = false;
const SERVER_PORT = 4323;


// Generate a tray icon programmatically (works without external files)
function createTrayIcon() {
  const iconPath = path.join(APP_DIR, 'forge-village-logo.png');
  if (fs.existsSync(iconPath)) {
    const img = nativeImage.createFromPath(iconPath);
    if (!img.isEmpty()) {
      if (process.platform === 'darwin') img.setTemplateImage(true);
      return img;
    }
  }
  const icnsPath = path.join(__dirname, 'icon.icns');
  if (fs.existsSync(icnsPath)) {
    const img = nativeImage.createFromPath(icnsPath);
    if (!img.isEmpty()) return img;
  }
  return createMinimalTrayIcon();
}

function createMinimalTrayIcon() {
  const tinyPng = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12P4zwBQAwEAf9peDY0AAAAASUVORK5CYII=';
  const img = nativeImage.createFromDataURL('data:image/png;base64,' + tinyPng);
  return img;
}

function setupTray() {
  const trayIcon = createTrayIcon();
  tray = new Tray(trayIcon);
  tray.setToolTip('Forge Village');

  tray.on('click', () => showMainWindow());
  tray.on('double-click', () => showMainWindow());
  updateTrayMenu();
}

function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Forge Village', click: () => showMainWindow() },
    { type: 'separator' },
    {
      label: 'Quit Forge Village',
      click: () => {
        isQuitting = true;
        killServer();
        app.quit();
      }
    }
  ]);
  tray.setContextMenu(contextMenu);
}

function showMainWindow() {
  if (!mainWindow) {
    createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
    if (mainWindow.isMinimized()) mainWindow.restore();
  }
  if (process.platform === 'darwin') app.dock.show();
}

function killServer() {
  try {
    const { execSync } = require('child_process');
    if (process.platform === 'darwin' || process.platform === 'linux') {
      try {
        const pid = execSync(`lsof -ti:${SERVER_PORT} 2>/dev/null`).toString().trim();
        if (pid) {
          process.kill(parseInt(pid), 'SIGTERM');
          console.log(`[Main] Killed server process PID: ${pid}`);
        }
      } catch (e) {
        console.log('[Main] No server process found on port');
      }
    } else {
      try {
        const output = execSync(`netstat -ano | findstr :${SERVER_PORT} | findstr LISTENING`).toString();
        const parts = output.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && parseInt(pid)) {
          process.kill(parseInt(pid));
          console.log(`[Main] Killed server process PID: ${pid}`);
        }
      } catch (e) {
        console.log('[Main] No server process found on Windows');
      }
    }
  } catch (e) {
    console.error('[Main] Error killing server:', e.message);
  }
}

// Determine the app directory (works in both dev and packaged mode)
function getAppDir() {
  if (process.resourcesPath) {
    const unpacked = path.join(process.resourcesPath, 'app');
    if (fs.existsSync(unpacked)) return unpacked;
  }
  return path.join(__dirname, '..', 'app');
}

const APP_DIR = getAppDir();
const SERVER_SCRIPT = path.join(APP_DIR, 'server-hybrid-final.js');

// Ensure data directories exist
function ensureDataDirs() {
  const userData = app.getPath('userData');
  const dirs = [
    path.join(userData, 'data'),
    path.join(userData, 'data', 'projects'),
    path.join(userData, 'assets'),
    path.join(userData, 'assets', 'uploads')
  ];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
  return userData;
}

// Wait for server to be ready by polling HTTP
function waitForServer(maxAttempts = 30, interval = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get(`http://127.0.0.1:${SERVER_PORT}/api/config`, (res) => {
        if (res.statusCode === 200) {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        } else {
          retry();
        }
      });
      req.on('error', () => {
        if (attempts >= maxAttempts) {
          reject(new Error('Server failed to start after timeout'));
        } else {
          retry();
        }
      });
      req.setTimeout(1000, () => { req.destroy(); retry(); });
    };
    const retry = () => setTimeout(check, interval);
    check();
  });
}

async function startServer() {
  const userDataDir = ensureDataDirs();

  // Write .env for the server
  const envContent = `PORT=${SERVER_PORT}
SKIP_AUTH=***
WORKSPACE_DIR=${userDataDir}
NODE_ENV=production
`;
  fs.writeFileSync(path.join(APP_DIR, '.env'), envContent);

  // Spawn the server using the Electron binary (bundles Node) to avoid system Node dependency
  const scriptPath = path.join(APP_DIR, 'server-hybrid-final.js');
  const logPath = path.join(userDataDir, 'server.log');
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });

  const env = {
    ...process.env,
    PORT: SERVER_PORT,
    NODE_ENV: 'production',
    WORKSPACE_DIR: userDataDir
    // SKIP_AUTH is read from .env file
  };

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: APP_DIR,
      detached: true,
      stdio: ['ignore', logStream, logStream],
      env: env
    });

    child.on('error', (err) => {
      console.error('[Main] Failed to start server process:', err);
      reject(err);
    });

    child.on('exit', (code) => {
      if (code !== 0) {
        console.error(`[Main] Server process exited with code ${code}`);
      }
    });

    child.unref();

    // Wait for server to be ready
    waitForServer()
      .then(() => {
        console.log(`[Main] Server is ready on port ${SERVER_PORT}`);
        resolve();
      })
      .catch(reject);

    // Timeout
    setTimeout(() => reject(new Error('Server startup timed out (15s)')), 15000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 950,
    minWidth: 1100,
    minHeight: 700,
    resizable: true,
    title: 'Forge Village',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: false
    },
    backgroundColor: '#090d18',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 }
  });

  mainWindow.loadURL(`http://127.0.0.1:${SERVER_PORT}`);

  mainWindow.on('show', () => {
    if (process.platform === 'darwin') app.dock.show();
  });
  mainWindow.on('hide', () => {
    if (process.platform === 'darwin') app.dock.hide();
  });
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (process.platform === 'darwin') app.dock.hide();
    }
  });
  mainWindow.on('closed', () => {
    if (!isQuitting) {
      // Recreate if not quitting (keep server alive)
    } else {
      mainWindow = null;
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.includes('127.0.0.1') && !url.includes('localhost')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();
  } catch (err) {
    console.error('Failed to start Forge Village:', err.message);
    dialog.showErrorBox('Forge Village Startup Error', `Could not start the local server:\n\n${err.message}`);
    app.quit();
  }

  // Setup tray icon
  setupTray();
});

app.on('window-all-closed', (event) => {
  // Don't quit — minimize to tray instead
  if (process.platform === 'darwin') {
    event.preventDefault();
  }
});

// Handle before-quit to prevent the tray from keeping app alive on quit
app.on('before-quit', () => {
  isQuitting = true;
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ============ IPC HANDLERS ============

ipcMain.handle('dialog:openFile', async (_, options) => {
  return dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    ...options
  });
});

ipcMain.handle('dialog:openFiles', async (_, options) => {
  return dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'ogg', 'aac', 'm4a'] },
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    ...options
  });
});

ipcMain.handle('dialog:openFolder', async (_, options) => {
  return dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'], ...options });
});

ipcMain.handle('dialog:saveFile', async (_, options) => {
  return dialog.showSaveDialog(mainWindow, {
    filters: [{ name: 'JSON', extensions: ['json'] }, { name: 'All Files', extensions: ['*'] }],
    ...options
  });
});

ipcMain.handle('fs:readFile', async (_, filePath) => {
  try {
    const data = await fs.promises.readFile(filePath);
    return { success: true, data: data.toString('base64') };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('fs:stat', async (_, filePath) => {
  try {
    const stat = await fs.promises.stat(filePath);
    return { success: true, stat: { size: stat.size, mtime: stat.mtimeMs } };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('shell:showItemInFolder', (_, filePath) => {
  shell.showItemInFolder(filePath);
  return true;
});

ipcMain.handle('shell:openPath', (_, targetPath) => shell.openPath(targetPath));

ipcMain.handle('app:getPath', (_, name) => app.getPath(name));

ipcMain.handle('app:getUserDataDir', () => ({
  userData: app.getPath('userData'),
  dataDir: path.join(app.getPath('userData'), 'data'),
  uploadsDir: path.join(app.getPath('userData'), 'assets', 'uploads')
}));
