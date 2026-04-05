---
name: forge-village-roadmap
category: product
description: Complete implementation roadmap for Forge Village website, app features, and growth strategy
---

# Forge Village Roadmap

## Phase 1 — Landing Page Maturity (Week 1-2)
*Goal: Make the landing page actually convert visitors into downloads*

### 1.1 Real App Screenshots
- Walk through the Forge Village app at each major screen
- Take screenshots at: login, dashboard overview, song board, song detail page, calendar/assets tab
- Place them in the walkthrough sections replacing mock UIs
- File size target: 200-400KB each (optimized PNGs)
- Add alt text with actual feature names for SEO
- Implementation: browser_navigate → browser_vision at each screen → save to `/public/screenshots/`
- Risk: Vision credits may be exhausted — fallback: user takes screenshots manually

### 1.2 FAQ Section
- Accordion format (native `<details>`/`<summary>` tags — zero JS dependency, works without JS)
- Group into 3 categories: Getting Started, Technical, Usage
- Top questions for music software:
  - "Does it work offline?" — Yes, 100% local
  - "What audio formats are supported?" — WAV, MP3, FLAC, M4A, AIFF, OGG
  - "Can I share my workspace with collaborators?" — Export/Import ZIP
  - "Is my data safe on my machine?" — Yes, lives in `~/Library/Application Support/forge-village`
  - "Which OS versions are supported?" — macOS 13+ (Apple Silicon), Windows 10+ (64-bit)
  - "Does it make sound or play music?" — No, it's an organizer around your music
  - "How much does it cost?" — Free
  - "Can I use it for commercial projects?" — Yes, your workspace, your projects
- Add JSON-LD FAQ schema for Google rich snippets
- Implementation: 50 lines of vanilla JS for smooth open/close + `<details>` fallback

### 1.3 "Why I Built This" Story Section
- One short paragraph, honest, personal voice
- Suggested copy: "I had 9 songs in various states of completion, lyrics scattered across Notes and voice memos, demo files buried in Downloads, and zero idea which tracks were actually 'done.' I built Forge Village because nothing else existed for the stuff around the music — only tools for making the music itself."
- Place between the problem section and the walkthrough
- Optional: casual headshot or just text (text-only feels more honest actually)
- Implementation: 1 section, ~30 lines of HTML

### 1.4 Changelog Section
- Versioned updates with dates
- Format: `## v2.0.0 — April 2026` with bullet points of what changed
- Shows the project is alive and maintained
- Top 3-4 versions max on the page
- Could pull from git tags + commit messages later
- Implementation: static HTML section, easy to update manually
- Future: auto-generate from server endpoint reading workspace data

### 1.5 Comparison Table
- 3 columns: "In Your Head", "Spreadsheets/Notion", "Forge Village"
- Honest framing — Notion isn't bad, it's just not built for music
- Rows to compare:
  - See all songs at a glance at their current stage
  - Know which instruments still need tracking
  - Timestamped notes on actual audio
  - Lyrics live with the song they belong to
  - Release dates visible and organized
  - Works without internet
  - No monthly subscription
  - Export your own data
  - Built specifically for music projects
- Green checkmarks where Forge Village wins, red X where the other options fail
- Implementation: CSS Grid table, ~80 lines of HTML/CSS

---

## Phase 2 — Content & Community (Week 3-4)
*Goal: Start building an audience and credibility*

### 2.1 Video Walkthrough
**Best approach:**
- Tool: ScreenFlow (Mac) or OBS Studio (free) for capture
- Length: 60-90 seconds for the main landing page video
- Format: Start with problem (5 sec), show the app (45 sec), end with CTA (10 sec)
- Host on YouTube for SEO, embed with "play button overlay" pattern (lazy-load the iframe)
- Also cut a 15-30 second vertical version for TikTok/Reels using CapCut
- Implementation: Record → upload to YouTube → embed on landing page with click-to-load pattern
- Embed code: lazy-load thumbnail from `https://img.youtube.com/vi/VIDEO_ID/maxresdefault.jpg`, swap to `iframe` on click

### 2.2 Discord Community
**Best approach:**
- Name: "Forge Village HQ" or "The Workshop"
- Channel structure:
  - #welcome-and-rules
  - #announcements (updates, releases)
  - #showcase-your-tracks (users share music)
  - #forge-village-feedback (bugs, feature requests)
  - #general-chat (music talk, non-Forge Village stuff)
  - #resources (templates, tips, other tools)
- Growth tactics:
  - Invite link in app (About button → "Join the Discord")
  - Invite link in landing page footer
  - "Discord-only" perk: weekly template drop for members
  - Weekly dev log with screenshot/GIF
- Tools: Carl.bot for auto-moderation + welcome messages
- Implementation: Create server → set up channels → add links to app + site

### 2.3 YouTube Micro-Tutorials
**Format:**
- 3 videos, each under 2 minutes:
  1. "How to track your song's progress in Forge Village"
  2. "Setting up a recording session with the tracking board"
  3. "Managing release dates with the calendar"
- Upload to YouTube, embed on landing page
- Description always includes download link
- This is the #1 discovery channel for music software

### 2.4 Newsletter / Email List
**Best approach:**
- Keep it simple: Buttondown, ConvertKit, or Beehiiv (all have free tiers)
- One signup on landing page: "Get updates on new features and templates"
- Weekly or biweekly email with: one tip, one feature update, one music resource
- Implementation: Add a section in the footer or before the download section
- Goal: 50-100 subscribers in the first month

---

## Phase 3 — App Feature Expansion (Month 2-3)
*Goal: Make Forge Village genuinely useful beyond just organizing*

### 3.1 Template Projects
**Best approach:**
- Versioned JSON manifest + project data
- Start with 3 templates:
  1. "Single Release" — 1 song, release timeline with pre-release content schedule
  2. "EP Project" — 4-6 songs, shared tracking board
  3. "Album Project" — 8+ songs, full production pipeline
- Implementation: Add a "Import Template" button that loads pre-built workspaces
- Future: Template builder so users can export their own templates
- Distribution: Host as downloadable JSON files on GitHub or S3

### 3.2 Search Across Workspace
**Best approach:**
- Search songs (titles, lyrics, notes, stages)
- Search assets (names, types, statuses)
- Search events (titles, dates, types)
- Search workspace notes
- Simple substring search first (no need for full-text search engine yet)
- Trigger: `Cmd/Ctrl + K` — standard keyboard shortcut
- Implementation: ~200 lines of JS on top of existing `cmdOrCtrl+K` handler (already exists!)
- Show results grouped by type with clickable links

### 3.3 Drag-and-Drop File Upload
**Best approach:**
- When a user drags a file onto a song's detail page, auto-attach it as an asset
- Support: audio files, images, PDFs, any type
- Auto-detect type from file extension
- Drop zone shows "Drop to attach to [Song Name]"
- Implementation: HTML5 drag-and-drop API + existing upload endpoint

### 3.4 Export to PDF Report
**Best approach:**
- One song, one PDF: lyrics, tracking status, markers, assets list
- Useful for sending to producers, collaborators, or printing for studio sessions
- Use `window.print()` with a print-specific stylesheet first (simplest)
- Future: `jsPDF` or server-side PDF generation
- Implementation: Print button on song detail page → print-friendly view

### 3.5 Recording Session Checklist Export
**Best approach:**
- "Print tracking board" button that renders a clean, printable checklist
- Instruments with checkboxes — take it to the studio, check off as you record
- Implementation: Print-specific CSS on the tracking board view
- Extremely useful feature — musicians actually go to studios with printouts

---

## Phase 4 — Growth & Distribution (Month 3-4)
*Goal: Get Forge Village in front of the right people*

### 4.1 Launch on KVR Audio
**Best approach:**
- Create a KVR Audio developer account
- Submit with formatted post: screenshots, feature list, download links
- KVR is THE place audio software devs hang out
- One good post = massive targeted traffic

### 4.2 Reddit Launch
**Best approach:**
- Reddit post on r/WeAreTheMusicMakers
- Title: "I built a workspace to organize my music because Notion wasn't cutting it"
- Body: honest story + screenshots + download link
- No spam — just one genuine post
- Follow up in comments with answers to questions

### 4.3 Product Hunt Launch
**Best approach:**
- Submit as a free tool
- Good screenshots, clear tagline: "Your DAW handles the sound. This handles everything else."
- Launch on a Tuesday or Wednesday (highest traffic)
- Respond to every comment
- Ask 5-10 friends to be there for upvotes on launch day

### 4.4 Indie Hackers Post
**Best approach:**
- "I built a local-first music workspace" — dev community
- Focus on the technical story: Express server, plain HTML/CSS/JS, no frameworks
- This audience appreciates "built what I needed" stories

### 4.5 Twitter/X Thread
**Best approach:**
- "I was tired of losing my lyrics in Notes, so I built this:"
- Thread: 1) The problem 2) Screenshots 3) How it works 4) Link
- Tag relevant music tech accounts
- Let it ride organically

---

## Phase 5 — Advanced Features (Month 5-6)
*Goal: Transform from organizer to music workflow platform*

### 5.1 DAW Companion (Long-term, complex)
**Technical reality:**
- DAWs sandbox plugins. Can't directly open browser from VST/AU safely.
- Industry standard approach: Local companion service (Splice, LANDR, iZotope all do this)
- Architecture:
  1. Lightweight local server (the Forge Village app already IS one)
  2. Deep link from any app → `http://localhost:4323/song/[id]`
  3. Optional: system tray icon for quick access
- Recommendation: Don't build a VST. Build a better URL scheme. Musicians can bookmark song pages.

### 5.2 Collaborator Access (Cloud hybrid)
**Best approach:**
- Share a read-only link to a song's detail page
- Or share an export ZIP that imports cleanly on another machine
- Full real-time collaboration requires cloud sync — save this for when you have users
- Start with the "export + share ZIP" approach (already works!)

### 5.3 Affiliate Program (If/when monetized)
**Best approach if you ever add paid features:**
- Use Rewardful (Stripe-native) or built-in referral tracking
- Target: YouTube music educators (5k-50k subs), Instagram producers
- Commission: 25-40% for one-time, 15-25% recurring
- Provide: swipe copy, banner images, unique landing links

---

## Phase 6 — Long-term Vision (Month 6+)

### 6.1 Spotify Integration
- Paste Spotify URL, auto-fetch track info
- Display stream counts (if API access)
- "This song was released" auto-status update

### 6.2 DistroKid/TuneCore Integration
- Connect to your distributor account
- Auto-create release calendar events from upcoming releases
- Show release status (submitted → live → published)

### 6.3 Revenue/Royalties Tracking
- Track income per song (manual entry first)
- Connect to Stripe/Spotify for Artists API later
- Dashboard view: total revenue this month, per-song breakdown

### 6.4 Mobile Companion (Read-only)
- iOS/Android app that just shows your workspace
- Read lyrics, check schedules, view progress
- Not full editing, just reference between studio sessions
- Could be a simple PWA (Progressive Web App) first

### 6.5 Open Source
- Put it on GitHub
- Builds trust, gets contributors
- Signals quality to the dev/music community
- License: MIT or GPL

---

## Implementation Priority Matrix

### Do This Week (Landing Page Fixes):
1. [ ] Real app screenshots (currently blocked — need browser vision credits or manual capture)
2. [ ] FAQ section (~1 hour)
3. [ ] "Why I Built This" story (~30 min)
4. [ ] Changelog section (~30 min)
5. [ ] Comparison table (~2 hours)

### Do This Month (Content + Quick App Features):
6. [ ] Search across workspace (Cmd+K, already partially exists)
7. [ ] Drag-and-drop file upload
8. [ ] Export to PDF / Print reports (~1 hour each)
9. [ ] Template projects (3 starter templates)
10. [ ] Discord community setup (~2 hours)
11. [ ] Record 60-second walkthrough video
12. [ ] YouTube micro-tutorials (3 videos)
13. [ ] Newsletter/email list setup

### Do This Quarter (Growth):
14. [ ] KVR Audio launch
15. [ ] Reddit post
16. [ ] Product Hunt launch
17. [ ] Indie Hackers post
18. [ ] Twitter/X thread

### Save for Later (Complex/Investment):
19. [ ] DAW companion / deep links
20. [ ] Real-time collaboration (cloud sync)
21. [ ] Spotify/DistroKid integration
22. [ ] Revenue tracking
23. [ ] Mobile companion app
24. [ ] Affiliate program (when monetizing)
25. [ ] Open source

---

## Estimated Effort Breakdown

| Phase | Time | Dependencies |
|-------|------|-------------|
| Landing page fixes | 3-5 hours | Real screenshots |
| Content creation | 4-8 hours | Video editing tools |
| Quick app features | 6-10 hours | None |
| Growth/launches | 2-4 hours | Screenshots + video |
| Advanced features | 20+ hours | User base, infrastructure |

## Quick Wins That Need Almost No Effort
- Add version number to landing page footer — Done (v2.0.0, April 2026)
- Add file sizes to download buttons — Done already
- Add "Free" badge next to download buttons
- Add "Works offline" badge
- Add one-sentence "What this is NOT" line in hero
- Add "No email required" text — Done already

## Key Insight from Research

The #1 thing holding this back is **screenshots**. Every single other improvement (comparison table, FAQ, walkthrough, story, changelog) can be done without real screenshots — but having them transforms the page from "looks like a template" to "this is a real product." Second priority is the video walkthrough — a 60-second screen recording is the fastest conversion driver. After that, Reddit launch + KVR Audio post are the highest-impact zero-cost growth channels.
