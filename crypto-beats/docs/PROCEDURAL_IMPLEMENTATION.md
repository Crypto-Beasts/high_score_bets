# Procedural Note Generation - Implementation Guide

## Overview

This system makes each playthrough unique by adding procedural variations to pre-defined note patterns. Bots cannot predict exact timings because each session uses a different random seed.

## How It Works

### Client Side (Game)

1. **Load Base Pattern**: Read JSON file as usual
2. **Generate Variations**: Apply timing jitter, key variations, density modifiers
3. **Use Seeded Random**: Same seed = same variations (for server validation)
4. **Play Game**: Use varied notes instead of base notes

### Server Side (Validation)

1. **Receive Session Seed**: Client sends seed used for variations
2. **Regenerate Pattern**: Server recreates exact same variations
3. **Validate Inputs**: Check if client inputs match expected pattern
4. **Detect Bots**: Flag impossible patterns or perfect accuracy

## Integration Steps

### Step 1: Update GameScene to Use Hybrid Generator

```javascript
// In GameScene.js
import { createHybridGenerator } from '../../utils/audio/hybridNoteGenerator.js';

create(data) {
  // ... existing code ...
  
  // Load base notes from JSON
  const baseNotes = this.cache.json.get(songDataKey);
  
  // Create hybrid generator with variations
  const variationConfig = {
    timingJitter: 10,        // ±10ms timing variance
    keyVariationChance: 0.05, // 5% chance to change key
    densityModifier: 1.0,     // 100% note density
    seed: null                // Random seed (generated automatically)
  };
  
  this.noteGenerator = createHybridGenerator(baseNotes, variationConfig);
  this.sessionSeed = this.noteGenerator.getSessionSeed();
  
  // Use varied notes instead of base notes
  this.songData = this.noteGenerator.getAllNotes();
  
  // ... rest of code ...
}
```

### Step 2: Send Session Seed to Server

```javascript
// After game ends, send to server
const gameResult = {
  score: this.score,
  accuracy: percentageHit,
  sessionSeed: this.sessionSeed,
  inputs: this.recordedInputs, // Record all key presses with timestamps
  song: this.currentSongId,
  difficulty: this.currentDifficulty
};

// Send to server for validation
fetch('/api/submit-score', {
  method: 'POST',
  body: JSON.stringify(gameResult)
});
```

### Step 3: Server Validation

```javascript
// Server-side (Node.js example)
import { validateClientInputs } from './hybridNoteGenerator.js';

app.post('/api/submit-score', async (req, res) => {
  const { sessionSeed, inputs, song, difficulty } = req.body;
  
  // Load base notes for this song
  const baseNotes = await loadSongNotes(song);
  
  // Validation config (must match client config)
  const variationConfig = {
    timingJitter: 10,
    keyVariationChance: 0.05,
    densityModifier: 1.0
  };
  
  // Validate inputs
  const validation = validateClientInputs(
    inputs,
    baseNotes,
    sessionSeed,
    variationConfig
  );
  
  if (!validation.valid) {
    // Flag as suspicious
    return res.json({ 
      success: false, 
      reason: 'Input validation failed',
      accuracy: validation.accuracy 
    });
  }
  
  // Valid - process score
  // ...
});
```

## Configuration Options

### Tournament Mode (Stricter)

```javascript
const tournamentConfig = {
  timingJitter: 5,           // Less variance
  keyVariationChance: 0.02,  // Fewer key changes
  densityModifier: 1.0,      // Full density
  seed: serverGeneratedSeed  // Server controls seed
};
```

### Casual Mode (More Variation)

```javascript
const casualConfig = {
  timingJitter: 15,          // More variance
  keyVariationChance: 0.1,    // More key changes
  densityModifier: 0.9,      // Slightly fewer notes
  seed: null                  // Random seed
};
```

## Benefits

✅ **Anti-Bot**: Each session is unique, impossible to pre-program
✅ **Quality**: Base pattern ensures playable, fun experience
✅ **Validatable**: Server can verify inputs are legitimate
✅ **Flexible**: Easy to adjust variation levels
✅ **Backward Compatible**: Can still use static JSON for casual play

## Advanced: Full Procedural Generation

For maximum unpredictability, use full audio analysis:

```javascript
// Future implementation
import { ProceduralNoteGenerator } from './proceduralNoteGenerator.js';

// Requires Web Audio API integration
const generator = new ProceduralNoteGenerator(
  scene,
  audioContext,
  audioSource,
  difficulty
);

// Generate notes in real-time
const notes = generator.getNotesToSpawn(currentTime, lookAhead);
```

## Migration Path

1. **Phase 1**: Implement hybrid generator for tournaments only
2. **Phase 2**: Add server validation
3. **Phase 3**: Make it default for all gameplay
4. **Phase 4**: Add full procedural generation option

## Testing

```javascript
// Test that same seed produces same variations
const generator1 = createHybridGenerator(notes, { seed: 12345 });
const generator2 = createHybridGenerator(notes, { seed: 12345 });

const notes1 = generator1.getAllNotes();
const notes2 = generator2.getAllNotes();

// Should be identical
console.assert(JSON.stringify(notes1) === JSON.stringify(notes2));
```

## Security Considerations

1. **Seed Generation**: Use cryptographically secure random for tournaments
2. **Config Matching**: Server must use same config as client
3. **Input Recording**: Record all inputs with precise timestamps
4. **Validation Threshold**: Adjust based on difficulty and mode
5. **False Positives**: Allow appeals for legitimate edge cases

