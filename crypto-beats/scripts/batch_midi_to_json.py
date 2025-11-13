#!/usr/bin/env python3
"""
Batch convert multiple MIDI files to JSON format for rhythm game.
Supports processing a directory of MIDI files or a list of specific files.
"""
import mido
import json
import sys
import os
import argparse
import time
from pathlib import Path
from midi_to_json import midi_to_json, HOLD_NOTE_THRESHOLD

def find_midi_files(input_path):
    """
    Find all MIDI files in the given path.
    
    Args:
        input_path: Path to directory or file
        
    Returns:
        List of MIDI file paths
    """
    path = Path(input_path)
    midi_files = []
    
    if path.is_file():
        # Single file
        if path.suffix.lower() in ['.mid', '.midi']:
            midi_files.append(path)
        else:
            print(f"Warning: '{input_path}' is not a MIDI file (.mid or .midi)")
    elif path.is_dir():
        # Directory - find all MIDI files
        midi_files = list(path.glob('*.mid')) + list(path.glob('*.midi'))
        if not midi_files:
            print(f"No MIDI files found in directory '{input_path}'")
    else:
        print(f"Error: '{input_path}' is not a valid file or directory")
    
    return sorted(midi_files)

def generate_output_path(midi_file, output_dir=None, output_ext='.json'):
    """
    Generate output JSON path from MIDI file path.
    
    Args:
        midi_file: Path to MIDI file
        output_dir: Optional output directory (if None, uses same dir as MIDI file)
        output_ext: Output file extension (default: .json)
        
    Returns:
        Path to output JSON file
    """
    midi_path = Path(midi_file)
    
    if output_dir:
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        return output_path / midi_path.with_suffix(output_ext).name
    else:
        return midi_path.with_suffix(output_ext)

def batch_convert(input_paths, output_dir=None, hold_threshold=HOLD_NOTE_THRESHOLD, 
                  force=False, verbose=True):
    """
    Batch convert MIDI files to JSON format.
    
    Args:
        input_paths: List of input paths (files or directories)
        output_dir: Optional output directory for all JSON files
        hold_threshold: Duration threshold (seconds) for hold notes
        force: If True, overwrite existing files without asking
        verbose: If True, print detailed progress
        
    Returns:
        Dictionary with conversion statistics
    """
    # Collect all MIDI files
    all_midi_files = []
    for path in input_paths:
        files = find_midi_files(path)
        all_midi_files.extend(files)
    
    if not all_midi_files:
        print("No MIDI files found to convert.")
        return {
            'total': 0,
            'success': 0,
            'failed': 0,
            'skipped': 0
        }
    
    # Remove duplicates while preserving order
    seen = set()
    unique_files = []
    for f in all_midi_files:
        if f not in seen:
            seen.add(f)
            unique_files.append(f)
    
    all_midi_files = unique_files
    
    if verbose:
        print(f"Found {len(all_midi_files)} MIDI file(s) to convert")
        print(f"Output directory: {output_dir if output_dir else 'Same as input files'}")
        print(f"Hold threshold: {hold_threshold}s")
        print(f"Force overwrite: {force}")
        print("-" * 60)
    
    stats = {
        'total': len(all_midi_files),
        'success': 0,
        'failed': 0,
        'skipped': 0,
        'errors': [],
        'total_size': 0,
        'total_output_size': 0
    }
    
    # Track timing for progress estimation
    start_time = time.time()
    file_times = []
    
    # Process each file
    for i, midi_file in enumerate(all_midi_files, 1):
        file_start_time = time.time()
        
        try:
            output_json = generate_output_path(midi_file, output_dir)
            
            # Get input file size
            input_size = midi_file.stat().st_size if midi_file.exists() else 0
            stats['total_size'] += input_size
            
            # Calculate percentage
            percentage = (i / len(all_midi_files)) * 100
            
            # Estimate time remaining
            if file_times:
                avg_time = sum(file_times) / len(file_times)
                remaining_files = len(all_midi_files) - i
                estimated_remaining = avg_time * remaining_files
                remaining_str = f", ETA: {estimated_remaining:.1f}s" if estimated_remaining > 0 else ""
            else:
                remaining_str = ""
            
            if verbose:
                # Format file size
                size_str = format_file_size(input_size)
                print(f"[{i}/{len(all_midi_files)}] ({percentage:.1f}%) Processing: {midi_file.name} ({size_str}{remaining_str})")
            
            # Check if output exists and handle accordingly
            if output_json.exists() and not force:
                if verbose:
                    print(f"  ⚠️  Output file '{output_json}' already exists. Skipping...")
                stats['skipped'] += 1
                continue
            
            # Convert the file
            result = midi_to_json(str(midi_file), str(output_json), hold_threshold, force=True, include_metadata=True)
            
            if result is None:
                stats['skipped'] += 1
                continue
            
            stats['success'] += 1
            
            # Get output file size
            if output_json.exists():
                output_size = output_json.stat().st_size
                stats['total_output_size'] += output_size
                output_size_str = format_file_size(output_size)
            else:
                output_size_str = "N/A"
            
            # Calculate processing time
            file_time = time.time() - file_start_time
            file_times.append(file_time)
            
            if verbose:
                print(f"  ✅ Converted to: {output_json.name} ({output_size_str}, {file_time:.2f}s)")
                print()
                
        except Exception as e:
            stats['failed'] += 1
            error_msg = f"Failed to convert '{midi_file}': {str(e)}"
            stats['errors'].append(error_msg)
            file_time = time.time() - file_start_time
            file_times.append(file_time)
            
            if verbose:
                print(f"  ❌ {error_msg} ({file_time:.2f}s)")
                print()
    
    total_time = time.time() - start_time
    stats['total_time'] = total_time
    
    # Print summary
    if verbose:
        print("-" * 60)
        print("Conversion Summary:")
        print(f"  Total files: {stats['total']}")
        print(f"  ✅ Successful: {stats['success']}")
        print(f"  ⚠️  Skipped: {stats['skipped']}")
        print(f"  ❌ Failed: {stats['failed']}")
        print(f"  Total time: {stats.get('total_time', 0):.2f}s")
        print(f"  Input size: {format_file_size(stats['total_size'])}")
        print(f"  Output size: {format_file_size(stats['total_output_size'])}")
        
        if stats['errors']:
            print("\nErrors:")
            for error in stats['errors']:
                print(f"  - {error}")
    
    return stats

def format_file_size(size_bytes):
    """
    Format file size in human-readable format.
    
    Args:
        size_bytes: Size in bytes
        
    Returns:
        Formatted string (e.g., "1.5 MB")
    """
    if size_bytes == 0:
        return "0 B"
    
    units = ['B', 'KB', 'MB', 'GB']
    unit_index = 0
    size = float(size_bytes)
    
    while size >= 1024 and unit_index < len(units) - 1:
        size /= 1024
        unit_index += 1
    
    return f"{size:.2f} {units[unit_index]}"

def main():
    parser = argparse.ArgumentParser(
        description='Batch convert MIDI files to JSON format for rhythm game',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Convert all MIDI files in a directory
  python batch_midi_to_json.py /path/to/midi/files
  
  # Convert all MIDI files and save to specific output directory
  python batch_midi_to_json.py /path/to/midi/files -o /path/to/output
  
  # Convert specific files
  python batch_midi_to_json.py song1.mid song2.mid song3.mid
  
  # Convert with custom hold threshold and force overwrite
  python batch_midi_to_json.py /path/to/midi/files -t 0.6 --force
  
  # Convert files from multiple directories
  python batch_midi_to_json.py /path/to/dir1 /path/to/dir2 -o /path/to/output
        """
    )
    
    parser.add_argument(
        'inputs',
        nargs='+',
        help='Input MIDI file(s) or directory(ies) containing MIDI files'
    )
    
    parser.add_argument(
        '-o', '--output',
        dest='output_dir',
        help='Output directory for JSON files (default: same directory as input files)'
    )
    
    parser.add_argument(
        '-t', '--threshold',
        dest='hold_threshold',
        type=float,
        default=HOLD_NOTE_THRESHOLD,
        help=f'Hold note duration threshold in seconds (default: {HOLD_NOTE_THRESHOLD})'
    )
    
    parser.add_argument(
        '-f', '--force',
        action='store_true',
        help='Overwrite existing JSON files without asking'
    )
    
    parser.add_argument(
        '-q', '--quiet',
        action='store_true',
        help='Quiet mode - only show summary'
    )
    
    args = parser.parse_args()
    
    # Validate hold threshold
    if args.hold_threshold <= 0:
        print("Error: Hold threshold must be greater than 0")
        sys.exit(1)
    
    # Run batch conversion
    stats = batch_convert(
        args.inputs,
        output_dir=args.output_dir,
        hold_threshold=args.hold_threshold,
        force=args.force,
        verbose=not args.quiet
    )
    
    # Exit with error code if any conversions failed
    if stats['failed'] > 0:
        sys.exit(1)

if __name__ == "__main__":
    main()

