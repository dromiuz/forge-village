# Signal Deck — Status

## Current State

Signal Deck is an active local-first musician app project.

It is currently in a **product-definition-through-implementation** phase.
The app exists and runs locally, but the product structure is still being reshaped to match the clearer direction established across recent work.

## What Exists Right Now

- Canonical project folder: `~/Desktop/Signal Deck`
- Active local app code folder: `app/`
- Local app server is running
- Current live app URL: `http://127.0.0.1:4323`

## Product Direction Now

Signal Deck should be:
- song-first
- local-first
- blank on first open
- reusable for any musician
- identity-first on startup (artist/band entered first)
- visually more like a real desktop product
- less like a generic AI dashboard

## Navigation Direction Now

Top-level tabs should become:
- Overview
- Songs
- Notes
- Assets
- Calendar

Release should no longer behave like a permanent top-level tab.
It should unlock from song readiness when a song reaches 100% completion.

## Current Rules Confirmed

- Release stays locked until selected song reaches **100% completion**
- Character layer should be restrained and context-aware
- Boxman and Martian should feel integrated, not gimmicky

## What Is Partly Implemented

- Blank-start behavior
- Project save/load/import/export
- Song CRUD
- Assets CRUD
- Calendar/events
- Readiness display
- Release lock rule in current UI
- Context-aware character behavior started

## What Is Still In Transition

- First screen should become: "Who are we working with today?"
- Main tab model still needs to shift to Notes instead of Release
- Dedicated release flow still needs to be restructured around ready songs
- Default release checklist still needs to be seeded
- Visual design still needs stronger Steam / Chrome / Spotify influence

## Main Build Rule

Signal Deck should now be treated as a real software build undergoing product correction.
Do not keep layering random dashboard features on top of the old structure.
Refactor toward the clarified product model.
