#!/usr/bin/env python3
"""
Validate the music.json file structure for the rhythm game.
"""
import json
import sys

def validate_music_json(json_file):
    """
    Validate that the JSON file has the correct structure for the game.
    
    Expected structure:
    [
        {
            "time": float,
            "key": "W" | "A" | "S" | "D",
            "duration": float,
            "hold": bool
        },
        ...
    ]
    """
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: File '{json_file}' not found")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON format - {e}")
        return False
    
    # Check if it's a list
    if not isinstance(data, list):
        print(f"❌ Error: JSON root must be an array, got {type(data).__name__}")
        return False
    
    if len(data) == 0:
        print("⚠️  Warning: JSON file is empty (no notes)")
        return True
    
    # Valid keys
    valid_keys = {'W', 'A', 'S', 'D'}
    
    # Track statistics
    errors = []
    warnings = []
    stats = {
        'total_notes': len(data),
        'regular_notes': 0,
        'hold_notes': 0,
        'keys': {'W': 0, 'A': 0, 'S': 0, 'D': 0},
        'time_range': {'min': float('inf'), 'max': float('-inf')},
        'duration_range': {'min': float('inf'), 'max': float('-inf')}
    }
    
    # Validate each note
    for i, note in enumerate(data):
        if not isinstance(note, dict):
            errors.append(f"Note {i}: Must be an object, got {type(note).__name__}")
            continue
        
        # Check required fields
        required_fields = ['time', 'key', 'duration', 'hold']
        for field in required_fields:
            if field not in note:
                errors.append(f"Note {i}: Missing required field '{field}'")
        
        # Validate time
        if 'time' in note:
            if not isinstance(note['time'], (int, float)):
                errors.append(f"Note {i}: 'time' must be a number, got {type(note['time']).__name__}")
            else:
                stats['time_range']['min'] = min(stats['time_range']['min'], note['time'])
                stats['time_range']['max'] = max(stats['time_range']['max'], note['time'])
                if note['time'] < 0:
                    warnings.append(f"Note {i}: Negative time value ({note['time']})")
        
        # Validate key
        if 'key' in note:
            if note['key'] not in valid_keys:
                errors.append(f"Note {i}: Invalid key '{note['key']}', must be one of {valid_keys}")
            else:
                stats['keys'][note['key']] += 1
        
        # Validate duration
        if 'duration' in note:
            if not isinstance(note['duration'], (int, float)):
                errors.append(f"Note {i}: 'duration' must be a number, got {type(note['duration']).__name__}")
            else:
                stats['duration_range']['min'] = min(stats['duration_range']['min'], note['duration'])
                stats['duration_range']['max'] = max(stats['duration_range']['max'], note['duration'])
                if note['duration'] <= 0:
                    errors.append(f"Note {i}: Duration must be positive, got {note['duration']}")
        
        # Validate hold
        if 'hold' in note:
            if not isinstance(note['hold'], bool):
                errors.append(f"Note {i}: 'hold' must be a boolean, got {type(note['hold']).__name__}")
            else:
                if note['hold']:
                    stats['hold_notes'] += 1
                else:
                    stats['regular_notes'] += 1
        
        # Check for unexpected fields
        unexpected = set(note.keys()) - set(required_fields)
        if unexpected:
            warnings.append(f"Note {i}: Unexpected fields: {unexpected}")
    
    # Check if notes are sorted by time
    times = [note.get('time', 0) for note in data if isinstance(note, dict) and 'time' in note]
    if times != sorted(times):
        warnings.append("Notes are not sorted by time (may cause timing issues)")
    
    # Print results
    if errors:
        print("❌ Validation FAILED:")
        for error in errors:
            print(f"  - {error}")
        return False
    
    # Print success and statistics
    print("✅ Validation PASSED")
    print(f"\n📊 Statistics:")
    print(f"  Total notes: {stats['total_notes']}")
    print(f"  Regular notes: {stats['regular_notes']}")
    print(f"  Hold notes: {stats['hold_notes']}")
    print(f"  Key distribution:")
    for key, count in stats['keys'].items():
        percentage = (count / stats['total_notes'] * 100) if stats['total_notes'] > 0 else 0
        print(f"    {key}: {count} ({percentage:.1f}%)")
    print(f"  Time range: {stats['time_range']['min']:.3f}s - {stats['time_range']['max']:.3f}s")
    print(f"  Duration range: {stats['duration_range']['min']:.3f}s - {stats['duration_range']['max']:.3f}s")
    
    if warnings:
        print(f"\n⚠️  Warnings ({len(warnings)}):")
        for warning in warnings[:10]:  # Show first 10 warnings
            print(f"  - {warning}")
        if len(warnings) > 10:
            print(f"  ... and {len(warnings) - 10} more warnings")
    
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python validate_json.py <music.json>")
        print("  Example: python validate_json.py ../public/music.json")
        sys.exit(1)
    
    json_file = sys.argv[1]
    success = validate_music_json(json_file)
    sys.exit(0 if success else 1)
