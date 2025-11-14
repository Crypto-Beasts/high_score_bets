# Public Folder Organization

This document describes the organization of the `public/` folder after cleanup and reorganization.

## Structure Overview

```
public/
├── icons/                    # Favicon and app icons
│   ├── favicon.ico
│   ├── favicon.png
│   └── favicon-32x32.png
│
├── images/                   # Game images and UI elements
│   ├── background.png        # Main background image
│   ├── key_w.png            # W key visual
│   ├── key_a.png            # A key visual
│   ├── key_s.png            # S key visual
│   ├── key_d.png            # D key visual
│   └── fullscreenButton.png  # Fullscreen button (legacy, not used)
│
├── sounds/                   # Audio files
│   ├── generalMusic.mp3     # Menu background music
│   ├── hitPerfect.mp3       # Perfect hit sound (optional)
│   ├── hitGood.mp3          # Good hit sound (optional)
│   └── hitMiss.mp3          # Miss hit sound (optional)
│
├── songs/                    # Song data and audio
│   ├── {songId}/             # Each song in its own folder
│   │   ├── audio.mp3        # Song audio file
│   │   └── notes.json       # Note data for the song
│   │
│   ├── Aguado_Menuet_Aminor/
│   │   ├── audio.mp3
│   │   └── notes.json
│   │
│   └── Windy_Summer/
│       ├── audio.mp3
│       └── notes.json
│
├── archive/                  # Old/unused files (for reference)
│   ├── Aguado_Menuet_Aminor.mid
│   ├── music.json (legacy)
│   └── ...
│
└── README.md                 # This folder's documentation
```

## Changes Made

### 1. **Icons Organization**
- Moved all favicon files to `icons/` folder
- Updated `index.html` to reference favicons from `/icons/`
- Files: `favicon.ico`, `favicon.png`, `favicon-32x32.png`

### 2. **Images Organization**
- All key images already in `images/` folder (no duplicates)
- Removed duplicate key images from root
- Files: `background.png`, `key_w.png`, `key_a.png`, `key_s.png`, `key_d.png`, `fullscreenButton.png`

### 3. **Sounds Organization**
- All sound files in `sounds/` folder
- Menu music: `generalMusic.mp3`
- Hit sounds (optional): `hitPerfect.mp3`, `hitGood.mp3`, `hitMiss.mp3`

### 4. **Songs Organization**
- Each song in its own folder: `songs/{songId}/`
- Each song folder contains:
  - `audio.mp3` - The song audio file
  - `notes.json` - The note data for the song
- Current songs:
  - `Aguado_Menuet_Aminor/`
  - `Windy_Summer/`

### 5. **Cleanup**
- Moved old/unused files to `archive/` folder:
  - Old MIDI files (`.mid`)
  - Legacy `music.json` (replaced by per-song JSON files)
  - Old audio files that are no longer used
- Removed Windows metadata files (`.Identifier` files)

## Asset Paths in Code

All assets are served from root `/` in Vite. The code references them as:

- **Images**: `/images/{filename}`
- **Sounds**: `/sounds/{filename}`
- **Songs**: `/songs/{songId}/audio.mp3` and `/songs/{songId}/notes.json`
- **Icons**: `/icons/{filename}` (referenced in `index.html`)

## Adding New Assets

### Adding a New Song

1. Create folder: `public/songs/{songId}/`
2. Add files:
   - `audio.mp3` - The song audio
   - `notes.json` - The note data (generated from MIDI)
3. Update `src/config/songs.js`:
   ```javascript
   {
     id: "songId",
     name: "Song Name",
     audioFile: "/songs/songId/audio.mp3",
     jsonFile: "/songs/songId/notes.json",
     // ... other properties
   }
   ```

### Adding a New Image

1. Place file in `public/images/`
2. Load in `LoadingScene.js`:
   ```javascript
   this.load.image("myImage", "/images/myImage.png");
   ```

### Adding a New Sound

1. Place file in `public/sounds/`
2. Load in `LoadingScene.js`:
   ```javascript
   this.load.audio("mySound", "/sounds/mySound.mp3");
   ```

## Notes

- **Hit Sounds**: Optional. The game works without them and handles their absence gracefully.
- **Favicons**: Updated in `index.html` to use `/icons/` paths.
- **Archive**: Contains old files kept for reference but not used by the application.
- **Vite Serving**: Files in `public/` are automatically served from root `/` by Vite, so no `/public/` prefix is needed in paths.

