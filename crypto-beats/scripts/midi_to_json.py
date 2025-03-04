import mido
import json

def midi_to_json(midi_file, output_json):
    mid = mido.MidiFile(midi_file)
    key_mapping = {
        (36, 47): "W",  # Low notes (C2 - B2)
        (48, 59): "A",  # Mid-low notes (C3 - B3)
        (60, 71): "S",  # Mid-high notes (C4 - B4)
        (72, 83): "D"   # High notes (C5 - B5)
    }
    
    notes = []
    tempo = 500000  # Default 120 BPM in microseconds per beat // change this to the correct bpm of the song choosen
    ticks_per_beat = mid.ticks_per_beat
    
    for track in mid.tracks:
        time_elapsed = 0
        for msg in track:
            time_elapsed += msg.time
            if msg.type == "set_tempo":
                tempo = msg.tempo
            if msg.type == "note_on" and msg.velocity > 0:
                note_time = mido.tick2second(time_elapsed, ticks_per_beat, tempo)
                note_info = {
                    "time": round(note_time, 3),
                    "note": msg.note,
                    "key": next((k for (low, high), k in key_mapping.items() if low <= msg.note <= high), None),
                    "hold": False  # Default, will be updated later
                }
                notes.append(note_info)
            if msg.type == "note_off" or (msg.type == "note_on" and msg.velocity == 0):
                for note in notes:
                    if note["note"] == msg.note and not note["hold"]:
                        duration = mido.tick2second(time_elapsed, ticks_per_beat, tempo) - note["time"]
                        note["hold"] = duration > 0.3  # Mark as hold if longer than 300ms
    
    # Save to JSON
    with open(output_json, "w") as f:
        json.dump(notes, f, indent=4)
    
    print(f"Converted {midi_file} to {output_json}!")

# Example usage
midi_to_json("music.mid", "song_data.json")
