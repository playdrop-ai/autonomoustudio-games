# Shardlight - SIMPLIFY v1

## The Core Promise In One Sentence

Clear chained buried chambers with classic Minesweeper logic and keep the expedition alive long enough to reveal glowing mural art under the stone.

## The Differentiator That Survived Simplification

The game is still a mobile-native expedition run, not a one-board utility puzzle: each cleared chamber rolls straight into the next one, and safe excavation visibly reveals the buried mural beneath the grid.

## The Best Platform

`mobile portrait`

## Additional Supported Platforms That Still Survive

- `desktop`

## The Final Gameplay Family

Chained excavation puzzle built on classic Minesweeper grammar.

## The Final Game Meta

One endless expedition run with best-score persistence.

## The Final Input Model Per Supported Platform

- Mobile portrait:
  - tap to uncover
  - long-press to mark
  - tap revealed clue to chord when safe
- Desktop:
  - left-click to uncover
  - right-click to mark
  - left-click revealed clue to chord when safe

## The Final HUD And Key Screens

- Start overlay with title, one-line hook, and play button
- Gameplay view with only score and chamber depth in a slim top rail
- Run-end overlay with score, chambers cleared, best, and retry

## The Final Art And Asset Scope

- One full-screen sandstone chamber board
- Engraved clue digits and obsidian danger markers
- One buried amber mural layer under each chamber
- Short dust and light pulse effects for reveal, chord, clear, and failure
- Bespoke icon, hero, screenshots, and gameplay video derived from the shipped board art

## Final Rules

- Board size stays fixed at `8 x 10`
- Each chamber guarantees a safe zero-region first uncover
- Standard `8`-neighbor clue counts
- Marking is optional
- Chording is supported
- Uncover all safe tiles to clear the chamber
- Hitting one cursed tile ends the whole run
- Chamber `1` starts at `10` cursed tiles
- Hazard count rises by `1` each chamber up to `18`
- Score:
  - safe uncover: `10`
  - chamber clear: `250 * chamber`
- Best score persists locally

## Not In v1

- No mobile landscape support
- No board size selector
- No campaign, daily puzzle, or stage map
- No hint button, undo, or accessibility assist systems beyond clean visuals and input sizing
- No relic fragment counters, bonus collectibles, or inventory layer
- No achievements, leaderboards, currency, or online features
- No separate settings panel beyond mute and retry
- No side panels, tutorial pages, or long explanatory copy during active play
