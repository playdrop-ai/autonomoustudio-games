# Powder Post - SPECS v1

## Original Game Name

Powder Post

## One-line Player-facing Value Proposition

Carve downhill through the right village gates, chain parcel deliveries, and stay ahead of the avalanche.

## Clear Differentiator From The Reference Games

The courier is always steering a proven downhill survival lane, but the run is scored around matching live parcel crests to the correct gates. That extra rule changes line choice from the first minute instead of living only in score wrappers or theme copy.

## Best Platform And Why It Is Best

`mobile landscape`

The game wants a wide slope, visible side-to-side route choice, and enough horizontal room to keep gates, obstacles, and the avalanche lip readable without crowding the courier. Landscape also makes touch steering feel natural for repeated carving.

## Additional Supported Platforms And Why They Still Survive

- `desktop`: keyboard or pointer steering maps cleanly to the same carve movement, and the landscape framing already fits a desktop window without changing the rule set.

## Gameplay Family

Endless downhill slalom runner.

## Game Meta

Endless score chase with parcel streaks, avalanche pressure, and best-score persistence.

## Input Per Supported Platform

- Mobile landscape:
  - Primary action: drag anywhere horizontally to steer the courier left or right.
  - Secondary action: none. The game should not hide any frequent action behind long-press or mode switching.
- Desktop:
  - Primary action: steer with `A` / `D` or `Left` / `Right`.
  - Secondary action: pointer drag should mirror touch steering for parity.

## Game Category And Subcategory

- Category: Arcade
- Subcategory: Slalom runner

## Reference Games We Are Intentionally Close To

- `SkiFree` for downhill survival rhythm.
- `Alto's Adventure` for clean downhill readability and desire.
- `deryatr_/app/pixel_sky_hop` for PlayDrop-scale endless-run scope and score-chase cadence.
- `playdrop/app/starter-kit-racing` for landscape action presentation, capture pacing, and release completeness only.

## Core Loop

1. Read the current parcel crest and the short parcel preview.
2. Steer across the slope to line up with the safest matching gate.
3. Dodge trees, rocks, ice ruts, and dead ends on the way down.
4. Hit matching gates to score, extend the streak, and push the avalanche back.
5. Survive rising speed and denser gate choices until the avalanche catches the courier.

## Rules

- The courier stays anchored in the lower third while the slope scrolls upward.
- Each slope segment spawns a mix of obstacles and `2` or `3` visible village gates.
- The courier always carries one active parcel crest plus a short next preview of `2` crests.
- District count in the full spec: `4`
- Matching gate:
  - scores points
  - advances the parcel queue
  - increases the delivery streak
  - pushes the avalanche lip uphill
- Wrong gate:
  - resets the streak
  - advances the parcel queue anyway
  - pulls the avalanche closer
- Missing all gates on a segment:
  - leaves the current parcel active
  - gives no score
  - lets the avalanche continue to creep closer
- Tree or rock collision:
  - causes a short stumble
  - resets the streak
  - produces the largest avalanche surge
- Base speed rises in small tiers after repeated successful deliveries.
- The run ends when the avalanche front reaches the courier.

## Hazard, Reward, And Fail-state Signifiers

- Reward:
  - warm lantern gates
  - bright district crests
  - mail-bag match icon in the HUD
- Hazard:
  - dark pines
  - exposed rocks
  - cracked ice lanes
  - cold, desaturated obstacle palette
- Fail pressure:
  - a bright white avalanche band with heavy snow spray
  - increasing screen shake and wind audio as it closes in

The player should never mistake a gate for a hazard or an obstacle for a goal. Warm lit geometry means delivery. Cold dark silhouettes mean danger.

## Main Screens And What Each One Shows

- Start overlay:
  - title
  - one-sentence promise
  - immediate `Play` CTA
- Gameplay:
  - edge-to-edge slope
  - score
  - streak
  - active parcel crest
  - next parcel preview
  - visible avalanche proximity
- Run-end overlay:
  - score
  - best score
  - longest streak
  - restart CTA

## Core Interaction Quality Bar

- Steering latency should feel immediate on touch and keyboard.
- The courier's carve should read as smooth arcs, not jagged lane snaps.
- The slope must stay readable at phone scale with no dense clutter near the courier.
- The avalanche should feel threatening without obscuring the route choice.
- Gates must be large and bright enough that the player can identify the right crest at a glance during motion.
- Score, streak, and parcel indicators must stay readable while taking very little screen space.

## HUD And Screen Plan

- HUD stays small and pinned to the upper corners.
- No large permanent instruction card during active play.
- No framed webpage card around the game.
- The active parcel crest is the primary HUD element during play; everything else stays secondary.

## Art Direction And Asset Plan

- Midnight alpine slope with cool moonlit snow gradients
- warm chalet-gate lanterns and district crests
- courier scarf or satchel accent color that reads against the snow
- dark fir silhouettes, rock clusters, and light powder trails
- short burst particles for snow spray, deliveries, and avalanche surges

The art set should stay small enough to finish well with bespoke 2D work inside the app itself.

## Tech Approach And Code Structure

- Start from the PlayDrop TypeScript template and replace the template shell entirely.
- Use a full-viewport canvas for the slope and motion layer.
- Use lightweight DOM HUD overlays for score, streak, parcel, and overlays.
- Planned module split:
  - `src/main.ts`: boot, resize, input wiring, and app shell
  - `src/game/sim.ts`: courier movement, spawn generation, avalanche pressure, scoring, and deterministic update loop
  - `src/game/render.ts`: slope, gates, courier, obstacles, avalanche, particles, and overlays
  - `src/game/data.ts`: district crest set, palette, and balance constants
  - `src/game/audio.ts`: lightweight wind, delivery, and crash cues
- Add deterministic test hooks for later scripted playtesting and capture.

## Testing Plan

- Deterministic logic tests for gate matching, queue advancement, obstacle penalties, avalanche movement, and game-over.
- `npm run validate`
- `playdrop project validate .`
- Local browser checks for mobile landscape and desktop
- Hosted verification on the same surfaces after publish

## Target Session Length, Skilled Run Length, And Replayability Plan

- Fresh-player casual median target: `60-120s`
- Expert median target: `300s+`
- Expert p25 target: `240s+`
- Replayability comes from procedural slope segments, escalating speed, better streak management, and leaderboard-style best-score chasing.

## Scripted Balance Sweeps For This Endless Score Game

- Idle policy:
  - minimal steering
  - target failure under `30s`
- Casual policy:
  - steer only toward obvious safe matching gates
  - target median `60-120s`
- Expert policy:
  - preserve streaks aggressively, favor matching gates early, and recover from bad placements
  - target median `300s+`
  - target p25 `240s+`

## Strongest Raw Screenshot, Clip, Or First-15-second Beat

The strongest raw beat is the courier carving between two warm lit gates, hitting the correct crest at the last second, throwing up powder, and visibly buying a little space from the avalanche behind. If that moment does not look worth clicking in an unedited capture, the project should fail before listing work.

## The Failure Condition That Sends The Project Back To `01-idea`

Return to `01-idea` if the real build still feels like a generic downhill dodge game where the delivery rule barely changes the player's line choice, or if the gate and obstacle signifiers are still too confusable to read instantly in motion.

## Concrete Media Plan For Icon, Hero, Screenshots, And Gameplay Video

- Icon:
  - a courier crest over a lit gate with snow spray
- Hero:
  - courier crossing the slope between warm gates with avalanche pressure behind
- Screenshots:
  - a clean mid-run delivery moment
  - a near-loss avalanche recovery moment
- Gameplay video:
  - start in real gameplay immediately
  - show at least one streak chain, one collision recovery, and one visible avalanche surge

## Complexity Likely To Be Challenged In The Simplify Step

- `4` district crests may be too many for instant recognition in motion.
- A `2`-item preview may be more than the small HUD needs.
- Ice ruts may add visual noise without improving decisions.
- Separate streak and avalanche widgets may be heavier than necessary.

## Starter, Demo, Template, Or Remix Source-signature Removal Plan

The only starter path is `playdrop/template/typescript_template`. Before implementation, every visible trace of the template must disappear:

- opening beat: replace the template loading message with a real slope and start overlay
- framing: full-viewport landscape slope, not a plain starter page
- avatar: bespoke courier silhouette, not template text
- environment: alpine snowfield and lantern gates
- HUD: parcel crest, score, streak, and avalanche language only
- objective presentation: delivery crest and avalanche escape, not generic starter text
