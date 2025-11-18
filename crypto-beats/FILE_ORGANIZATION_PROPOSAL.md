# File Organization Proposal

## Current Structure Issues
- 11 scene files in flat `scenes/` folder (hard to navigate)
- 7 utility files in flat `utils/` folder (mixed concerns)
- 6 documentation files in root (clutters root directory)
- Scripts mixed with documentation

## Proposed Structure

```
crypto-beats/
├── docs/                          # All documentation
│   ├── IMPROVEMENTS_SUGGESTIONS.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── QUICK_WINS_IMPLEMENTATION.md
│   ├── DYNAMIC_SONGS_IMPLEMENTATION.md
│   ├── ASSET_MANAGEMENT_README.md
│   └── GAME_REVIEW.md (if exists)
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
│   ├── core/                      # Core game logic
│   │   ├── GameScene.js
│   │   └── gameLogic.js           # (future: extracted game logic)
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
├── public/                        # Static assets (unchanged)
│   ├── songs/
│   ├── images/
│   └── sounds/
│
├── index.html
├── package.json
├── vite.config.js
└── README.md                      # Main project README
```

## Benefits

1. **Scenes Organization**
   - `gameplay/`: Core gameplay scenes (GameScene, DebriefScene)
   - `menus/`: Navigation and selection scenes
   - `settings/`: Configuration and customization scenes
   - `ui/`: Overlay and UI scenes
   - Easier to find and maintain related scenes

2. **Utils Organization**
   - `game/`: Game mechanics (pooling, difficulty, achievements)
   - `ui/`: UI helpers (responsive, themes)
   - `audio/`: Audio synchronization
   - `data/`: Data validation and error handling
   - Clear separation of concerns

3. **Documentation**
   - All docs in `docs/` folder
   - Cleaner root directory
   - Easier to find documentation

4. **Maintainability**
   - Related files grouped together
   - Easier to navigate for new developers
   - Better code organization
   - Scalable structure

## Migration Plan

1. Create new folder structure
2. Move files to new locations
3. Update all import paths
4. Test that everything still works
5. Update any documentation references

## Alternative: Simpler Structure

If the above is too complex, a simpler alternative:

```
src/
├── scenes/
│   ├── gameplay/
│   ├── menus/
│   └── settings/
├── utils/
│   ├── game/
│   ├── ui/
│   └── audio/
└── config/
```

This keeps scenes organized but simplifies utils grouping.

