# Shardspan - SPECS v1

## Original Game Name

Shardspan

## One-line Player-facing Value Proposition

Flip ancient beacons to make new sky bridges real and sprint the shattered relay before dusk erases your path.

## Clear Differentiator From The Reference Games

The core twist is stateful traversal. Every beacon contact flips which bridge family is solid, so the player is not just platforming cleanly; they are rewriting the course in motion. That makes each checkpoint both a routing decision and a movement test.

## Best Platform And Why It Is Best

`desktop` is best because the game depends on precise movement, repeated retry loops, and quick camera correction around floating gaps. Keyboard movement plus mouse camera control is the cleanest way to make the state-switch jumps feel deliberate rather than mushy.

## Additional Supported Platforms And Why They Still Survive

- None in v1. Mobile support weakens the precision and camera-readability bar for the exact mechanic that makes the game worth shipping.

## Gameplay Family

Single-course 3D phase-switch platformer.

## Game Meta

Replayable relay run with a visible timer, fast resets, and best-time pursuit.

## Input Per Supported Platform

- Desktop: `WASD` or arrow keys to move, mouse drag to orbit the camera, `space` to jump.

## Game Category And Subcategory

- Category: Action
- Subcategory: 3D platformer

## Reference Games We Are Intentionally Close To

- `playdrop/app/starter-kit-3d-platformer` for movement baseline, jump readability, and bundled low-poly asset scope.
- `Super Mario Galaxy` for floating-island legibility and forward flow only.
- `Neon White` for fast retry energy and time-attack framing only.

## Core Loop

1. Start on the first shard with the timer paused until the player moves.
2. Reach the highlighted beacon.
3. Touching that beacon flips the world phase, making one bridge family solid and the other ghosted.
4. Use the newly solid bridge set to reach the next highlighted beacon.
5. Falling respawns the player at the last cleared beacon and deducts time.
6. Clear all relay beacons, then cross the exit span before the timer expires.
7. Compare the remaining time and death count against the current best run, then retry immediately.

## Main Screens And What Each One Shows

### Start Overlay

- Title
- One-sentence promise
- Minimal controls line
- Play button
- Best time if present

### Active Gameplay

- Edge-to-edge world view with no webpage-card framing
- Timer bar and numeric time remaining
- Relay progress `current / total`
- Small next-beacon indicator with color and direction cue

### End Overlay

- Success or failure headline
- Finish time or timeout message
- Death count
- Retry button
- Return-to-start button only if needed

## Core Interaction Quality Bar

- Movement must feel crisp on keyboard: no floaty acceleration lag, no sticky deceleration, and no camera fight on normal turns.
- Jump takeoff, landing, and air control must be readable enough that a failed jump feels earned, not ambiguous.
- Phase flips must read instantly through bridge visibility, emissive color change, and a short beacon pulse.
- Active bridges must feel safe to commit to at a glance; inactive bridges must look obviously non-solid, not merely darker.
- The camera must preserve horizon and landing readability on the main route without forcing constant manual correction.
- The gameplay view must stay edge to edge and use most of the screen for the course.
- During active play, the HUD should occupy only corner-safe zones and never cover landing surfaces.

## Strongest First-minute Feeling

The player should feel like they are improvising a broken sky route in real time: one successful beacon touch should immediately open a new path and create a satisfying "go there now" moment.

## HUD And Screen Plan

- HUD stays minimal: timer bar, relay progress, next-beacon cue.
- No persistent tutorial panel, side panel, minimap, inventory, or dense stat block.
- The next-beacon cue is part of the HUD and the world at once: the target beacon uses a bright light column so the player can read what and where at a glance.
- Loss proximity is the timer bar turning from amber to red in the final seconds.

## Art Direction And Asset Plan

- Use the starter kit's floating-platform vocabulary as the base.
- Recolor key traversal surfaces into two clear phase families: amber and cobalt.
- Replace generic coin targets with bespoke beacon markers: glowing shard pylons with vertical light plumes.
- Shift the sky toward deep dusk instead of bright daytime.
- Add only light custom VFX: beacon pulse ring, bridge phase shimmer, respawn burst, and finish flare.
- Keep the character readable rather than fully reskinning them.

## Tech Approach And Code Structure

- Start from the public `starter-kit-3d-platformer` PlayDrop remix.
- Keep the existing render, physics, and input structure.
- Replace the current course layout with one custom relay path tuned for desktop.
- Add a phase-state system that toggles collision and visibility for grouped bridge sets.
- Replace coin collection with ordered beacon progression and last-cleared-beacon respawns.
- Replace the demo overlay copy and counters with timer, relay progress, and end-state summaries.
- Keep the project self-contained inside the game folder, including the repaired `perf-shared` modules.

## Testing Plan

- `playdrop project validate .` after each meaningful logic change
- Manual desktop playtests for route readability, timer pressure, and camera behavior
- Playwright or PlayDrop capture checks for local and hosted desktop verification
- At least one near-timeout run and one clean success run captured before listing lock
- Console-log review during capture to catch runtime regressions before publish

## Concrete Media Plan

### Icon

- Full-bleed square art showing a broken shard bridge between amber and cobalt light, with no medallion framing.

### Hero

- Matched landscape and portrait scenes of the same dusk sky course, centered title, visible beacon flare, and one active amber-to-cobalt bridge transition.

### Screenshots

- One mid-jump shot toward an active beacon
- One shot that clearly shows the two bridge states and next target
- Optional fail-state shot only if it still looks strong

### Gameplay Video

- Start on live gameplay within the first second
- Show one beacon flip opening the next route
- Show a recovery after a risky jump or respawn
- End on a finish gate clear or last-second save

## Complexity Likely To Be Challenged In The Simplify Step

- Supporting any non-desktop surface
- Keeping more than one route branch open at once
- Adding moving hazards, enemies, or collectible side goals
- Rebuilding the player character or creating a full new art set instead of recoloring and relighting the existing one
