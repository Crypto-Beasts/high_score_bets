import mido
import json

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

def midi_to_json(midi_file, output_json):
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

                    # Adjust timing so first note starts at 0
                    adjusted_time = ((start_time - first_note_time) / ticks_per_beat) / bps

                    note_events.append({
                        "time": adjusted_time,
                        "key": mapped_key,
                        "duration": (duration / ticks_per_beat) / bps
                    })

    note_events.sort(key=lambda x: x["time"])  # Ensure correct timing

    with open(output_json, "w") as f:
        json.dump(note_events, f, indent=4)
    
    print(f"Converted {midi_file} to {output_json} (BPM: {bpm})")

# Example usage
midi_to_json(r"C:\Users\el_li\OneDrive\Documents\MidiTest\public\Aguado_Menuet_Aminor.mid", "music.json")




