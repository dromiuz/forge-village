const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, exec } = require('child_process');
const http = require('http');

let mainWindow;
let tray;
let isQuitting = false;
let isCreatingWindow = false;
let singletonLockFd = null;
const SERVER_PORT = 4323;
const SINGLETON_LOCK_PATH = path.join(os.tmpdir(), 'forge-village-electron.lock');

function logLaunch(message, details = '') {
  const suffix = details ? `: ${details}` : '';
  console.log(`[Main] ${message}${suffix}`);
}

function cleanupSingletonLock() {
  try {
    if (singletonLockFd !== null) {
      try { fs.closeSync(singletonLockFd); } catch (_) {}
      singletonLockFd = null;
    }
    if (fs.existsSync(SINGLETON_LOCK_PATH)) fs.unlinkSync(SINGLETON_LOCK_PATH);
  } catch (_) {}
}

function acquireSingletonLock() {
  const gotSingleInstanceLock = app.requestSingleInstanceLock();
  if (!gotSingleInstanceLock) {
    logLaunch('Duplicate instance detected via Electron lock; exiting');
    return false;
  }

  const pidIsAlive = (pid) => {
    try {
      return !!pid && process.kill(pid, 0);
    } catch (_) {
      return false;
    }
  };

  try {
    if (fs.existsSync(SINGLETON_LOCK_PATH)) {
      const raw = fs.readFileSync(SINGLETON_LOCK_PATH, 'utf8').trim().split(/\s+/)[0];
      const existingPid = parseInt(raw, 10);
      if (pidIsAlive(existingPid)) {
        logLaunch('Duplicate instance detected via filesystem lock; exiting', `pid=${existingPid}`);
        try {
          app.releaseSingleInstanceLock();
        } catch (_) {}
        return false;
      }
      try { fs.unlinkSync(SINGLETON_LOCK_PATH); } catch (_) {}
    }

    singletonLockFd = fs.openSync(SINGLETON_LOCK_PATH, 'wx');
    fs.writeFileSync(singletonLockFd, `${process.pid}\n${new Date().toISOString()}\n`);
  } catch (err) {
    logLaunch('Duplicate instance detected via filesystem lock; exiting', err.message);
    try {
      app.releaseSingleInstanceLock();
    } catch (_) {}
    return false;
  }

  return true;
}

if (!acquireSingletonLock()) {
  process.exit(0);
}


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
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  } else {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
  if (process.platform === 'darwin') app.dock.show();
}

let serverProcess = null;

function killServer() {
  try {
    if (serverProcess && !serverProcess.killed) {
      logLaunch('Stopping tracked server child', `pid=${serverProcess.pid || 'unknown'}`);
      try { serverProcess.kill('SIGTERM'); } catch (_) {}
      try { serverProcess.kill('SIGKILL'); } catch (_) {}
      serverProcess = null;
      return;
    }

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
    let done = false;
    let retryTimer = null;
    let startupTimer = null;

    const finish = (fn, value) => {
      if (done) return;
      done = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (startupTimer) clearTimeout(startupTimer);
      fn(value);
    };

    const retry = () => {
      if (done) return;
      retryTimer = setTimeout(check, interval);
    };

    const check = () => {
      if (done) return;
      attempts += 1;
      const req = http.get(`http://127.0.0.1:${SERVER_PORT}/api/config`, (res) => {
        if (done) return;
        if (res.statusCode === 200) {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => finish(resolve, data));
        } else if (attempts >= maxAttempts) {
          finish(reject, new Error(`Server failed to start after ${attempts} attempts (status ${res.statusCode})`));
        } else {
          retry();
        }
      });
      req.on('error', () => {
        if (attempts >= maxAttempts) {
          finish(reject, new Error('Server failed to start after timeout'));
        } else {
          retry();
        }
      });
      req.setTimeout(1000, () => {
        try { req.destroy(); } catch (_) {}
        if (attempts >= maxAttempts) {
          finish(reject, new Error('Server failed to start after timeout'));
        } else {
          retry();
        }
      });
    };

    startupTimer = setTimeout(() => finish(reject, new Error('Server startup timed out (15s)')), 15000);
    check();
  });
}

async function startServer() {
  const userDataDir = ensureDataDirs();

  const scriptPath = path.join(APP_DIR, 'server-hybrid-final.js');
  const logPath = path.join(userDataDir, 'server.log');
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    PORT: SERVER_PORT,
    NODE_ENV: 'production',
    WORKSPACE_DIR: userDataDir
  };

  logLaunch('Starting local server', `${scriptPath} on port ${SERVER_PORT}`);

  killServer();

  return new Promise((resolve, reject) => {
    const logFd = fs.openSync(logPath, 'a');
    const child = spawn(process.execPath, [scriptPath], {
      cwd: APP_DIR,
      detached: true,
      stdio: ['ignore', logFd, logFd],
      env
    });

    serverProcess = child;
    fs.closeSync(logFd);
    logLaunch('Spawned server child', `pid=${child.pid || 'unknown'}`);

    child.on('error', (err) => {
      console.error('[Main] Failed to start server process:', err);
      reject(err);
    });

    child.on('exit', (code, signal) => {
      if (code !== 0) {
        console.error(`[Main] Server process exited with code ${code}${signal ? ` signal ${signal}` : ''}`);
      }
    });

    child.unref();

    waitForServer()
      .then(() => {
        logLaunch('Server is ready', `port=${SERVER_PORT}`);
        resolve();
      })
      .catch(reject);

    setTimeout(() => reject(new Error('Server startup timed out (15s)')), 15000);
  });
}

function createWindow() {
  const existingWindow = BrowserWindow.getAllWindows()[0];
  if (existingWindow && !existingWindow.isDestroyed()) {
    mainWindow = existingWindow;
    logLaunch('createWindow skipped', 'main window already exists');
    return mainWindow;
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    logLaunch('createWindow skipped', 'main window already exists');
    return mainWindow;
  }

  if (isCreatingWindow) {
    logLaunch('createWindow skipped', 'window creation already in progress');
    return mainWindow;
  }

  isCreatingWindow = true;
  logLaunch('Creating main window');

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
  mainWindow.on('close', () => {
    logLaunch('main window close');
  });
  mainWindow.on('closed', () => {
    isCreatingWindow = false;
    mainWindow = null;
    if (!isQuitting) {
      logLaunch('main window closed while app stays alive');
    }
  });

  // Never allow renderer-driven popup windows. Any `target="_blank"` or
  // `window.open()` should be handled outside the Electron window to avoid
  // runaway window creation.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const isLocal = url.includes('127.0.0.1') || url.includes('localhost');
      if (!isLocal) {
        shell.openExternal(url);
      }
    } catch (_) {}
    return { action: 'deny' };
  });

  return mainWindow;
}

app.on('second-instance', () => {
  logLaunch('second-instance event received');
  showMainWindow();
});

app.whenReady().then(async () => {
  logLaunch('app.whenReady');
  try {
    await startServer();
    createWindow();
  } catch (err) {
    console.error('Failed to start Forge Village:', err.message);
    dialog.showErrorBox('Forge Village Startup Error', `Could not start the local server:\n\n${err.message}`);
    app.quit();
  }

  setupTray();
});

app.on('window-all-closed', (event) => {
  logLaunch('window-all-closed');
  if (process.platform === 'darwin') {
    event.preventDefault();
  }
});

app.on('will-quit', cleanupSingletonLock);
process.on('exit', cleanupSingletonLock);
process.on('SIGINT', () => {
  cleanupSingletonLock();
  process.exit(130);
});
process.on('SIGTERM', () => {
  cleanupSingletonLock();
  process.exit(143);
});

app.on('before-quit', () => {
  logLaunch('before-quit');
  isQuitting = true;
  killServer();
  cleanupSingletonLock();
});

app.on('activate', () => {
  logLaunch('activate');
  showMainWindow();
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
