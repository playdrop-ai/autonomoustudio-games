# Wickstreet - SPECS v1

## Original Game Name

Wickstreet

## One-line Player-facing Value Proposition

Race a tiny lamplighter through a rain-soaked block grid, carry matching glow cores to darkened homes, and keep the blackout from swallowing the neighborhood.

## Clear Differentiator

This is not a generic delivery toy. The player is always running a two-step planning loop: finish the active relight request while already reading the next-request preview, all inside a storm that keeps rerolling which streets are safe. The fantasy is not parcels or traffic management. It is restoring warmth to a dark block under pressure, one exact route at a time.

## Best Platform And Why It Is Best

`mobile landscape`

Landscape gives the player enough street width to read both the active destination and the next route in one glance without collapsing the town into a cramped portrait strip. Drag steering also feels natural on a phone held sideways because the thumb can trace corners and alley cuts directly across the playfield.

## Additional Supported Platforms And Why They Still Survive

- `desktop`: keyboard movement and mouse steering preserve the same route-reading loop without needing extra HUD or layout compromise.

## Gameplay Family

Top-down courier route arcade.

## Game Meta

One endless neighborhood run with best-score persistence and best-streak persistence.

## Input Per Supported Platform

- Mobile landscape: drag anywhere on the playfield to steer the courier toward your finger. Release to stop.
- Desktop: move with `WASD` or arrow keys. Hold mouse on the playfield to steer toward the pointer as a secondary option. `Space` starts or retries.

## Game Category And Subcategory

- Category: Arcade
- Subcategory: Blackout courier chase

## Reference Games We Are Intentionally Close To

- `Paperboy` for delivery fantasy only.
- `Pac-Man Championship Edition` for compressed route mastery, rerouting pressure, and clean score chase only.
- `Mini Motorways` for readable road-grid clarity and destination signaling only.
- `playdrop/app/avatar-topdown-controller` for realistic movement scope on PlayDrop.
- `playdrop/app/pool-game` for honest camera framing and uncluttered presentation quality only.

## Core Loop

1. Read the active glow-core request and the next-request preview.
2. Cross the depot tile to pick up the active glow core.
3. Move through the current open street network toward the matching darkened home.
4. Deliver before the blackout timer expires.
5. Score based on base value, remaining timer, and current streak.
6. Watch the storm reroll one or more flood barriers after key delivery milestones.
7. Return through the safest remaining route while planning the next request.
8. Survive longer, tighter routes to chase a higher score and longer relight streak.

## Rules

- Map layout:
  - one fixed neighborhood map
  - central depot tile
  - `4` fixed homes on the outer blocks
  - road-only movement through a compact block grid
- Request system:
  - one active request at a time
  - one next-request preview always visible
  - each request maps to one exact home by both sigil and color
- Courier carry state:
  - carry `1` glow core at a time
  - pickup happens automatically when stepping onto the depot while empty
  - successful delivery consumes the glow core instantly
- Timer:
  - each request starts with a visible blackout timer ring
  - early game target: about `11s`
  - late game target: about `7s`
- Scoring:
  - successful delivery: `100`
  - fast-delivery bonus: up to `+80`
  - streak bonus: `+25` per current streak step up to a modest cap
- Penalties:
  - missed timer: `+1` blackout strike and streak reset
  - dead-end dithering is punished indirectly because the timer keeps running
- Storm phase ramp:
  - every `4` successful deliveries, storm intensity rises
  - higher phases shorten the timer slightly and increase road closure count
- Closures:
  - flood barriers occupy full road tiles
  - barrier rerolls never seal every path from depot to the active destination
  - the game keeps at least one fair route alive
- Loss rule:
  - run ends at `3` blackout strikes

## Main Screens And What Each One Shows

- Start overlay:
  - title
  - one-sentence hook
  - short rule line: `Match the glow core to the lit home`
  - `Play` CTA
- Gameplay:
  - score
  - blackout strikes
  - active request card with timer ring
  - next-request preview card
  - full-viewport neighborhood with no webpage card framing
- Game-over overlay:
  - score
  - best
  - longest streak
  - `Retry` CTA

## Core Interaction Quality Bar

- Movement must feel immediate. The courier should start turning on the same frame as a direction change and stop cleanly without floaty drift.
- The active destination must be unmistakable at a glance through glow, sigil, and pulsing doorstep treatment.
- Flood barriers must read as full route blockers instantly, not decorative props.
- The depot, current request, and next request must remain readable on a phone in landscape without covering route-critical streets.
- Every successful delivery must feel like relief: a sharp window relight, a brief score pop, and a visible streak continuation.
- The whole town should feel alive through rain motion and light bloom without hiding road intersections.

## Strongest First-minute Feeling

The player should feel clever and under the gun at the same time, like they are barely staying ahead of a blackout by shaving corners through a wet little town.

## HUD And Screen Plan

- Score sits in the top-left safe band.
- Blackout strikes sit in the top-right safe band.
- Active request and next-request preview live in a compact bottom band that does not cover intersections or homes.
- No persistent title bar, tutorial card, or side panel during active gameplay.

## Art Direction And Asset Plan

- Camera: high top-down view with a slight forward bias so the destination side of the block still feels important
- Palette: wet charcoal roads, navy shadows, amber windows, teal puddles, coral barriers, bright request sigils
- Materials: matte building roofs, glossy street reflections, additive window relight bloom, soft rain streaks
- Environment:
  - compact town blocks
  - curb lines
  - lit and unlit windows
  - flood cones and barrier lights
- Characters and props:
  - tiny courier in a yellow rain slicker with a bright satchel glow
  - `4` home silhouettes with distinct mailbox sigils
  - central lamp depot kiosk
- Audio:
  - soft footstep ticks
  - pickup spark
  - satisfying relight chime
  - blackout hit sting
  - escalating rain loop
- Listing art:
  - PlayDrop AI hero/icon generated from real gameplay screenshots showing the courier, glowing core, and relit homes

## Tech Approach And Code Structure

- TypeScript browser app built from the PlayDrop TypeScript template
- Deterministic game simulation separated from rendering
- Proposed modules:
  - `src/main.ts` boots PlayDrop, game state, renderer, HUD, and the frame loop
  - `src/game/config.ts` locks map size, timing, scoring, and storm ramps
  - `src/game/state.ts` owns serializable run state and request state
  - `src/game/logic.ts` owns request generation, delivery resolution, strike logic, and storm phase updates
  - `src/game/map.ts` defines homes, depot, road graph, and fair barrier rerolls
  - `src/game/input.ts` maps drag, keyboard, and mouse steering into courier movement
  - `src/render/canvas.ts` draws the neighborhood, courier, rain, barriers, and overlays
  - `src/ui/dom.ts` owns score, request cards, start overlay, and game-over overlay
  - `tests/logic.test.ts` covers request sequencing, scoring, timer misses, and path-safe barrier rerolls
  - `scripts/simulate-balance.ts` runs idle, casual, and expert seeded delivery policies

## Testing Plan

- Deterministic logic tests for request sequencing, timer expiry, scoring, strike resets, and barrier fairness
- `npm run validate`
- `playdrop project validate .`
- scripted balance sweeps for `idle`, `casual`, and `expert`
- real browser checks for mobile landscape and desktop input
- hosted verification on the same supported surfaces after publish

## Target Player Session Length, Target Skilled Run Length, And Replayability Plan

- Endless score game targets:
  - idle median: under `20s`
  - casual median: `60-120s`
  - expert median: `300s+`
  - expert p25: `240s+`
- Skilled run target: `240-360s`
- Replayability sources:
  - route mastery on a changing block grid
  - active plus next-request planning
  - tighter timers in later storm phases
  - rerolled barrier layouts that change the safest line
  - streak bonuses that reward cleaner execution

## Concrete Media Plan For Icon, Hero, Screenshots, And Gameplay Video

- Icon: the courier silhouette and one bright glow core reflected in wet asphalt
- Hero: the courier cutting across a dark block while one home blazes back to life, with the title centered in the open street band
- Screenshot 1: early run with a clean active route and visible next-request preview
- Screenshot 2: late run with several flood barriers forcing a tight cut across the block
- Gameplay video: begin on active movement immediately, show one pickup and relight, then a later higher-pressure route with visible barrier reroll

## Complexity Likely To Be Challenged In The Simplify Step

- Whether `4` homes are the right count or if `3` is stronger
- Whether mouse steering should stay or keyboard alone is enough on desktop
- Whether the storm needs anything beyond fixed barriers and timer pressure
- Whether rain reflections can stay purely 2D and still feel rich enough
