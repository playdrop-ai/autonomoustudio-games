# Wordbraid v1

## Original Game Name

Wordbraid

## One-line Player-facing Value Proposition

Pluck letters from five glowing ribbons, braid them into sharp 3-to-5-letter words, and keep the press from jamming with ink.

## Clear Differentiator

The player does not search a board or shuffle a rack. Each of the five ribbons is an independent visible queue. A word is built by consuming the front tile from any ribbon, including the same ribbon multiple times as it advances. Because only used ribbons change, every word is both a score decision and a state-shaping planning move.

## Best Platform And Why It Is Best

`mobile portrait`

The five-ribbon layout reads naturally as a vertical loom. One-thumb taps on tall lanes are precise, the queue previews remain readable, and the run feels good in short phone sessions.

## Additional Supported Platforms And Why They Still Survive

- `desktop`
  - Desktop survives because the same direct-tap layout works cleanly with a mouse and keyboard without changing the rules or bloating the HUD.

## Gameplay Family

Single-screen word-planning arcade.

## Game Meta

Endless score chase with rising ink pressure.

## Input Per Supported Platform

- Mobile portrait:
  - Tap a ribbon to pull its front tile into the tray.
  - Tap `WEAVE` to submit.
  - Tap the tray tail to undo the last tile.
  - Tap `CLEAR` to empty the tray.
- Desktop:
  - Click ribbons and buttons directly.
  - `Enter` submits.
  - `Backspace` removes the last tile.
  - `Escape` clears the tray.

## Game Category And Subcategory

- Category: Puzzle
- Subcategory: Word arcade

## Reference Games We Are Intentionally Close To

- `SpellTower` for sustained one-more-word tension only.
- `Letterpress` for tactile tile feel only.
- `playdrop/app/infinite-trivia` for clean portrait shell expectations on PlayDrop.
- `playdrop/app/starter-kit-match-3` for realistic TypeScript canvas scope and packaging.

## Core Loop

1. Read the five ribbon fronts and the next few letters visible below them.
2. Pull 3 to 5 letters into the tray to form a valid word.
3. Submit the word.
4. Score points based on length, rare letters, and combo.
5. Used ribbons advance and refill from the deterministic letter bag.
6. Ink pressure rises.
7. Words of length 4 and 5 scrub ink from the most threatened ribbon.
8. Repeat until ink reaches the front of any ribbon and jams the press.

## Exact Rules

- Only the front tile of a ribbon can be selected.
- The same ribbon may be used multiple times in one word as long as its next front tile continues the word.
- Valid words are 3, 4, or 5 letters from the shipped dictionary.
- 3-letter words score and advance the run but do not scrub ink.
- 4-letter words scrub `1` ink tile from the most threatened ribbon.
- 5-letter words scrub `2` ink tiles from the most threatened ribbon.
- After every submitted word, `1` new ink tile is inserted at the back of a ribbon chosen by the difficulty script.
- The run ends immediately if an ink tile reaches the selectable front position of any ribbon.

## Quality Bar For The Core Interaction

- Ribbon alignment must be exact so the five columns read as one coherent machine, not five floating cards.
- Front tiles need clear size dominance over the preview queue, with enough spacing that the player instantly knows which tile is selectable.
- Tile pull motion should feel crisp and physical: 110-150 ms lift, a short settle into the tray, and a clean queue slide on the source ribbon.
- Submit feedback must visibly confirm success: tray stamp flash, score pulse, and ribbon advance.
- Ink threat must be glanceable at all times without text explanation.
- During active play only score, combo, and ink state belong on the HUD.
- The strongest feeling in the first minute should be "I can see future letters, so every word changes tomorrow's board."

## Main Screens And What Each One Shows

- Start screen:
  - Title
  - One-sentence value proposition
  - `START` CTA
  - Tiny control hint
- Gameplay:
  - Full-viewport ribbon board
  - Top strip with score, combo, and ink warning
  - Bottom tray with `WEAVE` and `CLEAR`
- Game-over:
  - Final score
  - Best score
  - Best combo
  - `PLAY AGAIN`

## HUD And Screen Plan

- No side panels.
- No scrolling text.
- No permanent tutorial overlay.
- No mode select for v1.
- The HUD remains inside safe top and bottom bands, leaving the middle almost entirely to the ribbon board.

## Art Direction And Asset Plan

- Deep ink-blue backdrop with subtle paper grain.
- Ivory letter tiles with crisp dark glyphs and a slightly beveled edge.
- Gold threads behind the ribbons to reinforce the braid metaphor.
- Copper and crimson accents for combo and danger.
- Bespoke 2D rendering in canvas; no dependency on runtime-loaded art packs for the game view.
- Procedural ambient audio bed plus short generated or hand-built UI SFX if time permits.

## Tech Approach And Code Structure

- Base project: `playdrop/app/typescript_template`
- Rendering: single full-viewport canvas plus minimal DOM buttons for tray actions if needed
- Data:
  - deterministic seeded PRNG
  - weighted letter bag
  - shipped compact dictionary for 3-to-5-letter words
- Core modules:
  - `src/main.ts` for app bootstrap and loop
  - `src/game/state.ts` for ribbon state and scoring
  - `src/game/dictionary.ts` for validation and solver helpers
  - `src/game/generator.ts` for refill and viability checks
  - `src/render/` for board, HUD, and motion
  - `src/audio/` for optional minimal SFX hooks
- Persistence:
  - local best score only for v1

## Testing Plan

- TypeScript typecheck
- Local build
- `playdrop project validate .`
- Deterministic rules tests for:
  - valid and invalid words
  - ribbon advancement
  - ink insertion and scrub
  - game-over when ink reaches front
- Scripted balance sweep:
  - idle policy: always submit the first available 3-letter word or stall when none exist
  - casual policy: choose a mid-score valid word with modest delay bias
  - expert policy: choose the highest-evaluated valid word up to length 5
- `playdrop project capture` for mobile portrait and desktop before publish
- `playdrop project capture remote` after publish for live verification

## Target Session Length, Skilled Run Length, And Replayability Plan

- Target fresh-player session: 6 to 10 minutes across multiple retries
- Target casual run median: 60 to 120 seconds
- Target expert run median: 300 seconds or more
- Target expert p25: 240 seconds or more
- Replayability plan:
  - endless seeded runs
  - best-score chase
  - combo optimization
  - different viable words from the same visible queues

## Endless Score Balance Sweeps

- The game is an endless score game.
- We will ship `scripts/balance-report.mjs` to run at least 200 seeded runs each for idle, casual, and expert policies.
- Acceptance targets:
  - idle policy should fail fast enough to prove the game is not self-playing
  - casual median should land inside 60-120 seconds
  - expert median should be 300 seconds or more
  - expert p25 should be 240 seconds or more
- If the targets miss, tune ink cadence, scrub rewards, and letter distribution before the gameplay gate passes.

## Concrete Media Plan

- Screenshots:
  - one strong active gameplay shot with a high combo and visible ink threat
  - one near-loss shot showing a jammed ribbon almost at the front
- Hero art:
  - build from a real gameplay screenshot
  - emphasize five glowing ribbons, ivory tiles, copper ink, and the title centered
- Icon:
  - close crop of one illuminated tile braid with copper ink and a single hero glyph
- Gameplay video:
  - landscape capture from the real build
  - open immediately on active play
  - show one safe 3-letter word, one 5-letter scrub, and one near-jam recovery

## Complexity Likely To Be Challenged In The Simplify Step

- any special tiles beyond plain letters and ink
- extra game modes
- audio generation work beyond basic polish
- advanced profile or leaderboard integrations
- support for more than mobile portrait plus desktop
