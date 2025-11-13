# MP3 to MIDI Conversion - Information

## Overview

Converting MP3 (audio) to MIDI (note data) is a complex process called **audio-to-MIDI transcription** or **pitch detection**. Unlike MIDI to JSON (which is straightforward), this requires analyzing audio waveforms to extract musical notes.

## Why It's Difficult

1. **MP3 is audio data** - Contains waveforms, not discrete notes
2. **MIDI is note data** - Contains specific pitches, timing, and velocities
3. **Transcription is lossy** - Audio contains many overlapping sounds, harmonics, and effects that are hard to separate

## Available Solutions

### Option 1: Online Services (Easiest)
- **AudioToMIDI.com** - Free online converter
- **Convertio.co** - Supports MP3 to MIDI
- **Online-Convert.com** - Multiple format conversions

**Pros**: No installation needed, quick results  
**Cons**: Quality varies, may require manual cleanup

### Option 2: Software Tools

#### Free/Open Source:
- **Audacity** (with plugins) - Audio editor with pitch detection
- **Sonic Visualiser** - Audio analysis tool
- **Praat** - Speech/audio analysis (can extract pitch)

#### Commercial:
- **Melodyne** - Professional pitch correction (can export MIDI)
- **Cubase** - DAW with audio-to-MIDI features
- **Ableton Live** - Has audio-to-MIDI conversion

### Option 3: Python Libraries (For Automation)

#### Recommended: `audio-to-midi` or `basic-pitch`

```bash
# Install basic-pitch (Spotify's open-source tool)
pip install basic-pitch

# Convert MP3 to MIDI
basic-pitch /path/to/output.mid /path/to/input.mp3
```

#### Alternative: `pypiano` or `pydub` + `music21`
- More complex, requires multiple libraries
- Better for polyphonic (multiple notes) transcription

### Option 4: AI-Powered Solutions
- **Spleeter** (by Deezer) - Separates audio stems
- **Demucs** - Source separation
- **LALAL.AI** - Online service with API

## Recommended Workflow

### For Single Songs:
1. Use **basic-pitch** (best quality for monophonic/melodic content)
2. Or use online service for quick conversion
3. Clean up MIDI in a MIDI editor (MuseScore, FL Studio, etc.)
4. Use `midi_to_json.py` to convert to game format

### For Batch Processing:
```bash
# Install basic-pitch
pip install basic-pitch

# Convert all MP3s in a directory
for file in *.mp3; do
    basic-pitch "output_${file%.mp3}.mid" "$file"
done

# Then use batch_midi_to_json.py
python3 scripts/batch_midi_to_json.py output_*.mid -o public/
```

## Limitations

1. **Quality varies** - Simple melodies work best, complex arrangements are harder
2. **Polyphonic issues** - Multiple simultaneous notes may not be detected correctly
3. **Timing accuracy** - May need manual adjustment
4. **Instrument detection** - May not distinguish between instruments well
5. **Effects/processing** - Reverb, distortion, etc. can confuse detection

## Best Practices

1. **Start with clean audio** - Remove noise, normalize volume
2. **Use isolated tracks** - Solo instrument tracks work better than full mixes
3. **Adjust settings** - Most tools have sensitivity/threshold settings
4. **Manual cleanup** - Expect to edit the MIDI after conversion
5. **Test multiple tools** - Different tools work better for different music styles

## Alternative Approach: Manual Creation

For rhythm games, you might get better results by:
1. Listening to the MP3
2. Manually creating MIDI notes in a MIDI editor
3. Syncing notes to the beat manually
4. This gives perfect accuracy but takes more time

## Integration with Crypto Beats

If you want to add MP3-to-MIDI conversion to the workflow:

1. **Create a wrapper script** (`mp3_to_midi.py`):
   ```python
   import subprocess
   import sys
   
   def mp3_to_midi(mp3_file, output_mid):
       # Use basic-pitch or another tool
       subprocess.run(['basic-pitch', output_mid, mp3_file])
   ```

2. **Combine with existing pipeline**:
   ```bash
   # Full pipeline: MP3 -> MIDI -> JSON
   python3 scripts/mp3_to_midi.py song.mp3 song.mid
   python3 scripts/midi_to_json.py song.mid song.json
   ```

3. **Or create a combined script** that does both steps

## Recommendation

For this project, I recommend:
- **Use existing MIDI files** when possible (better quality)
- **For MP3-only songs**: Use `basic-pitch` for conversion
- **Manual cleanup** in a MIDI editor for best results
- **Focus on rhythm** - For rhythm games, timing is more important than perfect pitch detection

## Resources

- [basic-pitch GitHub](https://github.com/spotify/basic-pitch)
- [Audio-to-MIDI Research Papers](https://www.music-ir.org/mirex/wiki/2023:Audio_to_MIDI_Transcription)
- [MIDI Editing Software List](https://en.wikipedia.org/wiki/List_of_MIDI_editors_and_sequencers)

