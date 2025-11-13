# Asset Management System

## Directory Structure

The game now uses an organized asset structure:

```
public/
  songs/
    Aguado_Menuet_Aminor/
      audio.mp3          # Song audio file
      notes.json         # Note chart data
      cover.png          # (Optional) Album art
    Windy_Summer/
      audio.mp3
      notes.json
      cover.png          # (Optional)
  images/
    background.png       # Game background
    key_w.png           # Key sprites
    key_a.png
    key_s.png
    key_d.png
    fullscreenButton.png
  sounds/
    generalMusic.mp3    # Menu music
```

## Benefits

1. **Organized** - All assets grouped by type
2. **Scalable** - Easy to add new songs
3. **Maintainable** - Clear structure for team members
4. **Professional** - Industry-standard organization

## Adding New Songs

1. Create song directory: `public/songs/YourSongName/`
2. Place files:
   - `audio.mp3` - The song audio
   - `notes.json` - Generated from MIDI using `midi_to_json.py`
   - `cover.png` - (Optional) Album art
3. Update `src/config/songs.js`:
   ```javascript
   {
     id: "YourSongName",
     name: "Your Song Name",
     artist: "Artist Name",
     audioFile: "/songs/YourSongName/audio.mp3",
     jsonFile: "/songs/YourSongName/notes.json",
     coverImage: "/songs/YourSongName/cover.png", // Optional
     bpm: 120,
     // ... other properties
   }
   ```

## Migration Notes

- Old paths (`/Aguado_Menuet_Aminor.mp3`) have been updated to new structure
- All asset references updated in code
- Backward compatibility maintained where possible

