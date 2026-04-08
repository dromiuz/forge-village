# Forge Village Desktop App

Local-first music production workspace for independent musicians.

## Features
- Multi-user collaboration on local projects
- Professional song tracking and management  
- Waveform visualization with markers
- Local file storage (no cloud required)
- Dark mode with creative design
- Production-ready reliability

## Installation

### macOS
1. Download `Forge-Village-*.dmg` or `Forge-Village-*.zip`
2. Extract and drag `Forge Village.app` to Applications folder
3. Double-click to launch!

### Windows
1. Download `Forge Village Setup *.exe`
2. Run the installer
3. Launch Forge Village from Start Menu

### Linux
1. Download the AppImage or .deb package
2. Make the AppImage executable: `chmod +x Forge\*.AppImage`
3. Run and enjoy!

## Data Storage
All your projects are stored locally in:
- macOS: `~/Library/Application Support/Forge Village/`
- Windows: `%APPDATA%/Forge Village/`
- Linux: `~/.config/Forge Village/`

Your data never leaves your computer unless you choose to share it.

## Development
```bash
# Run in development mode
cd electron-app
npm run dev

# Build for macOS only
npm run package-mac

# Build for all platforms
./build.sh
```

---
Made for independent musicians who ship real work.
