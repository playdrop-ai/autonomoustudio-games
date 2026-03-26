# Latchbloom - SPECS v1

## Original Game Name

Latchbloom

## One-line Player-facing Value Proposition

Toggle brass latches to route falling blossoms into the right vases before thorns choke the greenhouse.

## Clear Differentiator

The player never drags blossoms directly. Instead, they control a live routing network of latch crossovers, shaping each blossom's path through the greenhouse in real time while local thorn pressure builds in the vases.

## Best Platform And Why It Is Best

`mobile portrait`

The whole game is a tall, edge-to-edge vertical routing board with one-thumb tap targets. Portrait keeps the lanes readable, keeps the latches comfortably within reach, and lets the active playfield dominate the screen without side chrome.

## Additional Supported Platforms And Why They Still Survive

- `desktop`: click-to-toggle maps cleanly to the same latch interaction, and the portrait-first layout can scale upward without changing the rules.

## Gameplay Family

Single-screen route-switching arcade puzzler.

## Game Meta

Endless score chase with bouquet bursts, streak scoring, and escalating thorn pressure.

## Input Per Supported Platform

- Mobile portrait: tap any visible latch to toggle that crossover instantly.
- Desktop: click any visible latch to toggle that crossover instantly.

## Game Category And Subcategory

- Category: Arcade
- Subcategory: Route switcher

## Reference Games We Are Intentionally Close To

- `Flight Control` for readable tap-driven triage rhythm.
- `Trainyard` for route readability and satisfying path ownership only, not for puzzle structure or presentation.
- `playdrop/app/starter-kit-match-3` for portrait-friendly presentation, listing completeness, and realistic release scope only.

## Core Loop

1. Scan the visible blossoms and the short preview queue.
2. Tap latches to change the routing network before blossoms reach the next crossover.
3. Watch blossoms travel through the greenhouse into bottom vases.
4. Score correct deliveries and build bouquet meters.
5. Survive mistakes and rising speed until thorn buildup ends the run.

## Rules

- Network lanes: `5`
- Latch rows: `6`
- Latch pattern: odd rows control pairs `1-2` and `3-4`; even rows control pairs `2-3` and `4-5`
- Blossom types: `5`
- Vase targets: `5` fixed vases, each tied to one blossom type
- Preview: next `3` blossoms shown at the top canopy
- Routing rule: each latch is either straight or crossed for its lane pair
- Correct delivery: score points and fill that vase's bouquet meter by `1`
- Bouquet burst: every `3` correct blossoms in one vase triggers a bouquet burst, bonus points, and clears all thorns from that vase
- Wrong delivery: add `1` thorn to the receiving vase
- Loss rule: the run ends when any vase reaches `3` thorns
- Pace rule: spawn cadence tightens in small steps as the score rises

## Main Screens

- Start overlay: title, one-sentence hook, `Play` button
- Gameplay view: score top-left, short preview top-right, network edge to edge, no large instructions during active play
- Run-end overlay: score, best score, restart button

## Core Interaction Quality Bar

- Latch taps must respond instantly and clearly, with state changes visible in under `60ms`.
- Blossoms must stay readable at phone size by silhouette and color, not just tiny details.
- Routing lines and latches must remain perfectly aligned with no ambiguous crossings.
- Blossom motion should feel smooth and slightly buoyant, not stiff or jittery.
- Vase bursts should feel celebratory but fast, with readable score payoff and no long stall.
- Wrong deliveries and thorn buildup must be legible immediately without extra explanation text.

## Strongest First-minute Feeling

The player should feel like they are conducting a living greenhouse, rescuing beauty out of a rising stream of chaos with quick, confident taps.

## HUD And Screen Plan

- Active gameplay HUD only shows score and the next short preview
- Thorn pressure lives on the vases themselves, not in a separate side panel
- No framed webpage card around the game
- No persistent tutorial block during active play

## Art Direction And Asset Plan

- Tall twilight greenhouse with dark teal glass, warm brass hardware, and soft mist
- Five jewel-tone blossom silhouettes with distinct petal shapes
- Brass latches that snap with a bright enamel flip state
- Bottom vases with visible bouquet meter and thorn buildup
- Motion polish through pollen sparks, soft glow streaks, and brief bloom bursts
- Bespoke icon and hero art built from the same latch, blossom, and vase language

## Tech Approach And Code Structure

- TypeScript single-page app built from the PlayDrop TypeScript template
- `src/main.ts` boots the app shell, input wiring, and frame loop
- `src/game/logic.ts` owns deterministic routing, spawning, score, thorn, and loss rules
- `src/game/render.ts` draws the greenhouse, blossoms, latches, and overlays with responsive SVG and HTML
- `src/game/audio.ts` handles light UI chimes and bouquet burst audio
- `tests/logic.test.ts` covers routing, bouquet bursts, thorn loss, and score updates

## Testing Plan

- Deterministic logic tests for latch routing, fixed vase matching, bouquet burst resets, thorn growth, and game-over
- `npm run validate`
- `playdrop project validate .`
- Real browser checks for portrait mobile and desktop before publish
- Hosted verification on the same supported surfaces after publish

## Concrete Media Plan

- Icon: one brass latch crossing under a single glowing blossom
- Hero: tall greenhouse crop with two blossoms crossing and one vase bursting into a bouquet
- Screenshots: clean mid-run routing state and near-loss thorn pressure state
- Gameplay video: start on an active run immediately, show several fast latch flips, one bouquet burst, and one tense recovery from thorn pressure

## Complexity Likely To Be Challenged In Simplify

- Whether `5` lanes and `5` blossom types are too visually dense for a small phone
- Whether the preview queue needs `3` blossoms or can be smaller
- Whether streak scoring needs more than one simple combo multiplier
