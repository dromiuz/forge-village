# Signal Deck — Build Log

_Last updated: 2026-03-27 late night_

This file is the live shipyard log for Signal Deck.
If you want to know what is happening without asking in chat, start here.

## Current Build Focus

**Main active goal:**
Make Signal Deck feel lighter and more intentional on first open.

That means current work is focused on:
- reducing the clunky / overloaded first impression
- building a cleaner starting flow
- keeping the depth while hiding more of it until needed
- preventing cross-project / cross-file confusion

## Canonical Project

**Signal Deck lives here:**
`~/Desktop/Signal Deck`

This is the one true active build folder.
Older prototypes or alternate folders should be treated as reference-only.

## Current Live App

**Live local app URL:**
`http://127.0.0.1:4325`

**Main live app files:**
- `app/public/index.html`
- `app/server.js`
- `app/data/music-workspace.json`

## What Was Fixed Recently

### Project drift / folder confusion
- Confirmed the canonical project is `~/Desktop/Signal Deck`
- Stopped treating workspace prototypes as the primary build target

### Bad seeded data problem
- Removed Zach-specific seeded state from the active app data
- Current active workspace now opens blank by default

### Save / load direction
- Added real project controls in the live app:
  - New blank project
  - Save project file
  - Load project
  - Export JSON
  - Import JSON

### Product direction correction
- Reframed the app as a tool for **independent musicians generally**
- Removed the incorrect overfit toward Zach-specific product state

### Character integration
- Boxman + Martian now have a more comic-style treatment:
  - character panels
  - speech-bubble style UI
  - light motion / floating feel
- This is still early, but it is moving in the right direction

## What Is Working Right Now

- Blank-start workspace
- Song creation/editing/deletion
- Song-specific release logic
- Song-specific assets
- Release checklist
- Event/calendar system
- Save project file
- Load saved project
- Import/export JSON project files
- Live local app server

## What Still Needs Work

### 1. First-run UX is still a little too heavy
The app is better, but still shows too much too fast.

The next important UX change is:
**"Where would you like to start?"**

That should route users into lighter starting lanes instead of dropping the whole system on them immediately.

### 2. Split-brain entry file issue
The stale `app/index.html` ghost entry has now been neutralized.

- It no longer contains the old hardcoded prototype/Zach-specific state.
- It now redirects users to the live app server and clearly explains that the real app is the served build.
- The real live app remains:
  - `app/public/index.html`

This removes the worst source of false cross-state confusion.

### 3. UX polish
Need to continue simplifying:
- visual density
- entry decisions
- progressive disclosure
- route clarity

## Best Next Moves

1. Refine the new **"Where would you like to start?"** launcher so it behaves intelligently for truly blank vs active workspaces
2. Add stronger contextual empty states so each lane tells the user what to do next
3. Tighten project file management (save, load, import) into a cleaner workflow with less JSON-exposed roughness
4. Keep Boxman + Martian functional, not gimmicky

## New Progress — 2026-03-28 afternoon

### First-run launcher added
- Added a real launch overlay to `app/public/index.html`
- The app now opens with a lighter **"Where would you like to start?"** entry layer instead of dumping the whole interface at once
- Added focused start lanes for:
  - Start a new song
  - Work on a song in progress
  - Prepare a release
  - Organize assets + content
  - Plan shows or deadlines
  - Load or import a project

### Launch behavior
- Added launch controls for:
  - Start a new blank project
  - Open saved projects
  - Enter full workspace
- Added routing logic so launch lanes move the user into the relevant tab
- New blank project from the launcher now routes directly into song creation
- Release lane now respects the product rule that release planning stays locked until the selected song reaches 100% completion

### UI / feel
- Added overlay styling in `app/public/styles.css`
- The launcher keeps the product feeling software-first while still using the Boxman / Martian tone layer
- Improved blank-workspace honesty by removing stray test event state from the active workspace
- Began making Boxman / Martian more context-aware so they do not both talk all the time in every tab
- Added clearer release-lock behavior in both the launcher and song detail so the app visibly enforces the “100% before release” rule
- This is a real improvement to first-open clarity, but it still needs smarter logic for what counts as a truly blank workspace and more selective character behavior

## Blunt Product Read

Signal Deck is no longer mainly suffering from confusion about what it is.
That part is getting clearer.

Now the main problem is:
**how to make it feel lighter without making it shallow.**

That is a much better problem to have.

## If You See Something Weird

If the app ever shows old Zach-specific data again, check this first:
- Are you opening the live app at `http://127.0.0.1:4325`?
- Or are you opening the stale `app/index.html` file directly?

The live app is the real current build.
The stale file is one of the remaining ghosts.
