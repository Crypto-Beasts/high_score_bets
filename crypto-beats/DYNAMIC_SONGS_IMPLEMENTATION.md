# Dynamic Song Loading System - Implementation Summary

## ✅ Completed Features

### 1. Dynamic Song Loading System
- Created `src/config/songs.js` - Central configuration for all songs
- Songs are now defined in one place, making it easy to add new songs
- LoadingScene dynamically loads all songs from the config

### 2. Multi-Song JSON Support
- Each song now has its own JSON file (e.g., `Aguado_Menuet_Aminor.json`, `Windy_Summer.json`)
- GameScene loads the correct JSON file based on selected song
- Supports both old format (array) and new format (with metadata)

### 3. Song Selection Preservation
- Song selection is preserved when retrying
- Difficulty selection is preserved when retrying
- Song and difficulty are passed through all scene transitions

## 📁 Files Created/Modified

### New Files:
- `src/config/songs.js` - Song configuration
- `scripts/MP3_TO_MIDI_INFO.md` - Documentation on MP3 to MIDI conversion
- `scripts/setup_songs.sh` - Helper script to generate JSON files

### Modified Files:
- `src/scenes/LoadingScene.js` - Dynamic song loading
- `src/scenes/SongSelectionScene.js` - Dynamic button generation
- `src/scenes/GameScene.js` - Song-specific JSON loading
- `src/scenes/DebriefScene.js` - Song selection preservation

## 🎵 How to Add New Songs

### Step 1: Convert MIDI to JSON
```bash
# Single file
python3 scripts/midi_to_json.py path/to/song.mid public/song_name.json

# Or use batch converter for multiple files
python3 scripts/batch_midi_to_json.py path/to/midi/files/ -o public/
```

### Step 2: Add Song to Config
Edit `src/config/songs.js` and add a new entry:

```javascript
{
  id: "Song_ID",           // Unique identifier (used as cache key)
  name: "Song Name",        // Display name
  audioFile: "/Song_ID.mp3",  // Path to audio file in public/
  jsonFile: "/Song_ID.json",  // Path to JSON file in public/
  bpm: 120,                // BPM (optional, can be null)
  duration: null,          // Duration in seconds (optional)
  difficulties: {
    easy: true,
    normal: true,
    hard: true
  }
}
```

### Step 3: Place Audio File
Place the MP3 file in the `public/` directory with the name matching `audioFile` path.

### Step 4: Done!
The game will automatically:
- Load the song in LoadingScene
- Display it in SongSelectionScene
- Use the correct JSON file in GameScene

## 🔄 Migration from Old System

The system is backward compatible:
- Old `music.json` file still works as fallback
- If a song's JSON file is missing, it falls back to `songData` cache key
- Asset paths updated to remove `/public/` prefix (Vite serves from root)

## 📝 Current Song Status

### ✅ Aguado_Menuet_Aminor
- MIDI file: `public/Aguado_Menuet_Aminor.mid`
- JSON file: `public/Aguado_Menuet_Aminor.json` ✅ Generated
- Audio file: `public/Aguado_Menuet_Aminor.mp3`
- Status: **Ready to use**

### ⚠️ Windy_Summer
- MIDI file: Not found (may need MP3 to MIDI conversion)
- JSON file: `public/Windy_Summer.json` (needs to be generated)
- Audio file: `public/Windy_Summer.mp3`
- Status: **Needs JSON file**

To complete Windy_Summer setup:
1. If you have a MIDI file, run:
   ```bash
   python3 scripts/midi_to_json.py public/Windy_Summer.mid public/Windy_Summer.json
   ```
2. If you only have MP3, see `scripts/MP3_TO_MIDI_INFO.md` for conversion options

## 🎮 How It Works

### Loading Flow:
1. **LoadingScene** reads `songs.js` config
2. For each song, loads:
   - Audio file → Cache key: `song.id`
   - JSON file → Cache key: `song.id + "_data"`
3. Songs config stored in cache for other scenes

### Selection Flow:
1. **SongSelectionScene** reads songs from config
2. Dynamically creates buttons for each song
3. When song selected, stores `song.id`
4. Passes `song.id` and `difficulty` to GameScene

### Game Flow:
1. **GameScene** receives `song` and `difficulty` from data
2. Loads song-specific JSON: `song.id + "_data"`
3. Uses song-specific audio: `song.id`
4. Passes song/difficulty to DebriefScene

### Retry Flow:
1. **DebriefScene** stores `song` and `difficulty`
2. Retry button passes them back to GameScene
3. Player retries same song/difficulty

## 🛠️ Helper Scripts

### Generate JSON Files
```bash
# Setup all songs (if MIDI files exist)
./scripts/setup_songs.sh

# Or use batch converter
python3 scripts/batch_midi_to_json.py public/*.mid -o public/
```

## 📚 Related Documentation

- `scripts/MP3_TO_MIDI_INFO.md` - MP3 to MIDI conversion guide
- `IMPROVEMENTS_SUGGESTIONS.md` - Future improvement ideas
- `scripts/batch_midi_to_json.py` - Batch conversion tool

## 🐛 Troubleshooting

### Song not appearing in selection
- Check `songs.js` config has correct entry
- Verify audio file exists at path specified in `audioFile`
- Check browser console for loading errors

### Song plays but no notes appear
- Verify JSON file exists at path specified in `jsonFile`
- Check JSON file format (should be array of note objects)
- Check browser console for errors loading JSON

### Wrong song plays
- Verify `song.id` matches audio file cache key
- Check that song selection is being passed correctly
- Verify `GameScene` is using `data.song` not hardcoded value

## ✨ Benefits

1. **Easy to add songs** - Just add one entry to config
2. **No code changes needed** - All scenes work dynamically
3. **Type-safe** - Song IDs are consistent across scenes
4. **Maintainable** - All song info in one place
5. **Scalable** - Works with 2 songs or 200 songs

