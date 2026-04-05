# Signal Deck — Next Actions

## New Active Product Direction

Signal Deck should begin with a true blank-start identity gate:

**First question:**
"Who are we working with today?"

This should be the first screen on blank start, allowing the user to enter the artist or band name before entering the app.

## Required Structural Changes

### 1. First-run identity screen
- Blank start should open to a focused artist/band input screen
- This should establish who the workspace belongs to before showing the main product UI
- After artist/band input, route into the home page

### 2. Main navigation shape
The main tabs should be:
- Overview
- Songs
- Notes
- Assets
- Calendar

Release should **not** be a main tab.
It should unlock from song readiness / ready state instead.

### 3. Song readiness flow
- Every song should show progress toward completion
- When song progress reaches 100%, label it **Ready**
- At that point, show a button that routes to the release checklist flow/page

### 4. Release checklist behavior
- Release checklist should come with seeded default items
- It should already contain the common tasks that should be done before a song release
- It should include progress visibility / checkoff behavior
- It should behave like a dedicated release-prep flow, not a permanent top-level destination

### 5. Visual direction reset
UI should move away from generic AI-app aesthetics.
Influence targets:
- Steam
- Chrome
- Spotify

That means:
- darker, cleaner, more product-like shell
- more convincing desktop-app feel
- less floaty AI-dashboard energy
- stronger visual hierarchy
- more grounded, native-feeling surfaces

### 6. Character visuals
Use the images/art of Boxman and Martian in a more intentional way.
They should feel integrated into the product identity, not pasted in as novelty widgets.

## Immediate Implementation Priority

1. Replace launcher-first flow with artist/band identity gate
2. Reshape top-level tabs to: Overview / Songs / Notes / Assets / Calendar
3. Remove Release as top-level nav and instead unlock it from 100% song completion
4. Seed default release checklist items
5. Begin visual redesign toward Steam / Chrome / Spotify inspiration

## Concrete Near-Term Build Priority List

These priorities are meant to improve Signal Deck as a musician app **without drifting into bloated dashboard nonsense**.

### Tier 1 — Fix immediately (stability + trust)

1. **Waveform / marker reliability pass**
   - marker click should always focus the right note context
   - clicking waveform should always prefill time cleanly
   - waveform should reflect real audio duration
   - marker timestamps should be easy to enter and edit
   - marker state should survive refresh / song switches

2. **Active review file selection**
   - each song needs a clearly chosen current review file
   - do not just guess from the first uploaded audio asset
   - user should be able to set which file drives waveform + review

3. **Audio/player serving sanity**
   - local server must serve audio with proper seek/range behavior
   - no more "live broadcast" behavior for normal uploaded files
   - restart / launch flow should be less brittle

4. **Persistence audit for song-detail data**
   - verify markers, notes, tracking items, lyrics, and assets persist correctly
   - verify switching songs and refreshing does not drop context

### Tier 2 — Make it musician-native

5. **Marker editing + resolution flow**
   - edit marker text
   - change timestamp
   - change color/category
   - mark resolved / archived

6. **Audio version structure**
   - support demo / mix / alt mix / master / instrumental / acapella as real roles
   - keep one chosen active review file, not asset chaos

7. **Song identity card**
   - what the song is about
   - emotional target
   - visual lane
   - what still feels unresolved
   - why this song matters

8. **Blockers panel**
   - plain-language read of what is actually holding the song back
   - example: weak chorus lyric, no active mix chosen, open tracking items, no artwork direction

### Tier 3 — High-value artist features that still fit the app

9. **A/B mix review mode**
   - compare two song versions
   - keep notes version-aware
   - help decide whether a revision actually improved anything

10. **Session mode / focus mode**
   - let user choose: writing / tracking / mix review / release prep
   - temporarily narrow the interface to the job at hand

11. **Reference track lane**
   - attach references
   - note arrangement / tone / energy / vocal treatment ideas

12. **Live adaptation notes**
   - acoustic version notes
   - key / capo / tuning / transition notes
   - make it useful for solo artists, not just studio tracking

## Recommended Order of Work Right Now

Work in this order:

1. stabilize waveform + markers
2. add active review file selection
3. tighten persistence and asset roles
4. add marker editing / resolve flow
5. add blockers panel
6. add song identity card
7. only then move to A/B review mode

## Build Philosophy

Do not just patch the old dashboard forever.
Refactor toward the actual product we now understand.
Prioritize features that directly help artists write, review, finish, and release songs.
Avoid fake productivity garnish.
