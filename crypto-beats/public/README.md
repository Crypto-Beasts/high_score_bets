# Public Assets Directory

This directory contains all static assets served by the application.

## Directory Structure

```
public/
├── icons/                    # Favicon and app icons
│   ├── favicon.ico
│   ├── favicon.png
│   ├── favicon-16x16.png
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
└── archive/                  # Old/unused files (for reference)
    ├── Aguado_Menuet_Aminor.mid
    ├── music.json (legacy)
    └── ...
```

## Asset Paths

All assets are served from the root path `/` in Vite. The code references them as:

- **Images**: `/images/{filename}`
- **Sounds**: `/sounds/{filename}`
- **Songs**: `/songs/{songId}/audio.mp3` and `/songs/{songId}/notes.json`
- **Icons**: Referenced in `index.html` as `/icons/{filename}`

## Adding New Songs

1. Create a new folder in `songs/` with the song ID (e.g., `songs/MyNewSong/`)
2. Add `audio.mp3` and `notes.json` to that folder
3. Update `src/config/songs.js` with the new song configuration:
   ```javascript
   {
     id: "MyNewSong",
     name: "My New Song",
     audioFile: "/songs/MyNewSong/audio.mp3",
     jsonFile: "/songs/MyNewSong/notes.json",
     // ... other properties
   }
   ```

## Adding New Images

1. Place image files in `images/` folder
2. Update `LoadingScene.js` to load the image:
   ```javascript
   this.load.image("myImage", "/images/myImage.png");
   ```

## Adding New Sounds

1. Place sound files in `sounds/` folder
2. Update `LoadingScene.js` to load the sound:
   ```javascript
   this.load.audio("mySound", "/sounds/mySound.mp3");
   ```

## Notes

- **Hit Sounds**: The game will work without `hitPerfect.mp3`, `hitGood.mp3`, and `hitMiss.mp3`. If they don't exist, the game will gracefully handle their absence.
- **Favicons**: Should be referenced in `index.html` from the `icons/` folder.
- **Archive**: Contains old/unused files that are kept for reference but not used by the application.

