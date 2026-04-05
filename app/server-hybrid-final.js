// Forge Village Hybrid Server - MULTI-USER LOCAL MODE
// Full local workspace with user attribution and project management

import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import archiver from 'archiver';
import multer from 'multer';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = Number(process.env.PORT || 4323);
const WORKSPACE_ROOT = process.env.WORKSPACE_DIR || process.cwd();
const APP_DIR = __dirname; // Directory where server-hybrid-final.js lives
const PUBLIC_DIR = path.join(APP_DIR, 'public'); // Frontend files live in app/public
const ASSETS_DIR = path.join(WORKSPACE_ROOT, 'assets');
const AUDIO_DIR = path.join(ASSETS_DIR, 'audio');
const LYRICS_DIR = path.join(ASSETS_DIR, 'lyrics');
const ANALYSIS_DIR = path.join(AUDIO_DIR, 'analysis');
const UPLOADS_DIR = path.join(ASSETS_DIR, 'uploads');
const DATA_DIR = path.join(WORKSPACE_ROOT, 'data');
const MUSIC_WORKSPACE_PATH = path.join(DATA_DIR, 'music-workspace.json');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
const USERS_DIR = path.join(DATA_DIR, 'users');
const USER_PROJECTS_DIR = USERS_DIR; // Projects stored under data/users/{userId}/projects/

// Ensure all directories exist
ensureDir(ASSETS_DIR);
ensureDir(AUDIO_DIR);
ensureDir(LYRICS_DIR);
ensureDir(ANALYSIS_DIR);
ensureDir(UPLOADS_DIR);
ensureDir(DATA_DIR);
ensureDir(PROJECTS_DIR);
ensureDir(USERS_DIR);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sendJson(res, code, data) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(data, null, 2));
}

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve login page at root
app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});


// Serve static files
app.use(express.static(PUBLIC_DIR));
app.use('/assets', express.static(ASSETS_DIR));
app.use('/files/uploads', express.static(UPLOADS_DIR));

// DOWNLOADS — serve electron build packages
const DIST_DIR = path.join(__dirname, '..', 'electron-app', 'dist');
app.use('/downloads', express.static(DIST_DIR));

// USER MANAGEMENT FUNCTIONS
function getCurrentUser() {
  const userFile = path.join(USERS_DIR, 'current-user.json');
  try {
    if (fs.existsSync(userFile)) {
      const data = fs.readFileSync(userFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading current user:', error);
  }
  return null;
}

function setCurrentUser(username) {
  const userFile = path.join(USERS_DIR, 'current-user.json');
  const userData = {
    username: username,
    userId: createUserId(username),
    lastActive: Date.now()
  };
  const tmpPath = userFile + '.tmp.' + process.pid;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(userData, null, 2), 'utf8');
    fs.renameSync(tmpPath, userFile);
    return userData;
  } catch (error) {
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
    console.error('Error saving current user:', error);
    throw error;
  }
}

function createUserId(username) {
  // Simple hash-based ID creation
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// ─── PER-USER PROJECT / WORKSPACE HELPERS ──────────────────────────────
function getUserProjectsDir(userId) {
  const dir = path.join(USER_PROJECTS_DIR, userId, 'projects');
  ensureDir(dir);
  return dir;
}

function getUserWorkspacePath(userId, projectId) {
  return path.join(getUserProjectsDir(userId), `${projectId}.json`);
}

function getUserCurrentProject(userId) {
  const projectFile = path.join(USER_PROJECTS_DIR, userId, 'current-project.json');
  try {
    if (fs.existsSync(projectFile)) {
      const data = fs.readFileSync(projectFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading current project:', error);
  }
  return null;
}

function setUserCurrentProject(userId, projectId) {
  const projectFile = path.join(USER_PROJECTS_DIR, userId, 'current-project.json');
  const userDir = path.join(USER_PROJECTS_DIR, userId);
  ensureDir(userDir);
  const data = { userId, projectId, lastActive: Date.now() };
  const tmpPath = projectFile + '.tmp.' + process.pid;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpPath, projectFile);
    return data;
  } catch (error) {
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
    console.error('Error saving current project:', error);
    throw error;
  }
}

function getUserProjects(userId) {
  const projectsDir = getUserProjectsDir(userId);
  const projects = [];
  try {
    const files = fs.readdirSync(projectsDir);
    files.forEach(file => {
      if (file.endsWith('.json') && file !== 'current-project.json') {
        try {
          const wsPath = path.join(projectsDir, file);
          const stats = fs.statSync(wsPath);
          const ws = JSON.parse(fs.readFileSync(wsPath, 'utf8'));
          projects.push({
            id: file.replace('.json', ''),
            name: ws.project?.name || file.replace('.json', ''),
            artist: ws.project?.artist || '',
            lastModified: stats.mtimeMs,
            songCount: ws.songs ? ws.songs.length : 0
          });
        } catch (e) {
          console.error(`Error reading project file ${file}:`, e);
        }
      }
    });
  } catch (error) {
    // dir might not exist yet
    console.error('Error reading user projects:', error);
  }
  return projects;
}

function createUserProject(userId, username, name, artist) {
  const projectId = createId('proj');
  const wsPath = getUserWorkspacePath(userId, projectId);
  const workspace = createDefaultWorkspace();
  workspace.project.name = name;
  workspace.project.artist = artist || username;

  const tmpPath = wsPath + '.tmp.' + process.pid;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(workspace, null, 2), 'utf8');
    fs.renameSync(tmpPath, wsPath);
  } catch (error) {
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
    throw error;
  }
  setUserCurrentProject(userId, projectId);
  return { projectId, workspace };
}

function loadUserWorkspace(userId, projectId) {
  const wsPath = getUserWorkspacePath(userId, projectId);
  try {
    if (fs.existsSync(wsPath)) {
      const data = fs.readFileSync(wsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading user workspace:', error);
  }
  return createDefaultWorkspace();
}

function saveUserWorkspace(workspace, userId, projectId) {
  // ─── Input validation ───
  if (!workspace || typeof workspace !== 'object') {
    throw new Error('Invalid workspace: must be an object');
  }
  if (!Array.isArray(workspace.songs)) {
    throw new Error('Invalid workspace: songs must be an array');
  }

  const wsPath = getUserWorkspacePath(userId, projectId);
  const currentUser = getCurrentUser();
  workspace.updatedAt = Date.now();
  workspace.project.lastSavedAt = Date.now();
  workspace.project.lastModifiedBy = currentUser ? currentUser.username : 'Anonymous';
  workspace.project.lastModifiedById = userId || (currentUser ? currentUser.userId : null);

  const tmpPath = wsPath + '.tmp.' + process.pid;
  try {
    // ─── Atomic write: write to temp, then rename ───
    fs.writeFileSync(tmpPath, JSON.stringify(workspace, null, 2), 'utf8');
    fs.renameSync(tmpPath, wsPath);
    return workspace;
  } catch (error) {
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
    console.error('Error saving user workspace:', error);
    throw error;
  }
}

/** Returns the active workspace file path based on the current user's current project. Falls back to the shared MUSIC_WORKSPACE_PATH if no user/project is set. */
function getActiveWorkspacePath() {
  const currentUser = getCurrentUser();
  if (!currentUser) return MUSIC_WORKSPACE_PATH;
  const cp = getUserCurrentProject(currentUser.userId);
  if (!cp || !cp.projectId) return MUSIC_WORKSPACE_PATH;
  return getUserWorkspacePath(currentUser.userId, cp.projectId);
}

function getAllUsers() {
  try {
    const users = [];
    const userFiles = fs.readdirSync(USERS_DIR);
    userFiles.forEach(file => {
      if (file.endsWith('.json') && file !== 'current-user.json') {
        const userData = JSON.parse(fs.readFileSync(path.join(USERS_DIR, file), 'utf8'));
        users.push(userData);
      }
    });
    return users;
  } catch (error) {
    console.error('Error loading users:', error);
    return [];
  }
}

// WORKSPACE MANAGEMENT FUNCTIONS
function loadMusicWorkspace() {
  const wsPath = getActiveWorkspacePath();
  try {
    if (fs.existsSync(wsPath)) {
      const data = fs.readFileSync(wsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading workspace:', error);
  }
  return createDefaultWorkspace();
}

function createDefaultWorkspace() {
  return {
    updatedAt: Date.now(),
    project: {
      name: 'My Music Workspace',
      artist: 'Independent Artist',
      description: '',
      createdAt: Date.now(),
      lastSavedAt: Date.now()
    },
    notes: '',
    stages: ['Idea', 'Writing', 'Demo', 'Recording', 'Production', 'Mixing', 'Mastering', 'Ready to Release', 'Released'],
    songs: [],
    releaseChecklist: [],
    events: []
  };
}

function saveMusicWorkspace(workspace, userId = null, username = null) {
  // ─── Input validation ───
  if (!workspace || typeof workspace !== 'object') {
    throw new Error('Invalid workspace: must be an object');
  }
  if (!Array.isArray(workspace.songs)) {
    throw new Error('Invalid workspace: songs must be an array');
  }
  if (!workspace.project || typeof workspace.project !== 'object') {
    throw new Error('Invalid workspace: project must be an object');
  }

  const currentUser = getCurrentUser();
  const effectiveUserId = userId || (currentUser ? currentUser.userId : null);
  const effectiveUsername = username || (currentUser ? currentUser.username : 'Anonymous');
  
  workspace.updatedAt = Date.now();
  workspace.project.lastSavedAt = Date.now();
  workspace.project.lastModifiedBy = effectiveUsername;
  workspace.project.lastModifiedById = effectiveUserId;
  
  const targetPath = getActiveWorkspacePath();
  const tmpPath = targetPath + '.tmp.' + process.pid;

  try {
    // ─── Auto-backup before write (keep last 5) ───
    if (fs.existsSync(targetPath)) {
      const backupPath = `${targetPath}.backup.${Date.now()}`;
      fs.copyFileSync(targetPath, backupPath);
      
      // Clean old backups, keep newest 5
      const dir = path.dirname(targetPath);
      const basename = path.basename(targetPath);
      const backups = fs.readdirSync(dir)
        .filter(f => f.startsWith(basename + '.backup.'))
        .sort()
        .slice(0, -5);
      backups.forEach(f => {
        try { fs.unlinkSync(path.join(dir, f)); } catch (_) {}
      });
    }
    
    // ─── Atomic write: write to temp, then rename ───
    fs.writeFileSync(tmpPath, JSON.stringify(workspace, null, 2), 'utf8');
    fs.renameSync(tmpPath, targetPath);
    return workspace;
  } catch (error) {
    // Clean up temp file on failure
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
    console.error('Error saving workspace:', error);
    throw error;
  }
}

// Utility functions
function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
}

function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/^\.+/, '').replace(/\.+$/, '');
}

function sanitizeProjectName(name) {
  return sanitizeFileName(name).replace(/\s+/g, '-').toLowerCase();
}

function uniqueFilePath(dir, fileName) {
  let filePath = path.join(dir, fileName);
  let counter = 1;
  const ext = path.extname(fileName);
  const name = path.basename(fileName, ext);
  
  while (fs.existsSync(filePath)) {
    filePath = path.join(dir, `${name}-${counter}${ext}`);
    counter++;
  }
  return filePath;
}

function inferAssetKind({ name, type, fileName, mimeType }) {
  const lowerName = (name || '').toLowerCase();
  const lowerType = (type || '').toLowerCase();
  const lowerFileName = (fileName || '').toLowerCase();
  const lowerMimeType = (mimeType || '').toLowerCase();
  
  if (lowerMimeType.includes('audio') || lowerFileName.endsWith('.mp3') || lowerFileName.endsWith('.wav') || lowerFileName.endsWith('.flac')) {
    return 'audio';
  }
  if (lowerMimeType.includes('image') || lowerFileName.endsWith('.jpg') || lowerFileName.endsWith('.png') || lowerFileName.endsWith('.gif')) {
    return 'image';
  }
  if (lowerMimeType.includes('text') || lowerFileName.endsWith('.txt') || lowerFileName.endsWith('.md')) {
    return 'text';
  }
  if (lowerName.includes('mix') || lowerType.includes('mix')) {
    return 'mix';
  }
  if (lowerName.includes('master') || lowerType.includes('master')) {
    return 'master';
  }
  return 'asset';
}

function normalizeAssets(assets) {
  return assets.map(asset => ({
    ...asset,
    kind: asset.kind || inferAssetKind({ name: asset.name, type: asset.type, fileName: asset.fileName, mimeType: asset.mimeType })
  }));
}

function getSongById(workspace, songId) {
  return workspace.songs.find(song => song.id === songId);
}

// Add user attribution to any object
function addAttribution(obj, action = 'created') {
  const currentUser = getCurrentUser();
  const timestamp = Date.now();
  
  return {
    ...obj,
    _meta: {
      createdBy: currentUser ? currentUser.username : 'Anonymous',
      createdById: currentUser ? currentUser.userId : null,
      createdAt: timestamp,
      lastModifiedBy: currentUser ? currentUser.username : 'Anonymous', 
      lastModifiedById: currentUser ? currentUser.userId : null,
      lastModifiedAt: timestamp,
      action: action
    }
  };
}

// Update attribution on modification
function updateAttribution(obj, action = 'modified') {
  const currentUser = getCurrentUser();
  const timestamp = Date.now();
  
  const meta = obj._meta || {};
  return {
    ...obj,
    _meta: {
      ...meta,
      lastModifiedBy: currentUser ? currentUser.username : 'Anonymous',
      lastModifiedById: currentUser ? currentUser.userId : null,
      lastModifiedAt: timestamp,
      action: action
    }
  };
}

// LOCAL MODE ROUTES
// Local routes (always active)

  // Status endpoint
  app.get('/api/status', (req, res) => {
    sendJson(res, 200, {
      ok: true,
      message: 'Forge Village Multi-User Local Mode',
      outputs: {
        assetsDir: '/assets',
        uploadsDir: 'assets/uploads'
      }
    });
  });

  // Get current user
  app.get('/api/user/current', (req, res) => {
    const currentUser = getCurrentUser();
    sendJson(res, 200, currentUser || { anonymous: true });
  });

  // Set current user — also creates a default project if none exist
  app.post('/api/user/set', (req, res) => {
    try {
      const { username } = req.body;
      if (!username || typeof username !== 'string') {
        return sendJson(res, 400, { error: 'Valid username required' });
      }
      
      const user = setCurrentUser(username.trim());
      
      // Create a default project if user has no projects
      const projects = getUserProjects(user.userId);
      if (projects.length === 0) {
        const proj = createUserProject(user.userId, user.username, `${user.username}'s Workspace`, user.username);
        return sendJson(res, 200, { ...user, projectId: proj.projectId, hasProjects: false });
      }
      
      sendJson(res, 200, { ...user, hasProjects: true });
    } catch (error) {
      sendJson(res, 500, { error: 'Failed to set user' });
    }
  });

  // ─── PROJECT MANAGEMENT ENDPOINTS ────────────────────────────────────
  
  // GET /api/user/projects?userId=XXX
  app.get('/api/user/projects', (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) return sendJson(res, 400, { error: 'userId required' });
      const projects = getUserProjects(userId);
      sendJson(res, 200, projects);
    } catch (error) {
      sendJson(res, 500, { error: 'Failed to load projects' });
    }
  });

  // POST /api/user/create-project
  app.post('/api/user/create-project', (req, res) => {
    try {
      const { userId, username, name, artist } = req.body;
      if (!userId || !name) {
        return sendJson(res, 400, { error: 'userId and name required' });
      }
      const proj = createUserProject(userId, username || 'Anonymous', name, artist);
      sendJson(res, 200, { projectId: proj.projectId, success: true, workspace: proj.workspace });
    } catch (error) {
      console.error('Error creating project:', error);
      sendJson(res, 500, { error: 'Failed to create project' });
    }
  });

  // POST /api/user/select-project
  app.post('/api/user/select-project', (req, res) => {
    try {
      const { userId, projectId } = req.body;
      if (!userId || !projectId) {
        return sendJson(res, 400, { error: 'userId and projectId required' });
      }
      setUserCurrentProject(userId, projectId);
      sendJson(res, 200, { success: true });
    } catch (error) {
      sendJson(res, 500, { error: 'Failed to select project' });
    }
  });

  // Get all users
  app.get('/api/users', (req, res) => {
    try {
      const users = getAllUsers();
      sendJson(res, 200, users);
    } catch (error) {
      sendJson(res, 500, { error: 'Failed to load users' });
    }
  });

  // Config endpoint
  app.get('/api/config', (req, res) => {
    sendJson(res, 200, {
      mode: 'local',
      message: 'Forge Village Local'
    });
  });

  // Get workspace data
  app.get('/api/workspace-data', (req, res) => {
    try {
      const workspace = loadMusicWorkspace();
      sendJson(res, 200, workspace);
    } catch (error) {
      sendJson(res, 500, { error: 'Failed to load workspace' });
    }
  });

  // Summary endpoint - returns topSong, all songs summary, and stats for the UI
  app.get('/api/summary', (req, res) => {
    try {
      const workspace = loadMusicWorkspace();
      const songs = workspace.songs || [];

      // Top song: highest progress, or first song
      let topSong = null;
      if (songs.length > 0) {
        topSong = songs.reduce((best, s) => {
          const p = s.progress || 0;
          const bp = best.progress || 0;
          return p > bp ? s : best;
        }, songs[0]);
      }

      // Per-song summary - include full stats for each song
      const songSummaries = songs.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        stage: s.stage,
        progress: s.progress || 0,
        assetCount: (s.assets || []).length,
        hasActiveReview: !!s.activeReviewAssetId,
        checklistDone: (s.checklist || []).filter(c => c.done).length,
        checklistTotal: (s.checklist || []).length,
        trackingDone: (s.trackingBoard || []).filter(t => t.status === 'done').length,
        trackingTotal: (s.trackingBoard || []).length,
        markerCount: (s.waveformMarkers || []).length,
        stats: buildSongStats(s, workspace.stages || [])
      }));

      sendJson(res, 200, {
        songs: songSummaries,
        topSong: topSong ? {
          id: topSong.id,
          title: topSong.title,
          artist: topSong.artist,
          stage: topSong.stage,
          progress: topSong.progress || 0,
          assetCount: (topSong.assets || []).length,
          nextStep: topSong.nextStep || '',
          checklist: topSong.checklist || [],
          trackingBoard: topSong.trackingBoard || [],
          stats: buildSongStats(topSong, workspace.stages || [])
        } : null,
        totalSongs: songs.length,
        totalAssets: songs.reduce((sum, s) => sum + (s.assets || []).length, 0)
      });
    } catch (error) {
      console.error('Summary error:', error);
      sendJson(res, 500, { error: 'Failed to build summary', songs: [], topSong: null });
    }
  });

  function buildSongStats(song, stages) {
    const checklists = song.checklist || [];
    const tracking = song.trackingBoard || [];
    const done = checklists.filter(c => c.done).length;
    const total = checklists.length;
    const missing = [];

    const statusMap = {
      'Idea': 'Early stage',
      'Writing': 'Writing',
      'Demo': 'Demo phase',
      'Recording': 'Recording',
      'Production': 'Production',
      'Mixing': 'Mixing',
      'Mastering': 'Mastering',
      'Ready to Release': 'Almost there',
      'Released': 'Released'
    };

    // Check for missing common items
    const hasLyrics = (song.lyrics || '').trim().length > 0;
    const hasArtwork = (song.assets || []).some(a => (a.kind === 'artwork' || a.type === 'artwork'));
    const hasAudio = (song.assets || []).some(a => a.mimeType && a.mimeType.startsWith('audio/'));
    const trackingDone = tracking.filter(t => t.status === 'done').length;

    if (!hasLyrics && song.stage !== 'Idea') missing.push('Lyrics');
    if (!hasArtwork) missing.push('Artwork');
    if (!hasAudio) missing.push('Audio file');

    return {
      status: statusMap[song.stage] || song.stage || 'Unknown',
      checklistDone: done,
      checklistTotal: total,
      trackingDone: trackingDone,
      trackingTotal: tracking.length,
      missing: missing,
      readiness: total > 0 ? Math.round((done / total) * 100) : 0
    };
  }

  // Save workspace data with user attribution
  app.post('/api/workspace-data', (req, res) => {
    try {
      const workspace = req.body;
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, saved);
    } catch (error) {
      sendJson(res, 500, { error: 'Failed to save workspace' });
    }
  });

  // Save project metadata (compatibility endpoint)
  app.post('/api/project/meta', (req, res) => {
    try {
      const updates = req.body;
      const workspace = loadMusicWorkspace();
      
      if (updates.name) workspace.project.name = updates.name;
      if (updates.artist) workspace.project.artist = updates.artist;
      if (updates.description) workspace.notes = updates.description;
      
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, workspace: saved });
    } catch (error) {
      sendJson(res, 500, { error: 'Failed to save project metadata' });
    }
  });

  // Song checklist - create new task
  app.post('/api/workspace-data/song-checklist', (req, res) => {
    try {
      const { songId, text } = req.body;
      if (!songId || !text) return sendJson(res, 400, { error: 'songId and text required' });
      const workspace = loadMusicWorkspace();
      const song = getSongById(workspace, songId);
      if (!song) return sendJson(res, 404, { error: 'Song not found' });
      if (!song.checklist) song.checklist = [];
      song.checklist.push({ id: 'task_' + Date.now(), text, done: false });
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, workspace: saved });
    } catch (error) {
      console.error('Create song-checklist error:', error);
      sendJson(res, 500, { error: 'Failed to create checklist item' });
    }
  });

  // Song checklist - toggle done (compatibility)
  app.patch('/api/workspace-data/song-checklist/:songId', (req, res) => {
    try {
      const { songId } = req.params;
      const { id, done } = req.body;
      const workspace = loadMusicWorkspace();
      
      const song = getSongById(workspace, songId);
      if (!song) {
        return sendJson(res, 404, { error: 'Song not found' });
      }
      
      if (!song.checklist) song.checklist = [];
      
      const itemIndex = song.checklist.findIndex(item => item.id === id);
      if (itemIndex !== -1) {
        song.checklist[itemIndex].done = Boolean(done);
      } else {
        song.checklist.push({ id, text: '', done: Boolean(done) });
      }
      
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, workspace: saved });
    } catch (error) {
      sendJson(res, 500, { error: 'Failed to update checklist' });
    }
  });

  // Delete song endpoint
  app.delete('/api/workspace-data/song/:songId', (req, res) => {
    try {
      const { songId } = req.params;
      const workspace = loadMusicWorkspace();
      
      const songIndex = workspace.songs.findIndex(s => s.id === songId);
      if (songIndex === -1) {
        return sendJson(res, 404, { error: 'Song not found' });
      }
      
      workspace.songs.splice(songIndex, 1);
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, workspace: saved });
    } catch (error) {
      sendJson(res, 500, { error: 'Failed to delete song' });
    }
  });

  // Delete asset endpoint (searches all songs)
  app.delete('/api/workspace-data/asset/:assetId', (req, res) => {
    try {
      const { assetId } = req.params;
      const workspace = loadMusicWorkspace();
      
      let assetFound = false;
      for (const song of workspace.songs) {
        const assetIndex = (song.assets || []).findIndex(a => a.id === assetId);
        if (assetIndex !== -1) {
          song.assets.splice(assetIndex, 1);
          assetFound = true;
          break;
        }
      }
      
      if (!assetFound) {
        return sendJson(res, 404, { error: 'Asset not found' });
      }
      
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, workspace: saved });
    } catch (error) {
      sendJson(res, 500, { error: 'Failed to delete asset' });
    }
  });

  // Delete song asset by id with songId (used by frontend delete-asset)
  app.delete('/api/workspace-data/song-asset/:id', (req, res) => {
    try {
      const { id } = req.params;
      const songId = String(req.query.songId || '').trim();
      const workspace = loadMusicWorkspace();
      const song = getSongById(workspace, songId);
      if (!song) return sendJson(res, 404, { error: 'Song not found.' });
      song.assets = (song.assets || []).filter(item => item.id !== id);
      if (song.activeReviewAssetId === id) song.activeReviewAssetId = '';
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, workspace: saved });
    } catch (error) {
      console.error('Delete song-asset error:', error);
      sendJson(res, 500, { error: 'Failed to delete asset' });
    }
  });

  // Delete song checklist item
  app.delete('/api/workspace-data/song-checklist/:id', (req, res) => {
    try {
      const { id } = req.params;
      const songId = String(req.query.songId || '').trim();
      const workspace = loadMusicWorkspace();
      const song = getSongById(workspace, songId);
      if (!song) return sendJson(res, 404, { error: 'Song not found.' });
      song.checklist = (song.checklist || []).filter(item => item.id !== id);
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, workspace: saved });
    } catch (error) {
      console.error('Delete song-checklist error:', error);
      sendJson(res, 500, { error: 'Failed to delete checklist item' });
    }
  });

  // Delete song note
  app.delete('/api/workspace-data/song-note/:id', (req, res) => {
    try {
      const { id } = req.params;
      const songId = String(req.query.songId || '').trim();
      const workspace = loadMusicWorkspace();
      const song = getSongById(workspace, songId);
      if (!song) return sendJson(res, 404, { error: 'Song not found.' });
      song.noteEntries = (song.noteEntries || []).filter(item => item.id !== id);
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, workspace: saved });
    } catch (error) {
      console.error('Delete song-note error:', error);
      sendJson(res, 500, { error: 'Failed to delete note' });
    }
  });

  // Update song note (edit)
  app.patch('/api/workspace-data/song-note/:id', (req, res) => {
    try {
      const { id } = req.params;
      const songId = String(req.body.songId || '').trim();
      const { title, body, author } = req.body;
      const workspace = loadMusicWorkspace();
      const song = getSongById(workspace, songId);
      if (!song) return sendJson(res, 404, { error: 'Song not found.' });
      const note = (song.noteEntries || []).find(item => item.id === id);
      if (!note) return sendJson(res, 404, { error: 'Note not found.' });
      if (title !== undefined) note.title = title;
      if (body !== undefined) note.body = body;
      if (author !== undefined) note.author = author;
      note.updatedAt = new Date().toISOString();
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, workspace: saved });
    } catch (error) {
      console.error('Update song-note error:', error);
      sendJson(res, 500, { error: 'Failed to update note' });
    }
  });

  // Delete song tracking item
  app.delete('/api/workspace-data/song-tracking-item/:id', (req, res) => {
    try {
      const { id } = req.params;
      const songId = String(req.query.songId || '').trim();
      const workspace = loadMusicWorkspace();
      const song = getSongById(workspace, songId);
      if (!song) return sendJson(res, 404, { error: 'Song not found.' });
      song.trackingBoard = (song.trackingBoard || []).filter(item => item.id !== id);
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, workspace: saved });
    } catch (error) {
      console.error('Delete song-tracking-item error:', error);
      sendJson(res, 500, { error: 'Failed to delete tracking item' });
    }
  });

  // ─── TRACKING ITEM CRUD ──────────────────────────────────────
  
  // Create tracking item
  app.post('/api/workspace-data/song-tracking-item', (req, res) => {
    try {
      const body = req.body;
      const songId = String(body.songId || '').trim();
      if (!songId) return sendJson(res, 400, { error: 'songId required' });
      const workspace = loadMusicWorkspace();
      const song = getSongById(workspace, songId);
      if (!song) return sendJson(res, 404, { error: 'Song not found.' });
      if (!Array.isArray(song.trackingBoard)) song.trackingBoard = [];
      
      const item = addAttribution({
        id: createId('track'),
        section: String(body.section || '').trim(),
        instrument: String(body.instrument || '').trim(),
        part: String(body.part || '').trim(),
        status: String(body.status || 'needed').trim(),
        priority: String(body.priority || 'normal').trim(),
        notes: String(body.notes || '').trim()
      }, 'created');
      
      song.trackingBoard.push(item);
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, item, workspace: saved });
    } catch (error) {
      console.error('Create tracking-item error:', error);
      sendJson(res, 500, { error: 'Failed to create tracking item' });
    }
  });

  // Update tracking item
  app.patch('/api/workspace-data/song-tracking-item/:id', (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body;
      const songId = String(body.songId || '').trim();
      if (!songId) return sendJson(res, 400, { error: 'songId required' });
      const workspace = loadMusicWorkspace();
      const song = getSongById(workspace, songId);
      if (!song) return sendJson(res, 404, { error: 'Song not found.' });
      const items = Array.isArray(song.trackingBoard) ? song.trackingBoard : [];
      const item = items.find(t => String(t.id) === String(id));
      if (!item) return sendJson(res, 404, { error: 'Tracking item not found.' });
      
      if (body.status !== undefined) item.status = String(body.status).trim();
      if (body.instrument !== undefined) item.instrument = String(body.instrument).trim();
      if (body.part !== undefined) item.part = String(body.part).trim();
      if (body.section !== undefined) item.section = String(body.section).trim();
      if (body.priority !== undefined) item.priority = String(body.priority).trim();
      if (body.notes !== undefined) item.notes = String(body.notes).trim();
      
      item._meta = item._meta || {};
      item._meta.lastModifiedAt = Date.now();
      item._meta.lastModifiedBy = getCurrentUser()?.username || 'Unknown';
      
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, item, workspace: saved });
    } catch (error) {
      console.error('Update tracking-item error:', error);
      sendJson(res, 500, { error: 'Failed to update tracking item' });
    }
  });

  // Create song marker (POST and PATCH were missing!)
  app.post('/api/workspace-data/song-marker', (req, res) => {
    try {
      const body = req.body;
      const songId = String(body.songId || '').trim();
      const workspace = loadMusicWorkspace();
      const song = getSongById(workspace, songId);
      if (!song) return sendJson(res, 404, { error: 'Song not found.' });
      const marker = {
        id: createId('marker'),
        time: Math.max(0, Number(body.time || 0)),
        label: String(body.label || '').trim(),
        comment: String(body.comment || '').trim(),
        color: String(body.color || 'purple').trim(),
        createdAt: Date.now()
      };
      if (!marker.label && !marker.comment) return sendJson(res, 400, { error: 'Marker needs a label or comment.' });
      song.waveformMarkers = Array.isArray(song.waveformMarkers) ? song.waveformMarkers : [];
      song.waveformMarkers.push(marker);
      song.waveformMarkers.sort((a, b) => a.time - b.time);
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, marker, workspace: saved });
    } catch (error) {
      console.error('Create song-marker error:', error);
      sendJson(res, 500, { error: 'Failed to create marker' });
    }
  });

  // Update song marker
  app.patch('/api/workspace-data/song-marker/:id', (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body;
      const songId = String(body.songId || '').trim();
      const workspace = loadMusicWorkspace();
      const song = getSongById(workspace, songId);
      if (!song) return sendJson(res, 404, { error: 'Song not found.' });
      const markers = Array.isArray(song.waveformMarkers) ? song.waveformMarkers : [];
      const marker = markers.find(m => String(m.id) === String(id));
      if (!marker) return sendJson(res, 404, { error: 'Marker not found.' });
      if (body.time !== undefined) marker.time = Math.max(0, Number(body.time));
      if (body.label !== undefined) marker.label = String(body.label).trim();
      if (body.comment !== undefined) marker.comment = String(body.comment).trim();
      if (body.color !== undefined) marker.color = String(body.color).trim();
      song.waveformMarkers = markers;
      song.waveformMarkers.sort((a, b) => a.time - b.time);
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, marker, workspace: saved });
    } catch (error) {
      console.error('Update song-marker error:', error);
      sendJson(res, 500, { error: 'Failed to update marker' });
    }
  });

  // Delete song marker
  app.delete('/api/workspace-data/song-marker/:id', (req, res) => {
    try {
      const { id } = req.params;
      const songId = String(req.query.songId || '').trim();
      const workspace = loadMusicWorkspace();
      const song = getSongById(workspace, songId);
      if (!song) return sendJson(res, 404, { error: 'Song not found.' });
      song.waveformMarkers = (song.waveformMarkers || []).filter(item => item.id !== id);
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, workspace: saved });
    } catch (error) {
      console.error('Delete song-marker error:', error);
      sendJson(res, 500, { error: 'Failed to delete marker' });
    }
  });

  // ─── EVENT CRUD ──────────────────────────────────────────────
  
  // Create event
  app.post('/api/workspace-data/event', (req, res) => {
    try {
      const eventData = req.body;
      const workspace = loadMusicWorkspace();
      
      const newEvent = addAttribution({
        id: createId('event'),
        title: eventData.title || 'Untitled Event',
        type: eventData.type || 'general',
        date: eventData.date || '',
        link: eventData.link || '',
        notes: eventData.notes || ''
      }, 'created');
      
      workspace.events.push(newEvent);
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, event: newEvent, workspace: saved });
    } catch (error) {
      console.error('Create event error:', error);
      sendJson(res, 500, { error: 'Failed to create event' });
    }
  });

  // Delete event
  app.delete('/api/workspace-data/event/:id', (req, res) => {
    try {
      const { id } = req.params;
      const workspace = loadMusicWorkspace();
      workspace.events = workspace.events.filter(item => item.id !== id);
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, workspace: saved });
    } catch (error) {
      console.error('Delete event error:', error);
      sendJson(res, 500, { error: 'Failed to delete event' });
    }
  });

  // Create new song with attribution
  app.post('/api/workspace-data/song', (req, res) => {
    try {
      const songData = req.body;
      const workspace = loadMusicWorkspace();
      
      const newSong = addAttribution({
        id: createId('song'),
        title: songData.title || 'Untitled Song',
        artist: songData.artist || workspace.project.artist,
        stage: songData.stage || 'Idea',
        progress: songData.progress || 0,
        notes: songData.notes || '',
        lyrics: songData.lyrics || '',
        about: songData.about || '',
        emotion: songData.emotion || '',
        visualLane: songData.visualLane || '',
        unresolved: songData.unresolved || '',
        whyMatters: songData.whyMatters || '',
        releaseDate: songData.releaseDate || '',
        checklist: [],
        noteEntries: [],
        trackingBoard: [],
        waveformMarkers: [],
        assets: []
      }, 'created');
      
      workspace.songs.push(newSong);
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, song: newSong, workspace: saved });
    } catch (error) {
      console.error('Create song error:', error);
      sendJson(res, 500, { error: 'Failed to create song' });
    }
  });

  // Update song with attribution
  app.put('/api/workspace-data/song/:songId', (req, res) => {
    try {
      const { songId } = req.params;
      const updates = req.body;
      const workspace = loadMusicWorkspace();
      
      const songIndex = workspace.songs.findIndex(s => s.id === songId);
      if (songIndex === -1) {
        return sendJson(res, 404, { error: 'Song not found' });
      }
      
      const updatedSong = updateAttribution({
        ...workspace.songs[songIndex],
        ...updates,
        updatedAt: Date.now()
      }, 'updated');
      
      workspace.songs[songIndex] = updatedSong;
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, song: updatedSong, workspace: saved });
    } catch (error) {
      console.error('Update song error:', error);
      sendJson(res, 500, { error: 'Failed to update song' });
    }
  });

  // FILE UPLOAD ENDPOINT with user attribution
  app.post('/api/workspace-data/song-asset-upload', (req, res) => {
    try {
      const body = req.body;
      const songId = String(body.songId || '').trim();
      const name = String(body.name || '').trim();
      const contentBase64 = String(body.contentBase64 || '').trim();
      
      if (!songId || !name || !contentBase64) {
        return sendJson(res, 400, { error: 'songId, name, and file content are required.' });
      }
      
      const workspace = loadMusicWorkspace();
      const song = getSongById(workspace, songId);
      if (!song) {
        return sendJson(res, 404, { error: 'Song not found.' });
      }

      const fileName = sanitizeFileName(body.fileName || name);
      const songFolder = path.join(UPLOADS_DIR, sanitizeProjectName(song.title || songId));
      ensureDir(songFolder);
      const filePath = uniqueFilePath(songFolder, fileName);
      const buffer = Buffer.from(contentBase64, 'base64');
      fs.writeFileSync(filePath, buffer);

      const asset = addAttribution({
        id: createId('asset'),
        name,
        type: String(body.type || '').trim(),
        status: String(body.status || 'ready').trim(),
        notes: String(body.notes || '').trim(),
        fileName: path.basename(filePath),
        filePath: path.relative(WORKSPACE_ROOT, filePath),
        fileUrl: `/files/uploads/${path.relative(UPLOADS_DIR, filePath).split(path.sep).map(encodeURIComponent).join('/')}`,
        mimeType: String(body.mimeType || '').trim(),
        size: buffer.length,
        kind: String(body.kind || inferAssetKind({ name, type: body.type, fileName: path.basename(filePath), mimeType: body.mimeType })).trim(),
        isActiveReview: Boolean(body.isActiveReview)
      }, 'uploaded');

      song.assets = normalizeAssets([...(song.assets || []), asset]);
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, asset, workspace: saved, song: getSongById(saved, songId) });
    } catch (error) {
      console.error('Upload error:', error);
      sendJson(res, 500, { error: error.message || 'Unable to upload asset.' });
    }
  });

  // ─────────────────────────────────────────────
  // FILE MANAGEMENT API (multipart uploads, browse, download, delete)
  // ─────────────────────────────────────────────

  // Multer storage: files go to assets/uploads/{song-title}/
  const fileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      const body = req.body || {};
      const songId = String(body.songId || '').trim();
      const songTitle = String(body.songTitle || 'uncategorized').trim();
      const safeFolder = sanitizeProjectName(songTitle || songId);
      const songFolder = path.join(UPLOADS_DIR, safeFolder);
      ensureDir(songFolder);
      cb(null, songFolder);
    },
    filename: function (req, file, cb) {
      const sanitized = sanitizeFileName(file.originalname);
      const ext = path.extname(sanitized);
      const base = path.basename(sanitized, ext);
      const songId = String(req.body?.songId || '').trim();
      const songTitle = String(req.body?.songTitle || 'uncategorized').trim();
      const safeFolder = sanitizeProjectName(songTitle || songId);
      const dest = path.join(UPLOADS_DIR, safeFolder);
      const uniqueName = path.basename(uniqueFilePath(dest, sanitized));
      cb(null, uniqueName);
    }
  });

  const upload = multer({
    storage: fileStorage,
    fileFilter: function (req, file, cb) {
      cb(null, true);
    },
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
  });

  /**
   * GET /api/files
   * Lists all uploaded files across all song folders.
   */
  app.get('/api/files', (req, res) => {
    try {
      const files = [];
      if (fs.existsSync(UPLOADS_DIR)) {
        const songFolders = fs.readdirSync(UPLOADS_DIR);
        for (const songFolder of songFolders) {
          const folderPath = path.join(UPLOADS_DIR, songFolder);
          if (!fs.statSync(folderPath).isDirectory()) continue;
          const entries = fs.readdirSync(folderPath);
          for (const entryName of entries) {
            const full = path.join(folderPath, entryName);
            const stat = fs.statSync(full);
            if (stat.isFile() || stat.isSymbolicLink()) {
              const mimeType = guessMimeType(entryName);
              files.push({
                songFolder,
                fileName: entryName,
                fileUrl: `/files/uploads/${encodeURIComponent(songFolder)}/${encodeURIComponent(entryName)}`,
                downloadUrl: `/api/files/download/${encodeURIComponent(songFolder)}/${encodeURIComponent(entryName)}`,
                size: stat.size,
                sizeHuman: formatFileSize(stat.size),
                mimeType,
                kind: inferAssetKind({ name: entryName, mimeType }),
                modifiedAt: stat.mtimeMs,
                createdAt: stat.birthtimeMs
              });
            }
          }
        }
      }
      files.sort((a, b) => b.modifiedAt - a.modifiedAt); // newest first
      sendJson(res, 200, { ok: true, files, total: files.length });
    } catch (error) {
      console.error('Error listing files:', error);
      sendJson(res, 500, { error: 'Failed to list files: ' + error.message });
    }
  });

  /**
   * POST /api/files/upload
   * Multipart file upload. Fields: songId, songTitle, file
   * Returns the uploaded file metadata.
   */
  app.post('/api/files/upload', upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return sendJson(res, 400, { error: 'No file uploaded' });
      }

      const body = req.body || {};
      const songId = String(body.songId || 'uncategorized').trim();
      const songTitle = String(body.songTitle || '').trim();
      const safeFolder = sanitizeProjectName(songTitle || songId);
      const fileUrl = `/files/uploads/${encodeURIComponent(safeFolder)}/${encodeURIComponent(req.file.filename)}`;
      const downloadUrl = `/api/files/download/${encodeURIComponent(safeFolder)}/${encodeURIComponent(req.file.filename)}`;

      const fileStat = fs.statSync(req.file.path);

      const fn = path.basename(req.file.path);
      sendJson(res, 200, {
        ok: true,
        file: {
          songFolder: safeFolder,
          fileName: fn,
          originalName: req.file.originalname,
          fileUrl: `/files/uploads/${encodeURIComponent(safeFolder)}/${encodeURIComponent(fn)}`,
          downloadUrl: `/api/files/download/${encodeURIComponent(safeFolder)}/${encodeURIComponent(fn)}`,
          size: fileStat.size,
          sizeHuman: formatFileSize(fileStat.size),
          mimeType: req.file.mimetype,
          kind: inferAssetKind({ name: fn, mimeType: req.file.mimetype })
        }
      });
    } catch (error) {
      console.error('Multipart upload error:', error);
      sendJson(res, 500, { error: 'Upload failed: ' + error.message });
    }
  });

  /**
   * GET /api/files/download/:songId/:fileName
   * Streams a file to the browser.
   */
  app.get('/api/files/download/:songId/:fileName', (req, res) => {
    try {
      const songId = decodeURIComponent(req.params.songId);
      const fileName = decodeURIComponent(req.params.fileName);
      const filePath = path.join(UPLOADS_DIR, songId, fileName);

      // Safety: prevent path traversal
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(path.resolve(UPLOADS_DIR))) {
        return sendJson(res, 403, { error: 'Invalid path' });
      }

      if (!fs.existsSync(filePath)) {
        return sendJson(res, 404, { error: 'File not found' });
      }

      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        'Content-Type': guessMimeType(fileName),
        'Content-Length': stat.size,
        'Content-Disposition': `inline; filename="${filenameEncode(fileName)}"`,
        'Accept-Ranges': 'bytes'
      });

      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      console.error('Download error:', error);
      if (!res.headersSent) {
        sendJson(res, 500, { error: 'Failed to serve file' });
      }
    }
  });

  /**
   * DELETE /api/files/:songId/:fileName
   * Deletes a file from the uploads directory.
   */
  app.delete('/api/files/:songId/:fileName', (req, res) => {
    try {
      const songId = decodeURIComponent(req.params.songId);
      const fileName = decodeURIComponent(req.params.fileName);
      const filePath = path.join(UPLOADS_DIR, songId, fileName);

      // Safety: prevent path traversal
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(path.resolve(UPLOADS_DIR))) {
        return sendJson(res, 403, { error: 'Invalid path' });
      }

      if (!fs.existsSync(filePath)) {
        return sendJson(res, 404, { error: 'File not found' });
      }

      fs.unlinkSync(filePath);
      sendJson(res, 200, { ok: true, message: 'File deleted' });
    } catch (error) {
      console.error('Delete error:', error);
      sendJson(res, 500, { error: 'Failed to delete file' });
    }
  });

  /**
   * DELETE /api/files/delete
   * JSON body with songFolder and fileName.
   */
  app.delete('/api/files/delete', (req, res) => {
    try {
      const { songFolder, fileName } = req.body;
      if (!songFolder || !fileName) {
        return sendJson(res, 400, { error: 'songFolder and fileName required' });
      }
      const filePath = path.join(UPLOADS_DIR, songFolder, fileName);
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(path.resolve(UPLOADS_DIR))) {
        return sendJson(res, 403, { error: 'Invalid path' });
      }
      if (!fs.existsSync(filePath)) {
        return sendJson(res, 404, { error: 'File not found' });
      }
      fs.unlinkSync(filePath);
      sendJson(res, 200, { ok: true, message: 'File deleted successfully' });
    } catch (error) {
      console.error('Delete error:', error);
      sendJson(res, 500, { error: 'Failed to delete file: ' + error.message });
    }
  });

  // ─────────────────────────────────────────────
  // Utility helpers for file management
  // ─────────────────────────────────────────────

  /** Guess MIME type from filename extension */
  function guessMimeType(filename) {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.mp3')) return 'audio/mpeg';
    if (lower.endsWith('.wav')) return 'audio/wav';
    if (lower.endsWith('.flac')) return 'audio/flac';
    if (lower.endsWith('.aac') || lower.endsWith('.m4a')) return 'audio/mp4';
    if (lower.endsWith('.opus')) return 'audio/opus';
    if (lower.endsWith('.mp4')) return 'video/mp4';
    if (lower.endsWith('.mov')) return 'video/quicktime';
    if (lower.endsWith('.webm')) return 'video/webm';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.svg')) return 'image/svg+xml';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.txt')) return 'text/plain';
    if (lower.endsWith('.md')) return 'text/markdown';
    if (lower.endsWith('.pdf')) return 'application/pdf';
    if (lower.endsWith('.json')) return 'application/json';
    return 'application/octet-stream';
  }

  function filenameEncode(name) {
    return String(name).replace(/["\\]/g, '');
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // PROJECT EXPORT TO ZIP
  app.post('/api/workspace-data/project-export', (req, res) => {
    try {
      const { projectName, songIds, includeAllUsers = false } = req.body;
      const workspace = loadMusicWorkspace();
      const currentUser = getCurrentUser();
      
      // Create project metadata
      const projectMetadata = {
        projectName: projectName || 'project',
        exportedAt: Date.now(),
        exportedBy: currentUser ? currentUser.username : 'Anonymous',
        exportedById: currentUser ? currentUser.userId : null,
        songs: [],
        users: includeAllUsers ? getAllUsers() : [currentUser].filter(Boolean)
      };
      
      // Determine songs to export
      const songsToExport = songIds && songIds.length > 0 
        ? workspace.songs.filter(song => songIds.includes(song.id))
        : workspace.songs;
      
      // Build song metadata
      songsToExport.forEach(song => {
        projectMetadata.songs.push({
          id: song.id,
          title: song.title,
          artist: song.artist,
          stage: song.stage,
          progress: song.progress,
          _meta: song._meta,
          assets: song.assets?.map(a => ({
            name: a.name,
            fileName: a.fileName,
            kind: a.kind,
            _meta: a._meta
          })) || []
        });
      });
      
      // Create project directory
      const projectDir = path.join(PROJECTS_DIR, sanitizeProjectName(projectName || 'project'));
      ensureDir(projectDir);
      
      // Save metadata
      fs.writeFileSync(path.join(projectDir, 'project-metadata.json'), JSON.stringify(projectMetadata, null, 2));
      
      // Copy assets
      songsToExport.forEach(song => {
        if (song.assets && song.assets.length > 0) {
          song.assets.forEach(asset => {
            const sourcePath = path.join(WORKSPACE_ROOT, asset.filePath);
            if (fs.existsSync(sourcePath)) {
              const destPath = path.join(projectDir, 'assets', path.basename(asset.filePath));
              ensureDir(path.dirname(destPath));
              fs.copyFileSync(sourcePath, destPath);
            }
          });
        }
      });
      
      // Save workspace data
      fs.writeFileSync(path.join(projectDir, 'workspace-data.json'), JSON.stringify(workspace, null, 2));
      
      // Note: Actual ZIP creation would require archiver library
      // For now, return the project directory info
      sendJson(res, 200, { 
        ok: true, 
        message: 'Project exported successfully',
        projectDir: projectDir,
        metadata: projectMetadata
      });
      
    } catch (error) {
      console.error('Export error:', error);
      sendJson(res, 500, { error: 'Failed to export project' });
    }
  });

  // PROJECT IMPORT FROM DIRECTORY (simulating ZIP extraction)
  app.post('/api/workspace-data/project-import', (req, res) => {
    try {
      const { projectDir } = req.body;
      const importPath = path.join(PROJECTS_DIR, projectDir);
      
      if (!fs.existsSync(importPath)) {
        return sendJson(res, 404, { error: 'Project directory not found' });
      }
      
      // Load workspace data
      const workspaceDataPath = path.join(importPath, 'workspace-data.json');
      if (!fs.existsSync(workspaceDataPath)) {
        return sendJson(res, 400, { error: 'Invalid project structure' });
      }
      
      const importedWorkspace = JSON.parse(fs.readFileSync(workspaceDataPath, 'utf8'));
      
      // Copy assets back to uploads directory
      const assetsDir = path.join(importPath, 'assets');
      if (fs.existsSync(assetsDir)) {
        const assetFiles = fs.readdirSync(assetsDir);
        assetFiles.forEach(file => {
          const source = path.join(assetsDir, file);
          const dest = path.join(UPLOADS_DIR, file);
          fs.copyFileSync(source, dest);
        });
      }
      
      // Save as current workspace
      const saved = saveMusicWorkspace(importedWorkspace);
      sendJson(res, 200, { ok: true, workspace: saved, message: 'Project imported successfully' });
      
    } catch (error) {
      console.error('Import error:', error);
      sendJson(res, 500, { error: 'Failed to import project' });
    }
  });

  // Export entire workspace as .zip (workspace JSON + all uploaded files)
  app.get('/api/workspace/export', (req, res) => {
    try {
      const workspace = loadMusicWorkspace();
      let fileName = String(req.query.name || '').trim();
      if (!fileName) {
        const projectName = sanitizeFileName(workspace.project?.name || 'signal-deck-workspace');
        fileName = `${projectName}-${new Date().toISOString().slice(0, 10)}`;
      } else {
        fileName = sanitizeFileName(fileName);
      }
      const zipName = `${fileName}.zip`;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipName)}"`);

      const archive = archiver('zip', { zlib: { level: 6 } });
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        if (!res.headersSent) res.status(500).send('Export failed');
      });
      archive.pipe(res);

      // Workspace JSON
      archive.append(JSON.stringify(workspace, null, 2), {
        name: 'workspace-data.json'
      });

      // All uploaded files — walk UPLOADS_DIR
      if (fs.existsSync(UPLOADS_DIR)) {
        const walkDir = (dir, base) => {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const full = path.join(dir, entry.name);
            const rel = path.join(base, entry.name);
            if (entry.isDirectory()) walkDir(full, rel);
            else archive.file(full, { name: `files/${rel}` });
          }
        };
        walkDir(UPLOADS_DIR, '');
      }

      // Asset metadata summary
      archive.append(
        JSON.stringify({
          project: workspace.project,
          songs: workspace.songs.map(s => ({
            id: s.id,
            title: s.title,
            assets: (s.assets || []).map(a => ({
              name: a.name,
              fileName: a.fileName,
              type: a.type,
              size: a.size,
              mimeType: a.mimeType
            }))
          })),
          exportedAt: new Date().toISOString()
        }, null, 2),
        { name: 'export-manifest.json' }
      );

      archive.finalize();
    } catch (error) {
      console.error('Export error:', error);
      sendJson(res, 500, { error: 'Failed to export workspace' });
    }
  });

  // Import project from .zip file
  const uploadZip = multer({ storage: multer.memoryStorage() });
  app.post('/api/workspace/import', uploadZip.single('projectZip'), async (req, res) => {
    try {
      if (!req.file) {
        return sendJson(res, 400, { error: 'No file uploaded' });
      }
      
      const AdmZip = (await import('adm-zip')).default;
      const zip = new AdmZip(req.file.buffer);
      const zipEntries = zip.getEntries();
      
      // Find and parse workspace-data.json
      const workspaceEntry = zipEntries.find(e => e.entryName === 'workspace-data.json');
      if (!workspaceEntry) {
        return sendJson(res, 400, { error: 'Invalid workspace archive: missing workspace-data.json' });
      }
      
      const workspace = JSON.parse(workspaceEntry.getData().toString('utf8'));
      
      // Save all files to uploads directory
      zipEntries.forEach(entry => {
        if (entry.entryName.startsWith('files/') && !entry.isDirectory) {
          const relativePath = entry.entryName.replace(/^files\//, '');
          const destPath = path.join(UPLOADS_DIR, relativePath);
          fs.mkdirSync(path.dirname(destPath), { recursive: true });
          fs.writeFileSync(destPath, entry.getData());
        }
      });
      
      // Save as current workspace
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, workspace: saved, message: 'Project imported successfully' });
    } catch (error) {
      console.error('Import error:', error);
      sendJson(res, 500, { error: 'Failed to import project: ' + error.message });
    }
  });

  // Reset workspace to default (new/clean workspace)
  app.post('/api/workspace/reset', (req, res) => {
    try {
      const workspace = createDefaultWorkspace();
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, workspace: saved, message: 'Workspace reset' });
    } catch (error) {
      sendJson(res, 500, { error: 'Failed to reset workspace' });
    }
  });

  // Export single song as formatted text report
  app.get('/api/song/report/:songId', (req, res) => {
    try {
      const { songId } = req.params;
      if (!songId) return sendJson(res, 400, { error: 'songId required' });
      const workspace = loadMusicWorkspace();
      const song = (workspace.songs || []).find(s => s.id === songId);
      if (!song) return sendJson(res, 404, { error: 'Song not found' });

      let report = '';
      report += `${'='.repeat(60)}\n`;
      report += `  FORGE VILLAGE — SONG REPORT\n`;
      report += `  ${song.title}\n`;
      report += `${'='.repeat(60)}\n\n`;

      // Header info
      report += `Song Details\n${'-'.repeat(40)}\n`;
      report += `Title:     ${song.title || 'Untitled'}\n`;
      report += `Artist:    ${song.artist || workspace.project?.artist || 'Independent artist'}\n`;
      report += `Stage:     ${song.stage || 'N/A'}\n`;
      report += `Progress:  ${song.progress || 0}%\n`;
      report += `Release:   ${song.releaseDate || 'No release date set'}\n`;
      report += `Created:   ${song.createdAt || 'Unknown'}\n`;
      report += `Updated:   ${song.updatedAt || 'Unknown'}\n\n`;

      // Song identity
      if (song.about || song.emotion || song.unresolved || song.whyMatters) {
        report += `Song Identity\n${'-'.repeat(40)}\n`;
        if (song.about) report += `What it's about: ${song.about}\n`;
        if (song.emotion) report += `Emotional target: ${song.emotion}\n`;
        if (song.unresolved) report += `What's unresolved:\n  ${song.unresolved}\n`;
        if (song.whyMatters) report += `Why it matters: ${song.whyMatters}\n`;
        report += '\n';
      }

      // Lyrics
      if (song.lyrics) {
        report += `Lyrics\n${'-'.repeat(40)}\n${song.lyrics}\n\n`;
      }

      // Notes
      if (song.notes) {
        report += `Notes\n${'-'.repeat(40)}\n${song.notes}\n\n`;
      }

      // Themes + visual + next step
      if (song.themes?.length || song.visualLane || song.nextStep) {
        report += `Direction\n${'-'.repeat(40)}\n`;
        if (song.themes?.length) report += `Themes: ${song.themes.join(', ')}\n`;
        if (song.visualLane) report += `Visual lane: ${song.visualLane}\n`;
        if (song.nextStep) report += `Next step: ${song.nextStep}\n`;
        report += '\n';
      }

      // Markers
      const markers = (song.waveformMarkers || []).sort((a, b) => a.time - b.time);
      if (markers.length) {
        report += `Waveform Markers\n${'-'.repeat(40)}\n`;
        markers.forEach(m => {
          const ts = formatTimeServer(m.time);
          report += `  [${ts}] ${m.label || 'Untitled'} (${m.color || 'purple'})` + (m.comment ? `\n    ${m.comment}` : '') + '\n';
        });
        report += '\n';
      }

      // Collab notes
      const notes = song.noteEntries || [];
      if (notes.length) {
        report += `Collaborator Notes\n${'-'.repeat(40)}\n`;
        notes.forEach(n => {
          const date = n.updatedAt ? new Date(n.updatedAt).toLocaleDateString() : '';
          report += `  ${n.title || 'Untitled note'}`;
          if (n.author) report += ` — ${n.author}`;
          if (date) report += ` (${date})`;
          report += '\n';
          if (n.body) report += `    ${n.body.replace(/\n/g, '\n    ')}\n`;
        });
        report += '\n';
      }

      // Tracking
      const tracking = song.trackingBoard || [];
      if (tracking.length) {
        const done = tracking.filter(t => t.status?.toLowerCase() === 'done').length;
        report += `Tracking Board\n${'-'.repeat(40)}\n`;
        report += `  ${done}/${tracking.length} items done (${tracking.length ? Math.round(done / tracking.length * 100) : 0}%)\n`;
        // Group by instrument
        const groups = {};
        tracking.forEach(t => {
          (groups[t.instrument || 'General'] = groups[t.instrument || 'General'] || []).push(t);
        });
        for (const [instrument, items] of Object.entries(groups)) {
          report += `\n  ${instrument}:\n`;
          items.forEach(item => {
            const status = item.status || 'needed';
            const check = status.toLowerCase() === 'done' ? '[x]' : '[ ]';
            report += `    ${check} ${item.part || 'General'} — ${item.section || ''} (${status})`;
            if (item.notes) report += ` — ${item.notes}`;
            report += '\n';
          });
        }
        report += '\n';
      }

      // Tasks
      const tasks = song.checklist || [];
      if (tasks.length) {
        report += `Song Tasks\n${'-'.repeat(40)}\n`;
        tasks.forEach(t => {
          report += `  ${t.done ? '[x]' : '[ ]'} ${t.text}\n`;
        });
        report += '\n';
      }

      // Release checklist
      const rc = song.releaseChecklist || [];
      if (rc.length) {
        report += `Release Checklist\n${'-'.repeat(40)}\n`;
        rc.forEach(item => {
          report += `  ${item.done ? '[x]' : '[ ]'} ${item.text}\n`;
        });
        report += '\n';
      }

      // Assets
      const assets = song.assets || [];
      if (assets.length) {
        report += `Assets\n${'-'.repeat(40)}\n`;
        assets.forEach(a => {
          const active = a.id === song.activeReviewAssetId ? ' (Active Review)' : '';
          report += `  - ${a.name || a.fileName || 'Unnamed'}${active}\n`;
          report += `    Type: ${a.type || 'N/A'} | Status: ${a.status || 'N/A'} | Size: ${a.size ? (a.size / 1024).toFixed(1) + ' KB' : 'N/A'}\n`;
        });
        report += '\n';
      }

      report += `${'='.repeat(60)}\n`;
      report += `Exported: ${new Date().toLocaleString()}\n`;
      report += `Forge Village — Independent musician workspace\n`;
      report += `${'='.repeat(60)}\n`;

      const fileName = (song.title || 'song-report').replace(/[^a-zA-Z0-9\-_ ]/g, '') + '-report.txt';
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.send(report);
    } catch (error) {
      console.error('Song report error:', error);
      sendJson(res, 500, { error: 'Failed to generate song report' });
    }
  });

  // Helper for server-side time formatting
  function formatTimeServer(seconds) {
    const totalMs = Math.max(0, Math.round(Number(seconds || 0) * 1000));
    const mins = Math.floor(totalMs / 60000);
    const secs = Math.floor((totalMs % 60000) / 1000);
    const ms = totalMs % 1000;
    return `${mins}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }

  // ============ NEW FEATURE ENDPOINTS ============

  // Active review file selection per song
  app.patch('/api/workspace-data/song/:songId/set-active-file', (req, res) => {
    try {
      const { songId } = req.params;
      const { assetId } = req.body;
      if (!songId) return sendJson(res, 400, { error: 'songId required' });
      const workspace = loadMusicWorkspace();
      const song = (workspace.songs || []).find(s => s.id === songId);
      if (!song) return sendJson(res, 404, { error: 'Song not found' });
      song.activeReviewAssetId = assetId || null;
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, workspace: saved, message: 'Active review file updated' });
    } catch (err) {
      console.error('set-active-file error:', err);
      sendJson(res, 500, { error: 'Failed to set active review file' });
    }
  });

  // Release checklist initialization
  app.post('/api/workspace-data/song/:songId/release-checklist', (req, res) => {
    try {
      const { songId } = req.params;
      if (!songId) return sendJson(res, 400, { error: 'songId required' });
      const workspace = loadMusicWorkspace();
      const song = (workspace.songs || []).find(s => s.id === songId);
      if (!song) return sendJson(res, 404, { error: 'Song not found' });
      const defaultItems = [
        'Mastering complete',
        'ISRC codes assigned',
        'Artwork finalized',
        'Distributor upload scheduled',
        'Spotify for Artists claimed',
        'Social media assets prepared',
        'Lyrics verified and submitted',
        'Publishing registered',
        'Metadata review complete'
      ];
      song.releaseChecklist = defaultItems.map((text, i) => ({
        id: 'rci_' + Date.now() + '_' + i,
        text,
        done: false
      }));
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, workspace: saved, message: 'Release checklist created' });
    } catch (err) {
      console.error('release-checklist create error:', err);
      sendJson(res, 500, { error: 'Failed to create release checklist' });
    }
  });

  // Toggle release checklist item
  app.patch('/api/workspace-data/song/:songId/release-checklist/:itemId', (req, res) => {
    try {
      const { songId, itemId } = req.params;
      const { done } = req.body;
      if (!songId || !itemId) return sendJson(res, 400, { error: 'songId and itemId required' });
      const workspace = loadMusicWorkspace();
      const song = (workspace.songs || []).find(s => s.id === songId);
      if (!song || !song.releaseChecklist) return sendJson(res, 404, { error: 'Checklist not found' });
      const item = song.releaseChecklist.find(i => i.id === itemId);
      if (!item) return sendJson(res, 404, { error: 'Checklist item not found' });
      item.done = Boolean(done);
      const saved = saveMusicWorkspace(workspace);
      sendJson(res, 200, { ok: true, workspace: saved });
    } catch (err) {
      console.error('release-checklist toggle error:', err);
      sendJson(res, 500, { error: 'Failed to toggle checklist item' });
    }
  });

  // Settings - get and save
  const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

  app.get('/api/settings', (req, res) => {
    try {
      let settings = {};
      if (fs.existsSync(SETTINGS_FILE)) {
        settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      }
      sendJson(res, 200, { settings });
    } catch (err) {
      console.error('settings load error:', err);
      sendJson(res, 200, { settings: {} });
    }
  });

  function saveSettings(merged) {
    const tmpPath = SETTINGS_FILE + '.tmp.' + process.pid;
    try {
      fs.writeFileSync(tmpPath, JSON.stringify(merged, null, 2), 'utf8');
      fs.renameSync(tmpPath, SETTINGS_FILE);
    } catch (error) {
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch (_) {}
      throw error;
    }
  }

  app.post('/api/settings', (req, res) => {
    try {
      const existing = fs.existsSync(SETTINGS_FILE)
        ? JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'))
        : {};
      const merged = { ...existing, ...req.body };
      saveSettings(merged);
      sendJson(res, 200, { ok: true, settings: merged });
    } catch (err) {
      console.error('settings save error:', err);
      sendJson(res, 500, { error: 'Failed to save settings' });
    }
  });

  // Serve login page for local user selection
  app.get('/login', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
  });

  // Serve project-select page
  app.get('/select-project', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'project-select.html'));
  });

  // Dashboard — main Forge Village app (protected by login)
  app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

// Start server
server.listen(PORT, () => {
  console.log(`🔥 Forge Village running on http://localhost:${PORT}`);
  console.log(`📁 Workspace root: ${WORKSPACE_ROOT}`);
  console.log(`💾 Data directory: ${DATA_DIR}`);
  console.log(`📤 Uploads directory: ${UPLOADS_DIR}`);
});

// Handle graceful shutdown
function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('✅ Server closed. All connections cleaned up.');
    process.exit(0);
  });
  // Force exit after 5s if server hasn't closed
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));