# Shardlight

## Original Game Name

Shardlight

## One-line Player-facing Value Proposition

Brush open buried chambers, read the clue numbers, and chain clean excavations to reveal glowing relics without cracking a cursed tile.

## Best Platform

`mobile portrait`

## Additional Supported Platforms

- `desktop`

## Gameplay Family

Chained excavation puzzle built on classic Minesweeper grammar.

## Proven Reference Loop And Why Players Will Understand It Immediately

- The core loop is classic `Minesweeper`: uncover safe tiles, use clue numbers to infer which adjacent tiles are dangerous, mark likely hazards, and clear the board without opening one.
- That interaction grammar is already proven, instantly legible, and supported by the local `osgameclones` archive, which lists many direct Minesweeper implementations and variants.
- `Shardlight` does not ask the player to learn a new rule language before the fun starts. The only new framing is the excavation fantasy and the run structure that chains chambers together.

## Allowed Novelty Beyond The Reference Loop And Why It Does Not Change The Primary Interaction Grammar

- Each cleared board becomes one chamber in a chained expedition run, so the player keeps pushing deeper until one bad dig ends the run.
- Safe clears gradually reveal embedded relic art inside the chamber, giving the player a stronger visual payoff than a bare utilitarian board.
- The mobile input is tuned for one-thumb portrait play: tap to uncover, long-press to mark, and optional quick chord on already-cleared clues.
- None of that changes the primary interaction language. The player is still reading numeric adjacency clues and deciding which covered tiles are safe.

## Game Meta

Endless chamber-to-chamber score chase with best-run persistence.

## Input

- Mobile portrait: tap a covered tile to uncover it, long-press to mark or unmark it as dangerous, tap a cleared clue to chord when its marked-neighbor count is already satisfied.
- Desktop: left-click to uncover, right-click to mark, click a cleared clue to chord when its marked-neighbor count is already satisfied.

## Game Category And Subcategory

- Category: Puzzle
- Subcategory: Logic / excavation

## Reference Games

- `Minesweeper` for the exact proven logic grammar.
- `Minesweeper Genius` for proof that the lane can work well in a mobile-native format without losing readability.
- The local `osgameclones` archive for broad proof that Minesweeper is a mature, well-understood loop with many presentation variants.

## Art Direction

Sun-warm sandstone tiles, amber-glow relic fragments beneath the surface, obsidian hazard markers, soft dust bursts, and a low-chrome expedition frame with almost the entire screen devoted to the chamber grid.

## Why The Art Direction Is Achievable With Available Assets, AI Generation, Or Simple Custom Work

- The live game can be shipped with bespoke 2D rendering only: carved tiles, engraved numbers, dust particles, amber glow, and a small set of overlay icons.
- Public PlayDrop research also showed practical supporting art references in `kenneynl/asset-pack/puzzle-pack` and `kenneynl/asset-pack/voxel-pack`, so the dig-site language is realistic even if the shipped build stays custom 2D.
- The same sandstone, amber, and obsidian palette can drive the icon, hero, screenshots, and gameplay video without a heavy asset pipeline.

## Why A Player Would Want This Instead Of The Best-known Game In The Same Lane

- The lane’s best-known versions are often utilitarian single-board tools. `Shardlight` gives the same proven logic pleasure, but frames it as a one-more-chamber expedition with stronger tactile reveal, clearer phone ergonomics, and a more desirable visual payoff.
- The point is not “Minesweeper, but prettier.” The player gets a faster mobile-native run structure, a stronger excavation fantasy, and visible relic recovery that makes each solved chamber feel earned.

## Why The Pitch Creates Immediate Desire Instead Of Merely Sounding Coherent

- “Reveal a buried chamber without cracking a cursed tile” is an immediately understandable risk-reward fantasy.
- “Chain clean excavations to reveal glowing relics” adds a visible reward and forward momentum, so the idea sounds like something to play now, not just a tidy logic app description.

## Why The Concept Supports A Real Player Session Instead Of A One-clear Toy

- One chamber is only the start. The run structure asks the player to clear multiple boards in a row, with density and score pressure rising over time.
- A strong run naturally lasts longer than one solved board because the loss condition is attached to the whole expedition, not to a single chamber-select menu.

## What Keeps Players Engaged After The First Clear

- Board-to-board escalation through higher hazard density and score multipliers.
- Best-run persistence for score chase.
- The satisfaction of uncovering a new relic mural cleanly before moving deeper into the dig.
- Faster expert play through confident chording and reduced hesitation on readable clues.

## Why The Game Is Distinct From The Studio's Existing Catalog

- The current studio catalog is concentrated in real-time arcade puzzlers, routing games, rhythm lanes, bubble shooting, fishing timing, and lane defense.
- `Shardlight` is a slower, more deliberate logic lane with no overlap in core interaction grammar, no flower/fishing/fruit theme reuse, and no dependence on the same score-chase pacing as the current portrait catalog.

## Why This Concept Deserves To Exist

- The core loop is fully proven, the platform fit is strong, and the public PlayDrop lane looks open.
- The concept has a clear reason to exist beyond clone naming or theme swap: it turns a classic logic board into a desirable mobile-native expedition with visible excavation payoff and enough chained-run depth to feel like a real release.
