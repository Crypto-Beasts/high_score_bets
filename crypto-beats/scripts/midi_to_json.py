import mido
import json
import sys
import os

# Configuration
HOLD_NOTE_THRESHOLD = 0.5  # seconds - notes longer than this are considered hold notes
PRECISION = 3  # decimal places for rounding

# Function to map MIDI notes to 'W', 'A', 'S', 'D'
def map_midi_note_to_key(note):
    key_map = ['W', 'A', 'S', 'D']
    return key_map[note % 4]  # Spread notes evenly across keys

def get_bpm_from_midi(mid):
    """Extract BPM from the MIDI file's tempo changes (defaults to 120 if not found)."""
    for track in mid.tracks:
        for msg in track:
            if msg.type == 'set_tempo':
                tempo = msg.tempo  # Microseconds per quarter note
                bpm = 60000000 / tempo
                return bpm
    return 120  # Default BPM

def midi_to_json(midi_file, output_json, hold_threshold=HOLD_NOTE_THRESHOLD, force=False):
    """
    Convert MIDI file to JSON format for rhythm game.
    
    Args:
        midi_file: Path to input MIDI file
        output_json: Path to output JSON file
        hold_threshold: Duration threshold (seconds) for hold notes (default: 0.5)
        force: If True, overwrite existing files without asking (default: False)
    """
    mid = mido.MidiFile(midi_file)
    bpm = get_bpm_from_midi(mid)
    bps = bpm / 60  # Beats per second
    ticks_per_beat = mid.ticks_per_beat
    note_events = []
    
    active_notes = {}  # Track note start times
    
    first_note_time = None  # Track the first note time to sync properly

    for track in mid.tracks:
        absolute_time = 0
        for msg in track:
            absolute_time += msg.time
            if msg.type == 'note_on' and msg.velocity > 0:
                active_notes[msg.note] = absolute_time
                if first_note_time is None:
                    first_note_time = absolute_time  # Capture the first note time
            elif msg.type == 'note_off' or (msg.type == 'note_on' and msg.velocity == 0):
                if msg.note in active_notes:
                    start_time = active_notes.pop(msg.note)
                    duration = absolute_time - start_time
                    mapped_key = map_midi_note_to_key(msg.note)  # Map MIDI note to key

                    # Adjust timing so first note starts at 0, round to specified precision
                    adjusted_time = round(((start_time - first_note_time) / ticks_per_beat) / bps, PRECISION)
                    note_duration = round((duration / ticks_per_beat) / bps, PRECISION)
                    
                    # Determine if this is a hold note based on duration
                    is_hold = note_duration > hold_threshold

                    note_events.append({
                        "time": adjusted_time,
                        "key": mapped_key,
                        "duration": note_duration,
                        "hold": is_hold
                    })

    note_events.sort(key=lambda x: x["time"])  # Ensure correct timing

    # Check if output file exists and ask for confirmation (unless force is True)
    if os.path.exists(output_json) and not force:
        response = input(f"File '{output_json}' already exists. Overwrite? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            print("Conversion cancelled. File not overwritten.")
            return
    
    with open(output_json, "w") as f:
        json.dump(note_events, f, indent=4)
    
    hold_count = sum(1 for note in note_events if note["hold"])
    regular_count = len(note_events) - hold_count
    print(f"Converted {midi_file} to {output_json}")
    print(f"  BPM: {bpm}")
    print(f"  Total notes: {len(note_events)}")
    print(f"  Regular notes: {regular_count}, Hold notes: {hold_count}")
    print(f"  Hold threshold: {hold_threshold}s")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python midi_to_json.py <input.mid> <output.json> [hold_threshold] [--force]")
        print("  Example: python midi_to_json.py song.mid music.json")
        print("  Example: python midi_to_json.py song.mid music.json 0.6")
        print("  Example: python midi_to_json.py song.mid music.json 0.6 --force")
        print("  --force: Overwrite existing files without asking for confirmation")
        sys.exit(1)
    
    midi_file = sys.argv[1]
    output_json = sys.argv[2]
    
    # Parse optional arguments
    hold_threshold = HOLD_NOTE_THRESHOLD
    force = False
    
    for arg in sys.argv[3:]:
        if arg == '--force':
            force = True
        else:
            try:
                hold_threshold = float(arg)
            except ValueError:
                print(f"Warning: Ignoring unknown argument '{arg}'")
    
    midi_to_json(midi_file, output_json, hold_threshold, force)




