# Shardlight - SPECS v1

## Original Game Name

Shardlight

## One-line Player-facing Value Proposition

Brush open buried chambers, read the clue numbers, and chain clean excavations to reveal glowing relics without cracking a cursed tile.

## Clear Differentiator From The Reference Games

`Shardlight` keeps classic Minesweeper logic intact, but turns it into a phone-native expedition run made of short chained chambers, tactile dig feedback, and visible relic recovery instead of a flat single-board utility puzzle.

## Best Platform And Why It Is Best

`mobile portrait`

The chamber grid wants a tall board with large direct tap targets and no side chrome. Portrait keeps the board dominant, makes long-press marking comfortable with one hand, and gives the run a clear “one more chamber” phone feel.

## Additional Supported Platforms And Why They Still Survive

- `desktop`: left/right click plus chord actions map cleanly to the same rules, and the portrait-oriented chamber can scale up without rewriting layout or input.

## Gameplay Family

Chained excavation puzzle built on classic Minesweeper grammar.

## Game Meta

Endless chamber-to-chamber score run with best-score persistence.

## Input Per Supported Platform

- Mobile portrait:
  - tap covered tile to uncover
  - long-press covered tile to mark or unmark danger
  - tap cleared clue tile to chord when its marked-neighbor count is satisfied
- Desktop:
  - left-click covered tile to uncover
  - right-click covered tile to mark or unmark danger
  - left-click cleared clue tile to chord when its marked-neighbor count is satisfied

## Game Category And Subcategory

- Category: Puzzle
- Subcategory: Logic / excavation

## Reference Games We Are Intentionally Close To

- `Minesweeper` for the exact proven logic grammar and failure rule.
- Mobile-native Minesweeper variants such as `Minesweeper Genius` for proof that the lane can feel good on touch.
- The local `osgameclones` Minesweeper lineage as proof that presentation changes can stay inside a stable, already-legible loop.

## Core Loop

1. Tap into a new buried chamber and open a guaranteed-safe first reveal.
2. Read the clue numbers around the open area.
3. Mark suspected cursed tiles and uncover the remaining safe tiles.
4. Reveal relic fragments while pushing toward a full chamber clear.
5. Bank the clear bonus, move into the next chamber, and keep the run alive until one bad dig ends it.

## Chamber Rules

- Board size: `8` columns by `10` rows
- Chamber count per run: unlimited until failure
- First uncover in each chamber:
  - always safe
  - forced to reveal a zero-region starter
- Neighbor rule:
  - numbers count adjacent cursed tiles in the standard `8`-neighbor Minesweeper pattern
- Marking:
  - optional but strongly supported
- Chording:
  - available after a number is revealed and the marked count matches the clue
- Chamber clear:
  - uncover all safe tiles
  - marking every cursed tile is not required for clear
- Loss rule:
  - uncovering any cursed tile ends the entire expedition run instantly

## Run Structure

- Chamber `1` starts at `10` cursed tiles
- Hazard count rises by `1` every cleared chamber until it caps at `18`
- Score:
  - safe uncover: `10`
  - relic fragment: `75`
  - chamber clear bonus: `250 * current chamber`
- Best score persists locally
- The next chamber loads immediately after a short clear flourish so the run keeps momentum

## Relic Layer

- Each chamber hides `3` relic fragments on safe tiles
- Fragments reveal automatically when those safe tiles are uncovered
- Fragments are bonus scoring and visual payoff only
- They never change the underlying clue logic

## Main Screens And What Each One Shows

- Start overlay:
  - centered title
  - one-line pitch
  - `Play` button
  - a visible live chamber board behind the overlay
- Gameplay view:
  - board edge to edge
  - score top-left
  - chamber depth top-right
  - small relic fragment row tucked into the top rail
- Run-end overlay:
  - final score
  - chambers cleared
  - best score
  - `Retry` button
  - visible failed chamber still readable behind the overlay

## Core Interaction Quality Bar

- Tiles must be large enough for confident thumb taps on portrait phones with no ambiguous touch targets.
- Covered, revealed, marked, and exploded states must be readable instantly from shape, contrast, and motion, not only from tiny labels.
- Number glyphs must stay crisp and balanced on every surface; no cramped or blurry clue states.
- Flood reveals should feel satisfying and quick, with short dust motion and no sluggish cascade.
- Long-press marking must have a clear threshold and obvious feedback so it never feels like a missed tap.
- Chord actions must feel safe and deliberate, never like a hidden trick the player has to discover accidentally.
- The board, HUD rail, and overlays must align cleanly with no “webpage card” framing.

## HUD And Screen Plan

- Active gameplay HUD is minimal: score, chamber depth, and relic row only
- No side panels, settings drawers, or persistent tutorial block during active play
- The board owns almost the full viewport
- Start and run-end overlays sit on top of the live chamber without covering the whole board

## Art Direction And Asset Plan

- Warm sandstone chamber with carved seams and slightly beveled excavation tiles
- Revealed safe tiles read like brushed stone with engraved clue digits
- Marked danger tiles use a sharp obsidian shard marker instead of a generic flag
- Relic fragments glow amber beneath the dust and flare briefly when uncovered
- Clear states use short dust and light pulses rather than big fireworks
- Listing art reuses the same sandstone, amber, and obsidian language as the live board

## Tech Approach And Code Structure

- TypeScript app based on the PlayDrop TypeScript template
- Render path:
  - HTML + CSS board for simple responsive layout and direct pointer handling
  - light SVG or CSS effects for dust, glow, and highlight flourishes
- Suggested file split:
  - `src/main.ts`: bootstrap, app shell, persistence wiring
  - `src/game/model.ts`: tile/chamber/run types
  - `src/game/generate.ts`: chamber generation with guaranteed safe first reveal
  - `src/game/logic.ts`: uncover, mark, chord, scoring, chamber clear, and run progression
  - `src/ui/render.ts`: DOM render and overlay updates
  - `src/ui/input.ts`: tap, long-press, and desktop pointer handling
  - `tests/*.test.ts`: deterministic chamber and scoring coverage

## Testing Plan

- Deterministic logic tests for:
  - cursed-tile placement after first tap
  - neighbor count correctness
  - flood reveal behavior
  - mark/unmark transitions
  - chord safety
  - chamber clear detection
  - score and chamber progression
- `npm run validate`
- `playdrop project validate .`
- Local browser checks on portrait mobile and desktop
- Hosted verification on both supported surfaces after publish

## Target Player Session Length, Target Skilled Run Length, And Replayability Plan

- Casual target median run: `60` to `120` seconds
- Skilled target median run: `300` seconds or more
- Skilled `p25` target: `240` seconds or more
- Replayability comes from fresh chamber generation, pressure from rising hazard density, faster expert play through confident chording, and best-score chase across deeper expedition runs

## Scripted Balance Sweeps For This Endless Score Game

- `idle` policy:
  - makes no marks
  - only takes the forced first reveal
  - used to prove the run dies immediately without competent play
- `casual` policy:
  - marks only high-certainty cursed tiles
  - uncovers only when one safe move is clearly inferable
  - hesitates between actions to simulate ordinary human pace
- `expert` policy:
  - plays the same inference set aggressively
  - uses chord actions when safe
  - minimizes idle time between decisions
- Acceptance targets:
  - casual median `60` to `120` seconds
  - expert median `300` seconds or more
  - expert `p25` `240` seconds or more

## Strongest Raw Screenshot, Clip, Or First-15-second Beat

- The run should open on a satisfying first flood reveal that exposes a warm chamber corner, a few crisp clue numbers, and one amber fragment glowing under the dust.
- Within the first `15` seconds, the player should uncover enough of the chamber to read the logic, mark one obsidian danger tile, trigger one clean chord, and see the chamber clear into the next dig site.
- The strongest raw screenshot should show a partly opened sandstone chamber with clean number spacing, one or two obsidian markers, and a visible amber relic fragment under active excavation.

## The Failure Condition That Sends The Project Back To 01-idea

- If the first playable build still reads like a generic utilitarian Minesweeper clone, or the chained expedition framing does not make the first `15` seconds look more desirable than opening a standard single board, the concept goes back to `01-idea` instead of being rescued by nicer art or better listing copy.

## Concrete Media Plan For Icon, Hero, Screenshots, And Gameplay Video

- Icon:
  - full-bleed amber shard emerging from cracked sandstone with an obsidian danger marker
- Hero:
  - glowing relic chamber mid-excavation with the `Shardlight` title centered in the composition band
- Screenshots:
  - early flood reveal with crisp clue digits
  - mid-run chamber with relic fragments and marked danger tiles
  - late-run deeper chamber with denser hazard field
- Gameplay video:
  - start on real gameplay immediately
  - show first flood reveal, one mark, one chord, one relic uncover, and one chamber clear into the next board

## Complexity Likely To Be Challenged In The Simplify Step

- Whether the `3` relic fragments add enough value to keep
- Whether chording should remain in v1 or ship as a post-v1 refinement
- Whether the chamber-depth HUD needs both depth and relic tracking during active play
