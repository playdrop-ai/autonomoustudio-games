# Starfold - SPECS v1

## Original Game Name

Starfold

## One-line Player-facing Value Proposition

Swipe whole rows and columns of glowing sigils to weave cascading constellations before ash consumes the shrine.

## Clear Differentiator

The board is manipulated by shifting entire rows or columns one cell at a time. Matches are the consequence of line control, not direct tile swapping, and the board is under constant pressure from ash blockers that must be managed or cleansed.

## Best Platform And Why It Is Best

`mobile portrait`

The game is a one-handed, edge-to-edge vertical board. Portrait makes line gestures feel direct, keeps the board large, and lets the HUD stay minimal.

## Additional Supported Platforms And Why They Still Survive

- `desktop`: mouse drag maps cleanly to the same line-swipe interaction without compromising the portrait-first layout.

## Gameplay Family

Single-screen line-swipe puzzle.

## Game Meta

Endless score chase with escalating ash pressure and combo scoring.

## Input Per Supported Platform

- Mobile portrait: swipe horizontally on a row or vertically on a column; the detected line shifts exactly one cell per gesture.
- Desktop: click-drag with the same rules.

## Game Category And Subcategory

- Category: Puzzle
- Subcategory: Line shifter

## Reference Games We Are Intentionally Close To

- `You Must Build A Boat` for lane-based board control
- `Two Dots` for clean chain readability and satisfying burst timing
- `playdrop/app/starter-kit-match-3` for portrait-friendly board framing and listing completeness

## Core Loop

1. Scan the board for promising line shifts.
2. Swipe one row or column by one cell.
3. Resolve all orthogonal groups of 3 or more identical sigils.
4. Clear matched sigils, drop new sigils in, and chain additional clears.
5. Raise ash pressure after the turn and continue until the shrine is overrun.

## Rules

- Board size: `5 x 6`
- Base sigils: `5`
- Match rule: orthogonal groups of `3+`
- Shift rule: exactly one row or one column moves one cell per gesture
- Gravity: tiles collapse downward after clears and refill from the top
- Pressure: every fourth move creates one ash blocker on the board
- Ash behavior: ash blocks matching, moves with line shifts, and is cleansed when a neighboring match explodes beside it
- Run end: the run ends when the board contains `10` ash blockers

## Main Screens

- Start overlay: title, one-sentence hook, `Play` button
- Gameplay view: score top-left, ash meter top-right, board edge to edge, no persistent instructions during active play
- Run end overlay: score, best score, restart button

## Core Interaction Quality Bar

- The board must be perfectly centered and aligned with even spacing.
- Swipes must snap to the intended row or column without ambiguity.
- A moved line should animate in roughly `140ms` and then hand off smoothly to clears.
- Clears should pop with a bright pulse and short particle burst that reads instantly.
- Refill and chain timing should feel crisp, not mushy or stalled.
- Sigils must stay readable at small mobile sizes with strong contrast against the board.

## Strongest First-minute Feeling

The player should feel clever and quick, like they are tugging on a luminous woven board and setting off small celestial avalanches.

## HUD And Screen Plan

- Active gameplay HUD only shows score and ash pressure
- No side panels
- No framed webpage card around the game
- No persistent tutorial block; any onboarding is temporary overlay copy before the run starts

## Art Direction And Asset Plan

- Deep indigo to ember gradient background
- Velvet-like board slab with thin gold border
- Five custom sigil tokens: sun, moon, wave, leaf, ember
- Ash blockers rendered as cracked charcoal discs with dim orange seams
- Motion polish via glow pulses, soft particles, and subtle board breathing
- Bespoke icon and hero rendered from the same token system as the game

## Tech Approach And Code Structure

- TypeScript single-page app built from the PlayDrop TypeScript template
- `src/main.ts` bootstraps the SDK and app shell
- `src/game/logic.ts` for deterministic board state transitions
- `src/game/render.ts` for canvas rendering and animation state
- `src/game/input.ts` for swipe detection
- `tests/` for logic coverage around matching, gravity, ash placement, and game-over

## Testing Plan

- Deterministic logic tests for line shifting, group detection, collapse/refill, ash cleanse, and loss condition
- `npm run validate`
- `playdrop project validate .`
- Real browser verification on local build for portrait mobile and desktop
- Hosted verification after publish on the same supported surfaces

## Concrete Media Plan

- Icon: one folded glowing sigil on dark cloth
- Hero: diagonal board crop with one row shift in progress and a burst of starlight
- Screenshots: title/start, mid-combo gameplay, near-loss ash pressure state
- Gameplay video: portrait-first capture that starts immediately on real line swipes and shows at least one combo chain plus a tense ash-management moment

## Complexity Likely To Be Challenged In Simplify

- Whether desktop support should stay
- Whether ash should spread in a more complex pattern than fixed turn-based placement
- Whether combo bonuses need special tiles or can rely on score multipliers only
