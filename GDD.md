# Game Design Document — "The Bard's Retinue" *(working title)*

---

## Core Premise

After completing the main quest, the party's bard decides to pursue their true dream: touring the realm with a band. Your character — wizard, fighter, cleric, rogue, etc. — chooses to follow along. What starts as a peaceful retirement becomes a chaotic adventure: fame attracts trouble, and trouble makes for great music.

---

## The Core Loop

```
Travel → Town → Prepare → Perform (rhythm minigame) → Aftermath → Repeat
```

**1. Travel**
Between towns, events happen on the road — random encounters, weather, rival bands, bandits. Decisions here affect the condition you arrive in (morale, instrument quality, HP).

**2. Town**
Explore freely: talk to NPCs, accept side gigs, buy gear, gather rumors about the next location. Each town has a personality (dwarven hall, elven grove, pirate port, noble court) that determines what songs work and what crowd you'll face.

**3. Prepare**
Choose your setlist (3–5 songs), your character's ability loadout (class skills usable mid-song), and negotiate with the venue owner for pay conditions.

**4. Perform (the rhythm minigame)**
The core of the game. Performance quality determines gold earned, reputation gained, and story outcomes. Each gig has a threat level — some nights a drunk starts a fight, a demon possesses the audience, or a rival band hexes your instruments.

**5. Aftermath**
Pay expenses (food, lodging, repairs). Split gold. Manage band morale. Deal with consequences of the night's events.

---

## Character Classes — In-Gig Abilities

Each class brings a unique active ability and a passive bonus to performances:

| Class | Passive | Active Ability |
|---|---|---|
| **Wizard** | Notes slow slightly near judgment line | **Time Warp** — slows note speed for 5s |
| **Fighter** | Combo multiplier never resets on a single miss | **Second Wind** — auto-hits next 3 notes |
| **Cleric** | HP/morale regenerates during Perfect streaks | **Divine Chord** — clears all on-screen notes as Perfect |
| **Rogue** | Double points on first note of each new song section | **Pickpocket** — steals crowd gold mid-song |
| **Ranger** | Wider Perfect timing window | **Eagle Eye** — reveals upcoming notes early |
| **Paladin** | Crowd hostility never increases | **Holy Encore** — brings back a missed note |

The bard (NPC) always plays alongside and contributes their own auto-played lane — adding a 5th track the player doesn't control but benefits from.

---

## The Threat System

Every gig rolls a threat that can interrupt the performance. Threats are mid-song overlays on the rhythm game:

- **Bar Fight** — random notes become "dodge" inputs; missing them hurts morale
- **Rival Band Hex** — note speed randomly spikes for 8 seconds
- **Demon Possession** — the crowd becomes hostile, reversing input keys temporarily
- **Noble's Inspection** — a patron is watching; one missed note ends the bonus round
- **Magical Mishap** — the wizard accidentally cast something; notes split into two
- **Storm** — hold notes become unpredictable in length

Threats scale with the town's danger level and your fame. More famous = more dangerous gigs.

---

## World Structure

Towns are organized in regions, each with a musical identity:

| Region | Venue Type | Musical Style | Unique Threat |
|---|---|---|---|
| Human Heartlands | Taverns & Festivals | Folk, Ballads | Drunken brawls |
| Dwarven Holds | Underground Halls | Heavy, Rhythmic | Structural collapse from bass |
| Elven Groves | Open-air ceremonies | Delicate, Harmonic | Songs must stay below difficulty threshold |
| Pirate Coasts | Ship decks & ports | Sea shanties | Storms, boarding parties |
| Undead Territories | Crypts & ruins | Dark, Slow | Crowd literally tries to eat you |
| Noble Courts | Grand theaters | Classical, Precise | Political consequences for poor performance |

---

## Progression Systems

### Band Reputation (Global & Local)
- **Local**: unlocks better venues in that town, discounts, story quests
- **Global**: unlocks world tour opportunities, legendary venues, high-stakes gigs

### Instrument Upgrades
- Base instruments start simple; upgrades add visual/audio flair and gameplay bonuses (wider timing windows, more score per Perfect, etc.)
- Enchanted instruments: magical properties tied to class (a Fighter's enchanted lute deals actual damage to hostile crowd members)

### Song Library
- Songs are learned from NPCs, bought from bards in other towns, or unlocked by completing story events
- Each song has: genre, difficulty, crowd compatibility, and a special effect (e.g., "The Dirge of Elyndra" pacifies undead crowds)

### Setlist Strategy
- Opening song sets crowd mood
- Encore song (if earned) gives a bonus round with multiplied rewards
- Genre mismatch with crowd reduces tips but might unlock secret reactions

---

## Narrative Arc

**Act 1 — Local Circuit**
Small towns, low stakes. Learn the mechanics. The bard gets a reputation. Trouble is minor: bar fights, petty thieves.

**Act 2 — Regional Fame**
Bigger venues, faction politics. A villain emerges — maybe a rival band sponsored by a dark patron, or a guild trying to control the music industry. Gigs start having real stakes.

**Act 3 — The Grand Tour**
Legendary venues across all regions. The threat escalates to: the bard's music is prophesied to either seal or break an ancient evil. The final gig is the climax — a massive concert that doubles as a ritual.

---

## What Makes It D&D-Flavored

- **Between-gig roleplay moments**: text-based dialogue choices with NPCs (hiring a new roadie, dealing with a cursed instrument, choosing which town faction to side with)
- **Class identity matters**: the Fighter approaches a hostile crowd differently than the Cleric — mechanically and narratively
- **Dice rolls for travel events**: visible randomness, classic tabletop feel
- **Party banter**: short lines from band members between songs based on how the gig went
- **Rest system**: camping vs. inns affects stat recovery, triggering different events

---

## System Architecture (Minigame vs. Full Game)

The rhythm minigame is the core skill loop. Everything else wraps around it:

```
Narrative layer       → story, dialogue, choices
Strategy layer        → setlist, class abilities, preparation
Rhythm layer (built)  → the actual performance
Consequence layer     → reputation, gold, story outcomes
```

The rhythm game doesn't need to be more complex — it just needs more context to make each song feel meaningful.
