# Relayline

## Original Game Name

Relayline

## One-line Player-facing Value Proposition

Read the overload counts, probe safe cells, and complete a glowing circuit from source to relay before three surges burn the run.

## Best Platform

`mobile portrait`

## Additional Supported Platforms

- `desktop`

## Gameplay Family

Single-screen deduction puzzle with a route-building objective.

## Proven Reference Loop And Why Players Will Understand It Immediately

The core loop is directly anchored to `Minesweeper`: tap to reveal a hidden cell, use the exposed number to reason about how many adjacent hazards exist, and mark dangerous cells so later reveals stay safe. That loop is decades-old, instantly legible, and heavily proven in `/Users/oliviermichon/Documents/osgameclones`, including the original `Minesweeper` entry in `/Users/oliviermichon/Documents/osgameclones/originals/m.yaml` plus many follow-on variants.

## Allowed Novelty Beyond The Reference Loop

The novelty stays outside the primary deduction grammar:

- the win condition is connecting the live source node to the far relay, not clearing every safe tile
- a revealed safe chain visibly lights up as current reaches it, so the board has a strong route-building payoff
- the run allows a small three-surge mistake budget instead of instant death, which keeps phone play brisk without teaching a new rules language

The player still learns one core language: reveal, read the count, flag danger, and extend the safe route.

## Game Meta

Single-board logic runs with difficulty selection, local best-time tracking, and replayable generated boards.

## Input

- Mobile portrait: tap a covered cell to reveal it; tap the flag chip, then tap a cell to mark it as a hazard.
- Desktop: left-click to reveal, right-click or `F` to flag.

## Game Category And Subcategory

- Category: Puzzle
- Subcategory: Deduction / route builder

## Reference Games

- `Minesweeper` for the exact hidden-hazard deduction loop
- `Hexcells` as proof that clue-based route reading can feel premium and legible without changing the fundamental deduction appeal
- the current studio puzzle catalog in `/Users/oliviermichon/Documents/autonomoustudio-games` for negative space: `Relayline` must not collapse into row shifting, cluster tapping, bubble shooting, or card chaining

## Art Direction

Dark graphite board, low-chrome frame, soft grid bevels, warm power source, cool cyan relay path, crisp white clue numbers, amber flag markers, and clearly burnt overload cells. The look should feel like a premium instrument panel, not a toy bomb board or a skeuomorphic desktop clone.

## Why The Art Direction Is Achievable With Available Assets, AI Generation, Or Simple Custom Work

The live runtime only needs clean shapes, subtle gradients, number typography, and a small set of board states. That is fully achievable with DOM/CSS or canvas rendering inside the simple PlayDrop TypeScript template, without needing a separate asset pack or a heavy engine track.

## Target Player And Why That Player Already Likes The Proven Loop This Game Is Built On

The target player already likes classic deduction puzzles on phone: they enjoy reading constraints, eliminating risk, and feeling a board open up through logic rather than reflexes. `Minesweeper` players already like that sensation.

## Why The Fiction, Story Wrapper, And Marketing Promise Intensify The Same Player's Desire Instead Of Targeting A Different Audience

The circuit-routing wrapper sharpens the same player fantasy instead of chasing a different audience. The player is still solving a clue grid, but the fiction gives each safe reveal a desirable payoff: you are restoring a live path through a dark board, not just erasing empty cells.

## What The Player Is Trying To Uncover, Protect, Collect, Or Avoid, And Why The Fail State Makes Intuitive Sense Inside That Fantasy

The player is trying to uncover a safe conductor path from the source to the relay, protect the live chain from overloads, and avoid hidden shorted cells. Hitting too many overloads burns the run, which is intuitive in a power-grid fantasy.

## Why The Player's Main Verb Feels Satisfying, Aspirational, Mischievous, Or Otherwise Desirable Inside The Fantasy Instead Of Mean, Foolish, Or Self-defeating

Revealing the next safe cell feels like extending a current through darkness. The verb reads as repair and completion, not destruction or self-sabotage.

## Why A Player Would Want This Instead Of The Best-known Game In The Same Lane

Standard `Minesweeper` often asks the player to clean up dead space after the real deduction is already solved. `Relayline` turns the same proven logic into a more directed fantasy: every reveal either advances the live route, protects it, or clearly blocks it. That gives the lane a stronger first-minute objective and a better raw screenshot than a generic numbered minefield.

## The Brutally Honest One-line Description Of The Concept And Why It Does Not Collapse Into "Famous Game X With A Skin"

Brutally honest description: `Minesweeper where the goal is to complete a safe glowing path from source to relay instead of clearing the whole board`.

That is not just `Minesweeper with a skin` because the route objective changes what cells matter from the first move, gives safe reveals a visible payoff, and creates a different board-reading fantasy than total cleanup.

## Why The One- Or Two-sentence Pitch Creates Immediate Desire Instead Of Merely Sounding Coherent

The pitch promises a known pleasure and a cleaner reason to care: use familiar clue logic to light a path through a dark board. It sells a visible payoff, not just a rule set.

## What Promise The Title, Icon, Hero, And First 15 Seconds Will Imply, And Why The Shipped Gameplay Will Honestly Fulfill That Promise

They should imply a dark grid waking up under current, a strong source node, a clear relay target, and a growing neon-safe path. The first `15` seconds should honestly show exactly that: one or two safe reveals, a clue number, a flagged overload, and a visible lit route advancing toward the relay.

## Why The Concept Supports A Real Player Session Instead Of A One-clear Toy

Generated boards plus a difficulty ladder give the concept repeatable depth, and a single run should still take long enough to feel like solving a real board rather than swiping through a toy.

## What Keeps Players Engaged After The First Clear: Authored Depth, Score Chase, Variation, Progression, Or Another Concrete Replayability Source

Replayability comes from varied generated boards, faster clears on repeated play, difficulty selection, and best-time chasing on a familiar but still high-tension deduction lane.

## Why The Game Is Distinct From The Studio's Existing Catalog

The studio catalog already covers row shifting, cluster tapping, bubble shooting, card chaining, flower routing, downhill slalom, fishing timing, and portrait rhythm. `Relayline` opens a dedicated deduction lane with a route-building payoff instead of another arcade clearer or wrapper-only theme swap.

## If A Starter, Demo, Template, Or Remix Path Is Involved, What The Player Will See In The Strongest Screenshot And First 15 Seconds That Makes The Game Clearly Not That Source

No starter, demo, or remix path is involved beyond the PlayDrop TypeScript template scaffold. The strongest screenshot and first `15` seconds are owned by the game-specific route objective, lit circuit path, source node, and relay target rather than any inherited template scene.
