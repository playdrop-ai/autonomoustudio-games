# Relayline - SPECS v1

## Original Game Name

Relayline

## One-line Player-facing Value Proposition

Read the overload counts, reveal safe cells, and complete a glowing circuit from source to relay before three surges end the board.

## Clear Differentiator From The Reference Games

The player is still using a proven `Minesweeper`-style deduction grammar, but the board is judged by one visible objective: connect the live source node to the relay. That changes first-minute play from total cleanup to route planning, and every safe reveal has a visible current payoff instead of feeling like dead maintenance.

## Best Platform And Why It Is Best

`mobile portrait`

Portrait keeps the board tall enough for a meaningful route, keeps the source-to-relay objective readable in one glance, and leaves room for one explicit flag control in thumb reach without shrinking the cells into a desktop clone.

## Additional Supported Platforms And Why They Still Survive

- `desktop`: click input maps cleanly to the same reveal/flag grammar, and the portrait board can sit centered in a full-viewport stage without inventing extra side chrome or weakening the phone layout.

## Gameplay Family

Single-board deduction route puzzler.

## Game Meta

One generated board per run, three difficulty presets, local best-time tracking per difficulty, and no extra progression systems in v1.

## Input Per Supported Platform

- Mobile portrait:
  - Primary action: tap a covered cell to reveal it.
  - Secondary action: tap the persistent flag chip, then tap a cell to mark or unmark it as a shorted node.
  - High-stakes taps: reveal never hides behind long-press; the flag action is explicit and visible at all times.
- Desktop:
  - Primary action: left-click a covered cell to reveal it.
  - Secondary action: right-click a covered cell to flag it, or press `F` to toggle a persistent flag mode.

## Game Category And Subcategory

- Category: Puzzle
- Subcategory: Deduction / route builder

## Reference Games We Are Intentionally Close To

- `Minesweeper` for the exact hidden-hazard clue grammar.
- `Hexcells` for premium clue readability and stronger route-oriented board scanning.
- The `Minesweeper` references in `/Users/oliviermichon/Documents/osgameclones` as proof that the lane is deeply proven and immediately legible.

## Core Loop

1. Pick a difficulty from the start screen.
2. Read the visible source node at the top and the relay target at the bottom.
3. Reveal covered cells to expose safe conductors and overload counts.
4. Flag cells that logic identifies as shorted hazards.
5. Use zero cascades and clue reasoning to extend the safe network.
6. Complete an orthogonally connected lit path from source to relay before the third overload surge ends the run.

## Final Rules For The Planned v1

- The board contains covered cells, safe conductor cells, and hidden shorted cells.
- The source node and relay node are always visible and always safe.
- Revealing a safe cell shows a clue number from `0` to `8` counting adjacent shorted cells in the standard `Minesweeper` neighborhood.
- Revealing a `0` floods outward through adjacent safe `0` cells and opens their border clues.
- Flagged cells cannot be revealed until unflagged.
- Revealing a shorted cell:
  - consumes `1` of the `3` available surges
  - burns that cell into a clearly dead red state
  - leaves the board active so the player can still route around it
- Current travels only through orthogonally adjacent revealed safe cells.
- A revealed safe cell lights up when it becomes connected to the live source network.
- The board is won when the lit source network reaches the relay node.
- The board is lost on the third overload surge.
- Difficulty presets:
  - `Warm`: `8 x 10` board, `10` shorted cells
  - `Live`: `9 x 13` board, `20` shorted cells
  - `Deep`: `10 x 16` board, `32` shorted cells
- Each generated board must guarantee:
  - source and relay are safe
  - at least one valid safe route exists
  - no degenerate opening where the route is already complete

## Hazard, Reward, And Fail-state Signifiers

- Reward:
  - lit cyan path segments
  - relay glow intensifying as current gets close
  - clean zero cascades opening dark space into readable conductor lanes
- Hazard:
  - amber flags marking suspected shorts
  - red burnt cells after an overload hit
  - surge pips that drain visibly from safe cyan to warning red
- Fail state:
  - the third overload surge blows the board and freezes current flow

The player should instantly read cyan current as success, amber flags as caution, and red burnt cells or empty surge pips as danger.

## Main Screens And What Each One Shows

- Start overlay:
  - title
  - one-line hook
  - three difficulty buttons
  - one short controls line
- Gameplay:
  - edge-to-edge portrait board
  - timer
  - `3` surge pips
  - explicit flag chip in the lower thumb zone
  - no extra stats, score tables, or side panels
- Run-end overlay:
  - solved or blown verdict
  - clear time or best progress
  - best time for the current difficulty
  - retry CTA

## Core Interaction Quality Bar

- Cells must stay aligned with no board jitter or uneven gutters.
- Covered, revealed, lit, flagged, burnt, and relay states must stay distinct at phone scale.
- Clue numbers must read instantly without zooming or relying on color alone.
- Zero-cascade motion should feel quick and satisfying without obscuring the final state.
- The lit-path effect must feel like current spreading through the board, not like a generic color swap.
- The flag chip must clearly show whether flag mode is active before the next tap lands.
- The board must fill the active viewport instead of sitting inside a detached webpage card.

## HUD And Screen Plan

- Active-play HUD is minimal: timer, surges, flag chip only.
- No persistent tutorial box, move counter, or difficulty badge during active play.
- No full-width header or footer chrome.
- Start and run-end overlays should leave enough of the board visible that the product still reads as the same game.

## Art Direction And Asset Plan

- Camera/framing: straight-on full-frame board with no faux desktop window
- Palette:
  - graphite and charcoal for covered board states
  - clean white and pale cyan for clue readability
  - vivid electric cyan for lit conductors
  - amber for flags and caution accents
  - hot red for burnt shorts and final failure
- Materials:
  - subtle matte board surface
  - restrained glow bloom on current, source, and relay only
  - no plastic toy bevels or bomb-cartoon iconography
- Scale:
  - cell sizes large enough to stay comfortable on portrait phone
  - source and relay nodes slightly larger than normal cells so the route goal reads instantly

## Tech Approach And Code Structure

- Stay on the simple PlayDrop TypeScript app path.
- Use a full-viewport canvas for the board, cell states, clue numbers, zero cascades, and current spread.
- Use lightweight DOM overlays for the start screen, timer, surges, flag chip, and run-end screen.
- Planned module split:
  - `src/main.ts`: PlayDrop boot, app shell, resize, input routing, overlay state
  - `src/game/generator.ts`: board generation, safe-path guarantee, difficulty presets
  - `src/game/sim.ts`: reveal rules, zero flood, flagging, surge handling, lit-path propagation, win/lose checks
  - `src/game/render.ts`: board drawing, glow treatment, overlays, and responsive layout math
  - `src/game/types.ts`: shared game types and constants
- Keep deterministic hooks for scripted board seeds, tests, and later capture flows.

## Testing Plan

- Deterministic logic tests for:
  - clue-number generation
  - zero flood behavior
  - flag toggling
  - overload surge handling
  - lit-path connection
  - source/relay safe-path guarantee
- `npm run validate`
- `playdrop project validate .`
- Real browser QA on mobile portrait and desktop
- Hosted verification on the same surfaces after publish

## Target Session Length, Target Skilled Clear Or Run Length, And Replayability Plan

- Fresh-player target clear on `Live`: `3-6` minutes
- Skilled `Live` clear target: `90-180s`
- Skilled `Deep` clear target: `180-360s`
- Replayability comes from generated boards, difficulty choice, faster clears, and improving route-reading efficiency without needing extra metagame systems

## Strongest Raw Screenshot, Clip, Or First-15-second Beat

The strongest raw screenshot is a half-open dark board with a bright cyan path already reaching halfway toward the relay, one crisp `3` clue near the frontier, one amber flag marking a short, and the destination node still glowing just out of reach. The first `15` seconds should show a safe reveal, a zero cascade, one deliberate flag, and a visible current extension toward the relay.

## The Failure Condition That Sends The Project Back To `01-idea`

Return to `01-idea` if the real build still feels like generic numbered cleanup, if the source-to-relay objective does not materially change where the player looks in the first minute, or if the live path payoff is too weak to make the board look worth clicking before marketing treatment.

## Concrete Media Plan For Icon, Hero, Screenshots, And Gameplay Video

- Icon:
  - a strong source node firing cyan current into a single clean conductor path
- Hero:
  - the board mid-route with the source, relay, and lit path clearly visible, title centered
- Screenshots:
  - one mid-route clue-reading state
  - one near-complete path with visible danger and one remaining surge
- Gameplay video:
  - start directly on live gameplay
  - show a zero cascade, a flag placement, and the final relay connection

## Complexity Likely To Be Challenged In The Simplify Step

- More than three difficulty presets would add selection noise without helping the core promise.
- Daily boards, hint systems, undo, or score-combo layers would risk turning a clean logic lane into rescue-through-features.
- Mobile-landscape support would weaken the portrait-first route framing.

## Starter, Demo, Template, Or Remix Source-signature Removal Plan

The only starter path is `playdrop/template/typescript_template`. Before implementation, every visible trace of that starter must disappear:

- opening beat: replace the template message with a real `Relayline` start screen
- framing: full-viewport portrait board instead of a generic page shell
- objective presentation: source-to-relay connection, not starter copy
- visual identity: bespoke neon-circuit board states, source node, relay node, flags, and surge pips
- HUD: timer, surges, and flag chip only
