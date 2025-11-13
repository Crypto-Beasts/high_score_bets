#!/bin/bash
# Helper script to generate JSON files for all songs
# This converts MIDI files to JSON format for the game

echo "Setting up song JSON files..."
echo ""

# Check if midi_to_json.py exists
if [ ! -f "scripts/midi_to_json.py" ]; then
    echo "Error: midi_to_json.py not found!"
    exit 1
fi

# Convert Aguado_Menuet_Aminor
if [ -f "public/Aguado_Menuet_Aminor.mid" ]; then
    echo "Converting Aguado_Menuet_Aminor.mid..."
    python3 scripts/midi_to_json.py public/Aguado_Menuet_Aminor.mid public/Aguado_Menuet_Aminor.json --force
else
    echo "Warning: Aguado_Menuet_Aminor.mid not found"
fi

# Convert Windy_Summer if MIDI exists
if [ -f "public/Windy_Summer.mid" ]; then
    echo "Converting Windy_Summer.mid..."
    python3 scripts/midi_to_json.py public/Windy_Summer.mid public/Windy_Summer.json --force
else
    echo "Note: Windy_Summer.mid not found - you may need to convert from MP3 first"
    echo "See scripts/MP3_TO_MIDI_INFO.md for instructions"
fi

echo ""
echo "Done! JSON files should now be in public/ directory"
echo "Make sure the file paths in src/config/songs.js match your JSON files"

