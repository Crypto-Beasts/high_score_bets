# Split-Screen Spectator View - Concept

## Idea Overview

Show both players' gameplay side-by-side in real-time, so you can see exactly how your opponent is playing.

## Visual Layout Options

### Option 1: True Split-Screen (50/50)
```
┌─────────────────────┬─────────────────────┐
│                     │                     │
│      YOU            │    OPPONENT         │
│                     │                     │
│   [Your Notes]      │  [Their Notes]      │
│   [Your Keys]       │  [Their Keys]       │
│                     │                     │
│   Score: 1,234      │  Score: 987         │
│   10x COMBO         │  5x COMBO           │
└─────────────────────┴─────────────────────┘
```

### Option 2: Main View + Mini View (70/30)
```
┌───────────────────────────┬──────────────┐
│                           │              │
│        YOU (Main)         │  OPPONENT   │
│                           │  (Mini)     │
│   [Full Gameplay]         │  [Compact]  │
│                           │              │
│   Score: 1,234            │  Score: 987  │
│   10x COMBO               │  5x COMBO   │
└───────────────────────────┴──────────────┘
```

### Option 3: Picture-in-Picture
```
┌─────────────────────────────────────────┐
│                                         │
│              YOU (Full)                 │
│                                         │
│   [Your Gameplay]                        │
│                                         │
│   ┌─────────────┐                       │
│   │  OPPONENT   │  (Small overlay)      │
│   │  [Mini]     │                       │
│   └─────────────┘                       │
└─────────────────────────────────────────┘
```

## Technical Implementation

### What Needs to Be Sent

1. **Input Events** (Key presses with timestamps)
   ```javascript
   {
     key: "W",
     timestamp: 1234.567,
     noteTime: 1.234,  // When note should be hit
     quality: "perfect" | "good" | "miss"
   }
   ```

2. **Game State Updates** (Periodic sync)
   ```javascript
   {
     score: 1234,
     combo: 10,
     currentTime: 45.2,  // Game time
     notesHit: 50,
     misses: 2
   }
   ```

### Client-Side Replay System

1. **Receive opponent's inputs**
2. **Spawn notes on opponent's side** (same timing as their game)
3. **Replay their key presses** visually
4. **Show their feedback** (Perfect/Good/Miss)
5. **Update their score/combo** in real-time

### Performance Considerations

- **Reduced detail on opponent side**: Fewer particles, simpler effects
- **Lower update rate**: Update opponent view at 30fps instead of 60fps
- **Culling**: Only render visible notes
- **Object pooling**: Reuse note sprites for both sides

## Benefits

✅ **Transparency**: See exactly how opponent is playing
✅ **Engagement**: More exciting than just numbers
✅ **Fairness**: No accusations of cheating
✅ **Learning**: See how good players play
✅ **Competitive**: Adds pressure seeing them do well

## Challenges

⚠️ **Network bandwidth**: Sending all inputs increases data
⚠️ **Synchronization**: Need to keep replay in sync
⚠️ **Performance**: Rendering two game views
⚠️ **Complexity**: More code to maintain

## Recommended Approach

**Option 2: Main View + Mini View (70/30)**

- Your side: Full detail, full gameplay
- Opponent side: Simplified, compact view
- Shows their notes, hits, score, combo
- Less performance impact
- Still very engaging

## Implementation Phases

### Phase 1: Basic Replay
- Send key press events
- Show opponent's notes spawning
- Show their hits (simplified)

### Phase 2: Enhanced Replay
- Show their feedback (Perfect/Good/Miss)
- Show their combo streaks
- Animate their key presses

### Phase 3: Full Split-Screen
- True 50/50 split
- Full detail on both sides
- Performance optimizations

## User Preference

Add option in settings:
- **Spectator Mode**: On/Off
- **View Style**: Split-Screen / Mini-View / Numbers Only

