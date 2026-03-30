# Drifthook - SPECS v1

## Original Game Name

Drifthook

## One-line Player-facing Value Proposition

Drop a lantern lure through a moonlit lake, reel up the target fish in order, and keep your line intact as the water grows faster and more dangerous.

## Clear Differentiator

This is not a catch-anything fishing toy. The player is always chasing a live three-fish order card, resolving exactly one catch or snag on each reel-up, and using order completions to repair the line. The fantasy is deliberate, low-chrome night fishing under pressure rather than chaos, launch spectacle, or inventory management.

## Best Platform And Why It Is Best

`mobile portrait`

Portrait gives the lake depth real scale, keeps the lure path readable in one glance, and lets the game stay edge to edge without side chrome. The interaction is also naturally one-thumb: hold to lower, release to reel.

## Additional Supported Platforms And Why They Still Survive

- `desktop`: hold-and-release maps cleanly to `Space` or mouse input, and the same centered portrait composition still reads without extra HUD.

## Gameplay Family

Single-screen fishing timing arcade.

## Game Meta

One endless score run with best-score persistence and completed-order count persistence.

## Input Per Supported Platform

- Mobile portrait: press and hold in the playfield to lower the lantern lure; release to reel it back up.
- Desktop: hold `Space` or mouse-down to lower; release to reel. `R` retries after a loss.

## Game Category And Subcategory

- Category: Arcade
- Subcategory: Fishing order chase

## Reference Games We Are Intentionally Close To

- `Ridiculous Fishing` for readable water-column anticipation and silhouette timing only.
- `Desert Golfing` for calm one-touch pacing and visual restraint only.
- `playdrop/app/pool-game` for honest presentation quality and uncluttered input framing only.

## Core Loop

1. Read the leftmost unresolved fish in the three-slot order strip.
2. Hold to lower the lantern lure to the depth where that fish will cross the center line.
3. Release to reel upward.
4. Resolve the first thing the lure intersects on the ascent: one fish or one snag.
5. If the catch matches the current target fish, fill that order slot, score, and continue toward order completion.
6. If the catch is wrong or the lure hits a snag, lose one line knot and reset progress on the current order card.
7. Complete the full order card for a large bonus, brief light burst, and one repaired knot.
8. Survive faster schools, deeper target mixes, and more dangerous water to chase a longer run.

## Rules

- Fish species: `4`
  - `dartfin`: shallow, fast straight swimmer
  - `bloomkoi`: upper-mid, slow arc swimmer
  - `glassperch`: lower-mid, jittery diagonal swimmer
  - `mooneel`: deep, slow wave swimmer
- Order card: `3` fish targets shown left to right
- Line health: `4` knots max
- Lure path: one centered vertical line
- Lowering: lure descends while input is held
- Reeling: lure ascends immediately when input is released
- Catch resolution: the first fish or snag touched during the ascent resolves the reel
- Empty reel: allowed, but scores nothing and wastes time
- Scoring:
  - correct catch: `100`
  - perfect catch near lure center: `140`
  - completed order: `300`
- Penalties:
  - wrong fish: `-1` knot and reset order progress to slot `1`
  - snag hit: `-1` knot and reset order progress to slot `1`
- Repair:
  - completing an order restores `+1` knot up to the max of `4`
- Phase ramp:
  - every `3` completed orders, fish speed rises, deeper species appear more often, and snag count increases
- Loss rule:
  - run ends at `0` knots

## Main Screens And What Each One Shows

- Start overlay:
  - title
  - one-sentence hook
  - short instruction: `Catch the leftmost fish next`
  - `Play` CTA
- Gameplay:
  - score
  - four line-knot pips
  - three-slot order strip
  - full-viewport lake cross-section with no boxed webpage framing
- Game-over overlay:
  - score
  - best
  - completed orders
  - `Retry` CTA

## Core Interaction Quality Bar

- The lure must change direction on the exact release frame with no mushy delay.
- Fish silhouettes must remain instantly distinguishable at phone size by shape and glow, not by reading labels.
- Order-strip progression must update within one frame of a resolved catch.
- Wrong catches and snag hits must feel sharp but fair, with clear visual cause.
- Water, bubbles, and fish motion should feel alive without obscuring the lure path.
- The entire gameplay view must stay readable with only score, line knots, and the order strip on top of the scene.

## Strongest First-minute Feeling

The player should feel calm for half a second, then tense in a satisfying way, like they are threading a warm lantern through cold dark water and barely keeping their run together through good decisions.

## HUD And Screen Plan

- Gameplay HUD stays in the safe top band only.
- No persistent title bar, footer, or instruction panel during active play.
- The lure path and fish field stay visually clear in the center of the screen.
- Damage feedback lives on the line-knot pips and the order strip, not in separate stat boxes.

## Art Direction And Asset Plan

- Camera: fixed portrait cross-section from surface glow to deep water
- Palette: deep indigo, teal, charcoal, lantern gold, and occasional soft coral accents in fish bodies
- Materials: matte water gradients, satin fish silhouettes, soft additive glow on lure and bubbles
- Environment: reeds and shoreline shadow at the top, sparse rocks and kelp silhouettes deep below
- Fish: `4` custom silhouette families with distinct fins and swim rhythms
- Hazards: one snag family built from kelp and drift silhouettes
- Audio:
  - light reel-down and reel-up foley
  - soft correct-catch ping
  - stronger perfect chime
  - line-fray hit sound
  - loss sting
- Listing art: PlayDrop AI hero/icon generated from real gameplay screenshots using the lantern lure and target fish language

## Tech Approach And Code Structure

- TypeScript browser app built from the PlayDrop TypeScript template
- Deterministic simulation runs separately from rendering
- Proposed modules:
  - `src/main.ts` boots PlayDrop, renderer, HUD, input, and the frame loop
  - `src/game/state.ts` owns serializable game state, order progress, and ramp state
  - `src/game/logic.ts` owns fish spawning, catch resolution, scoring, and loss rules
  - `src/game/patterns.ts` defines species depth bands and movement patterns
  - `src/game/input.ts` maps hold/release behavior across touch, mouse, and keyboard
  - `src/render/canvas.ts` draws the lake, fish, lure, particles, and overlays
  - `src/ui/dom.ts` owns score, order strip, start overlay, and game-over overlay
  - `tests/logic.test.ts` covers order progression, wrong-catch resets, line repair, and phase ramps
  - `scripts/simulate-balance.ts` runs idle, casual, and expert seeded policies

## Testing Plan

- Deterministic logic tests for order-card resolution, wrong catches, snag damage, repairs, and loss state
- `npm run validate`
- `playdrop project validate .`
- scripted balance sweeps for `idle`, `casual`, and `expert`
- real browser checks for mobile portrait and desktop input
- hosted verification on the same supported surfaces after publish

## Target Player Session Length, Target Skilled Run Length, And Replayability Plan

- Endless score game targets:
  - idle median: under `20s`
  - casual median: `60-120s`
  - expert median: `300s+`
  - expert p25: `240s+`
- Skilled run target: `240-420s`
- Replayability sources:
  - rotating three-fish orders
  - distinct species behavior and depth bands
  - phase ramps that change what depths are safe
  - perfect-catch scoring chase
  - knot-repair economy that rewards clean streaks

## Concrete Media Plan For Icon, Hero, Screenshots, And Gameplay Video

- Icon: the warm lantern lure cutting through indigo water with one bright fish silhouette just beneath it
- Hero: the full portrait lake with the lure, two visible target fish, and the title centered in the safest open water band
- Screenshot 1: clean early run with one order slot already filled
- Screenshot 2: tense deep-water run with one knot left and a near-perfect target catch lined up
- Gameplay video: start directly on active play, show one correct catch, one order completion and repair, one wrong-catch penalty, and then a later faster-water recovery moment

## Complexity Likely To Be Challenged In The Simplify Step

- Whether desktop support should stay
- Whether four species are too many or exactly enough
- Whether any decorative background props beyond reeds, rocks, and kelp are worth shipping
- Whether phase ramps need more than one simple snag family and speed/depth escalation

