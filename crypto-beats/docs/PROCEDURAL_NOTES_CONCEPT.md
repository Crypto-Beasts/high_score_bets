# Procedural Note Generation - Anti-Bot System

## Concept Overview

Instead of pre-defined JSON note patterns, generate notes in real-time based on live audio analysis. This makes each playthrough unique and impossible for bots to predict.

## How It Works

### 1. Real-Time Audio Analysis

Use **Web Audio API** to analyze the audio stream as it plays:

```javascript
// Audio features to extract:
- Beat Detection (when beats occur)
- Frequency Analysis (which frequencies are prominent)
- Energy/Amplitude (loudness at each moment)
- Spectral Centroid (brightness of sound)
- Onset Detection (when new sounds start)
```

### 2. Note Generation Algorithm

Generate notes based on detected audio features:

```javascript
// Generation rules:
- Beat Detection → Spawn note on detected beat
- Frequency Bands → Map to keys (W/A/S/D)
  - Low frequencies (bass) → W key
  - Mid-low → A key
  - Mid-high → S key
  - High frequencies (treble) → D key
- Energy Peaks → Spawn multiple notes or hold notes
- Onset Detection → Spawn note when new sound starts
```

### 3. Unpredictability Factors

Each playthrough is unique because:

- **Timing Variance**: Beat detection has slight variance (±5-10ms)
- **Randomization**: Add controlled randomness to note selection
- **Adaptive Difficulty**: Adjust note density based on player performance
- **Dynamic Patterns**: Notes adapt to music's energy levels

## Technical Implementation

### Audio Analysis Pipeline

```
Audio File → Web Audio API → AudioContext → AnalyserNode
    ↓
Real-time Analysis (every frame):
    - FFT (Fast Fourier Transform) for frequency analysis
    - Beat detection algorithm
    - Energy calculation
    - Onset detection
    ↓
Note Generation Engine:
    - Map audio features to note patterns
    - Apply difficulty modifiers
    - Add randomization
    ↓
Spawn Notes in Game
```

### Key Technologies

1. **Web Audio API**
   - `AudioContext` - Main audio processing
   - `AnalyserNode` - Real-time frequency analysis
   - `ScriptProcessorNode` or `AudioWorklet` - Custom processing

2. **Beat Detection Algorithms**
   - Energy-based detection
   - Frequency-domain analysis
   - Machine learning models (optional)

3. **Note Mapping Logic**
   - Frequency bands → Keys
   - Energy levels → Note density
   - Timing → Note spawn times

## Implementation Phases

### Phase 1: Basic Beat Detection
- Detect beats in real-time
- Spawn notes on detected beats
- Simple frequency-based key mapping

### Phase 2: Advanced Analysis
- Multi-band frequency analysis
- Energy-based note density
- Hold note detection (sustained frequencies)

### Phase 3: Adaptive Generation
- Difficulty-based note density
- Performance-adaptive patterns
- Dynamic randomization

### Phase 4: Server-Side Validation
- Server generates expected notes
- Validates client inputs match
- Detects bot patterns

## Advantages

✅ **Anti-Bot**: Impossible to pre-program patterns
✅ **Dynamic**: Each playthrough is unique
✅ **Adaptive**: Can adjust to player skill
✅ **Scalable**: Works with any audio file
✅ **Fair**: Same audio = similar experience, but not identical

## Challenges

⚠️ **Complexity**: More complex than static JSON
⚠️ **Performance**: Real-time analysis is CPU-intensive
⚠️ **Consistency**: Need to ensure similar experience across plays
⚠️ **Quality**: Generated patterns must feel good to play

## Hybrid Approach (Recommended)

Combine both methods:

1. **Pre-generated Base Pattern** (from JSON)
   - Ensures consistent, playable patterns
   - Hand-crafted for quality

2. **Procedural Variations** (real-time)
   - Add randomization to timing
   - Vary note selection slightly
   - Adjust density dynamically

3. **Server Validation**
   - Server knows base pattern + variation rules
   - Validates client inputs are within expected range
   - Detects impossible patterns

## Example: Hybrid System

```javascript
// Base pattern from JSON (known to server)
const basePattern = [
  { time: 1.0, key: "W", baseTime: 1.0 },
  { time: 1.5, key: "A", baseTime: 1.5 },
  // ...
];

// Real-time variations (unpredictable)
const variations = {
  timingJitter: ±10ms,  // Random timing offset
  keyVariation: 5%,     // 5% chance to change key
  densityModifier: 0.9-1.1, // Dynamic density
};

// Server validates:
// - Input timing within baseTime ± jitter range
// - Key matches base or valid variation
// - Overall pattern is human-like
```

## Next Steps

1. **Prototype Audio Analysis**
   - Implement basic beat detection
   - Test with sample audio files

2. **Note Generation Engine**
   - Map audio features to notes
   - Test playability

3. **Server Integration**
   - Design validation system
   - Implement anti-cheat checks

4. **Tournament Mode**
   - Use procedural generation for tournaments
   - Keep static JSON for casual play

