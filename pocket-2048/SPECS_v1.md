# Pocket 2048 - SPECS v1

## Concept frame

- Best platform: mobile portrait
- Additional supported platforms: desktop
- Gameplay family: UI / 2D board puzzle
- Game meta: Single Loop
- Input:
  - Mobile portrait: Direct Touch swipe input
  - Desktop: Arrow keys, WASD, swipe-drag with mouse or trackpad
- Category: Games / Puzzle / Number puzzle
- Reference games: 2048 and Threes for gameplay; Stackdrop and Playdrop starter listings as publishing references

Pocket 2048 should feel like a classic that belongs on a high-end phone home screen: immediate, tactile, legible, and calm. It is intentionally close to proven rules because this is an early portfolio title and the goal is a small, polished, public v1 rather than a rules invention exercise.

## Why this platform mix

Mobile portrait is the clear best platform because the game loop is one-handed, swipe-first, and read-mostly. Desktop support survives because the board and score still read cleanly in a centered responsive layout, and the control model is obvious with arrow keys. Mobile landscape is cut because it offers no real upside and weakens the intended framing.

## Core game loop

1. The player lands directly in a live board with two starting tiles already spawned.
2. The player swipes in one of four directions.
3. All tiles slide as far as possible and equal-value neighbors merge once per move.
4. The game spawns one new tile if the board changed.
5. Score increases by the value of merged tiles.
6. The loop continues until no legal moves remain.
7. Reaching 2048 triggers a lightweight win moment, but the player can continue chasing a higher score.

Rules stay very close to classic 2048:

- 4x4 board
- Spawn values 2 and 4
- Deterministic move resolution with single-merge-per-tile behavior
- Loss only when the board is full and no merges remain

## UX and screens

There should be very few screens.

### Gameplay screen

- Edge-to-edge full viewport composition with the board as the dominant element
- Minimal HUD only:
  - current score
  - restart button
- No persistent title, subtitle, tutorial modal, or large stat panel during active play
- A tiny one-line hint can appear before the first move only, then disappear permanently for the session

### Win overlay

- Triggered once when the player first makes 2048
- Shows short celebratory copy, current score, and two actions:
  - continue
  - new run

### Loss overlay

- Triggered when there are no legal moves
- Shows score, best score, and one clear restart action

There is no separate title screen, settings page, instructions page, or scrolling content.

## HUD and interaction details

- Board uses large tap-friendly cells with generous breathing room
- Swipe should accept quick flicks and slower deliberate drags
- Desktop keyboard input should feel instantaneous
- Restart is available but visually quiet
- High score is stored locally and shown on end-state overlays, not as a dominant gameplay stat

## Art direction

The target look is "minimal native luxury":

- Camera / framing: straight-on 2D board, centered vertically with slight top breathing room
- Palette: warm paper background, charcoal text, desaturated jewel accents that brighten as values climb
- Materials: soft glass or lacquered cards with subtle inner highlights and shadows
- Typography: refined sans serif with high contrast in score numerals
- Motion: smooth tile glide, merge pulse, spawn pop, restrained screen shake only on big merges if it still feels elegant
- Orientation: portrait-first proportions tuned so the board feels comfortably thumbable

Gameplay art is code-rendered. No gameplay asset pack is required for the board itself. Marketing art can be produced from the same visual language using AI-assisted compositing for:

- one icon motif built from stacked glowing tiles
- one portrait hero and one landscape hero showing the board and tile energy

## Tech and code structure

- Stack: TypeScript, inline-built single-page app, Playdrop SDK loader, CSS custom properties, no framework
- Playdrop use:
  - initialize the SDK and host loading state cleanly
  - publish through the Playdrop catalogue workflow
  - use Playdrop capture for proof, screenshots, and video
- Local persistence: browser localStorage for best score and dismissed hint state
- Proposed code structure:
  - `src/main.ts`: boot, DOM wiring, app loop
  - `src/board.ts`: pure board state and move logic
  - `src/render.ts`: DOM rendering and animation orchestration
  - `src/input.ts`: swipe and keyboard handling
  - `tests/board.test.ts`: merge logic regression coverage

## Testing

- Automated tests for board move resolution:
  - merge-once behavior
  - score accumulation
  - no-spawn when move is invalid
  - game-over detection
- Manual gameplay pass on:
  - desktop browser with keyboard
  - Playdrop mobile portrait capture
  - desktop pointer drag as a secondary path
- Publish-time validation with `playdrop project validate .`

## Likely simplification targets

If anything threatens polish or schedule, challenge or cut it in this order:

1. Fancy particle effects or screen shake
2. Mouse drag parity if keyboard and touch are already strong
3. Persistent win-state celebration beyond a simple overlay
4. Sound and music
5. Any cosmetic theme-switching or accessibility options beyond core readability
