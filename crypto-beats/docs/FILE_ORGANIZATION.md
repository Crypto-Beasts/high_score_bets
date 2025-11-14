# File Organization

This document describes the project's file organization structure.

## Directory Structure

```
crypto-beats/
├── docs/                          # All documentation
│   ├── IMPROVEMENTS_SUGGESTIONS.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── QUICK_WINS_IMPLEMENTATION.md
│   ├── DYNAMIC_SONGS_IMPLEMENTATION.md
│   ├── ASSET_MANAGEMENT_README.md
│   └── FILE_ORGANIZATION.md
│
├── scripts/                       # Build and conversion scripts
│   ├── midi_to_json.py
│   ├── batch_midi_to_json.py
│   ├── validate_json.py
│   └── setup_songs.sh
│
├── src/
│   ├── main.js                    # Entry point
│   │
│   ├── scenes/
│   │   ├── gameplay/              # Gameplay-related scenes
│   │   │   ├── GameScene.js
│   │   │   └── DebriefScene.js
│   │   │
│   │   ├── menus/                 # Menu scenes
│   │   │   ├── LoadingScene.js
│   │   │   ├── MainMenuScene.js
│   │   │   ├── SongSelectionScene.js
│   │   │   └── AboutUsScene.js
│   │   │
│   │   ├── settings/              # Settings scenes
│   │   │   ├── AudioCalibrationScene.js
│   │   │   ├── ThemeSelectionScene.js
│   │   │   └── AchievementsScene.js
│   │   │
│   │   └── ui/                    # UI overlay scenes
│   │       └── UIOverlayScene.js
│   │
│   ├── utils/
│   │   ├── game/                  # Game logic utilities
│   │   │   ├── objectPool.js
│   │   │   ├── difficultyManager.js
│   │   │   └── achievements.js
│   │   │
│   │   ├── ui/                    # UI utilities
│   │   │   ├── responsive.js
│   │   │   └── colorThemes.js
│   │   │
│   │   ├── audio/                 # Audio utilities
│   │   │   └── audioSync.js
│   │   │
│   │   └── data/                  # Data utilities
│   │       └── errorHandler.js
│   │
│   └── config/                    # Configuration files
│       └── songs.js
│
├── public/                        # Static assets
│   ├── songs/
│   ├── images/
│   └── sounds/
│
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## Organization Principles

### Scenes
- **gameplay/**: Core gameplay scenes (GameScene, DebriefScene)
- **menus/**: Navigation and selection scenes (Loading, MainMenu, SongSelection, AboutUs)
- **settings/**: Configuration and customization scenes (AudioCalibration, ThemeSelection, Achievements)
- **ui/**: Overlay and UI scenes (UIOverlay)

### Utils
- **game/**: Game mechanics (object pooling, difficulty management, achievements)
- **ui/**: UI helpers (responsive sizing, color themes)
- **audio/**: Audio synchronization and timing
- **data/**: Data validation and error handling

### Benefits
1. **Easier Navigation**: Related files are grouped together
2. **Better Maintainability**: Clear separation of concerns
3. **Scalability**: Easy to add new files in appropriate folders
4. **Cleaner Root**: Documentation moved to `docs/` folder

## Import Paths

When importing from different folders, use relative paths:

- From `scenes/gameplay/` to `utils/game/`: `../../utils/game/`
- From `scenes/menus/` to `utils/ui/`: `../../utils/ui/`
- From `scenes/settings/` to `utils/audio/`: `../../utils/audio/`
- From `scenes/*` to `config/`: `../../config/`

## Migration Notes

This organization was implemented on 2024-11-14. All import paths have been updated to reflect the new structure.

