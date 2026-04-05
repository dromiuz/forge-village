# Signal Deck

An independent musician workspace that puts songs first. Built with local-first data, a clean dark interface, and zero SaaS sludge.

---

## Quick Start

```bash
cd "Signal Deck - Online/app"
npm install
PORT=4323 npm start
```

Then open http://localhost:4323 in your browser.

## Desktop App

The Electron wrapper is in the `../electron-app/` directory. It bundles the same server and opens it in a dedicated window.

```bash
cd "Signal Deck - Online/electron-app"
npm install
npm start
```

## Features

### Song Management
- **Song board** — Kanban-style view of all songs with stage, progress %, and quick stats
- **Song detail pages** — Dedicated workspace per song with lyrics, notes, themes, and visual direction
- **Stages & progress** — Track songs from Idea through Released (Idea → Writing → Demo → Recording → Production → Mixing → Mastering → Ready to Release → Released)
- **Waveform playback** — Upload audio files and play them back with a visual waveform
- **Timeline markers** — Add labeled markers at precise timestamps (supports mm:ss, mm:ss.SSS, h/m/s, and raw seconds)
- **Instrument tracking board** — Per-song tracking sheets with instrument templates (acoustic, full band, vocal stack)
- **Song checklists & notes** — Persistent task lists and notes attached to each song

### Asset Management
- **File uploads** — Attach audio files, artwork, PDFs, and other assets to songs
- **Download & delete** — Full CRUD on uploaded files
- **Active review file** — Set which asset is currently being reviewed

### Calendar
- **Events** — Releases, content deadlines, shows, studio sessions
- **Month view** — Visual calendar with event type indicators

### Workspace
- **Project setup** — Name, artist, description per workspace
- **Workspace notes** — Freeform notes for ideas, strategy, collaborator info
- **Export/Import** — ZIP-based workspace backup and restore (includes all data + uploaded files)
- **Project reset** — Wipe everything and start fresh

### Interface
- **Dark theme** — Clean, creative dark UI with accent colors
- **Search** — Ctrl/Cmd+K to search across songs, lyrics, notes, markers, and events
- **Keyboard shortcuts** — Space for play/pause, Escape to close modals
- **Confirmation dialogs** — Protects against accidental deletions
- **Auto-save indicator** — Visual feedback when data is being saved
- **Version info** — About modal with feature list and version number

## Architecture

- **Frontend**: Plain HTML, CSS, JavaScript — no frameworks, no build step
- **Backend**: Node.js + Express server
- **Data storage**: JSON files in local data directory (local-first)
- **File uploads**: Multer with disk storage
- **Export/Import**: ZIP archives via adm-zip

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open search |
| `Space` | Play/pause (when waveform is loaded) |
| `Escape` | Close modals and dialogs |

## Data

All data is stored locally in JSON files. No cloud dependency required. Your workspace data, uploaded files, and projects all live on your machine.

## Configuration

Create a `.env` file based on `.env.example`:
```
PORT=4323
NODE_ENV=development
```

For Discord webhook notifications, copy `.env.discord.example` to `.env.discord` and add your webhook URLs.

## Version

**Current: 1.0.0**
