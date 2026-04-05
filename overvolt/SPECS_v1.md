# Overvolt - SPECS v1

## Original Game Name

Overvolt

## One-line Player-facing Value Proposition

Skid an RC battle car around a tabletop arena, slam rival toys into the rails, and steal their dropped batteries before your own charge runs dry.

## Clear Differentiator

`Overvolt` is not a lap racer and not a weapon shooter. The differentiator is visible immediately:

- battery is your health, your run timer, and your aggression reward
- the best play is to line up rams and collect charge, not circle a track
- the whole thing reads as a bright tabletop toy fight rather than a sim or road sandbox

## Best Platform And Why It Is Best

`mobile landscape`

Landscape gives the arena enough horizontal read for steering, enemy approach angles, and explicit touch controls without hiding the playfield under a portrait HUD shell.

## Additional Supported Platforms And Why They Still Survive

- `desktop`: keyboard steering and dash map directly onto the same grammar, and the wide arena benefits from a larger field read without introducing extra UI.

## Gameplay Family

Landscape direct-control vehicle survival brawler.

## Game Meta

One endless score run, escalating wave pressure, local best score, and no extra metagame.

## Input Per Supported Platform

- Mobile landscape:
  - left virtual stick: steer
  - right `Dash` button: short electric burst with cooldown
- Desktop:
  - `WASD` or arrow keys: steer
  - `Space`: dash

## Game Category And Subcategory

- Category: Arcade
- Subcategory: Vehicle combat survival

## Reference Games We Are Intentionally Close To

- `Death Rally` arena combat for the readable ram-and-survive loop
- `Smash Karts` only as proof that toy-like car combat is instantly legible, not as a feature target
- tabletop RC track videos and toy-car sets for the physical scale and material language

## Core Loop

1. Spawn in the tabletop arena with a partially filled battery.
2. Steer around rivals and line up a clean bump angle.
3. Ram a rival hard enough to stun or break it against the rail.
4. Collect the dropped blue battery shards to refill charge and raise score.
5. Use dash to escape pins or convert a grazing hit into a knockout.
6. Survive escalating waves as battery drain, enemy pressure, and prop clutter rise.

## Final Rules For v1

- The run starts with one player car, one basic enemy, and a mostly open tabletop arena.
- Battery drains slowly over time and drops harder when the player takes collision damage.
- Destroyed rivals burst into a short fan of blue battery shards.
- Collecting a battery shard restores charge and increases score.
- Dash gives a brief speed burst plus stronger knockback on contact.
- Dash has a short cooldown and must be shown explicitly on touch.
- Basic rivals try to line up direct body checks.
- Heavy rivals spawn later, move slower, and hit harder.
- Arena hazard clutter grows over time with simple props and rail-tight spaces, not with new rules.
- The run ends when battery reaches `0`.
- Score is based on survival time, destroyed rivals, collected batteries, and short combo chains.

## Hazard, Reward, And Fail-state Signifiers

- Reward:
  - blue battery shards with glow and plus-sign pulse
  - white-blue charge ring around the player battery meter when refilling
- Danger:
  - rival cars are warm red or orange silhouettes
  - heavy rivals use a darker, larger body and heavier warning glow
  - hazard props and rail impact sparks are orange-red
- Fail state:
  - battery meter empties completely
  - the player car darkens, sputters, and powers down in place

These signifiers stay semantically aligned: blue charge keeps you alive, red impact pressure drains you out.

## Main Screens

- Start overlay:
  - title
  - one short rules block
  - `Play`
- Gameplay view:
  - full-viewport tabletop arena
  - minimal HUD with battery, score, and dash cooldown
  - explicit touch controls on mobile landscape
- Run-end overlay:
  - score
  - survival time
  - best
  - `Play Again`

## Core Interaction Quality Bar

- Steering must feel responsive, weighty, and readable at both low and high speed.
- A good ram should read instantly from camera shake, spark burst, hit pause, and knockback.
- The player car must remain easy to track without a giant always-on outline.
- The center of the playfield stays clear during normal play; HUD belongs on the edges.
- Touch controls must never cover the main collision lane.
- The arena should look like the actual shipped game, not a grey debug plane with placeholders.

## Strongest First-minute Feeling

The first minute should feel like confident toy-car aggression: the player slides wide around a cone, bursts through a rival with dash, vacuums the dropped batteries, and immediately understands that clean hits are how the run stays alive.

## HUD And Screen Plan

- Persistent HUD:
  - battery bar
  - score
  - dash cooldown
- Touch-only surfaces:
  - one left movement stick
  - one right dash button
- No pause menu clutter during active play
- No minimap
- No wave manifesto panels or long objective text

## Art Direction And Asset Plan

- Top-down tabletop arena on warm wood or laminated desk surface
- Chunky toy-car silhouettes from the local Kenney `toy-car-kit` or `car-kit` mirror
- White tape or cardboard rail edges plus a few simple props: cones, boxes, pencils, clips
- Blue battery shards, orange sparks, short skid streaks, and a restrained electric bloom
- No heavy environment set, no multi-room stage, no weather system

## Tech Approach And Code Structure

- Lightweight plain TypeScript app from the existing PlayDrop scaffold
- Three.js runtime with a top-down or lightly tilted camera
- Simulation state stays outside rendered objects
- Manual 2D arena physics:
  - positions
  - angles
  - velocities
  - circle or rounded-box collision proxies
  - knockback and dash response
- DOM HUD and touch controls layered over WebGL
- Proposed module boundaries:
  - `src/game/sim/`: state, rules, enemy logic, scoring
  - `src/game/render/`: scene, camera, model loading, FX
  - `src/game/input/`: keyboard and touch action mapping
  - `src/main.ts`: boot, UI shell, lifecycle

## Testing Plan

- Deterministic logic checks for:
  - battery drain and refill
  - dash cooldown
  - enemy spawn pacing
  - damage and knockout scoring
- `npm run validate`
- `playdrop project validate .`
- local browser QA on mobile landscape and desktop
- scripted balance sweeps for idle, casual, and expert policies because this is an endless score game

## If Touch Is A Primary Surface, The Exact Primary And Secondary Actions

- Primary action: steer with the left virtual stick
- Secondary frequent action: dash with the right-side button
- High-stakes accidental taps are avoided because dash sits in its own fixed button cluster away from the steering thumb zone

## Target Session Length, Target Skilled Run Length, And Replayability Plan

- Casual run target median: `60-120s`
- Expert run target median: `300s+`
- Expert `p25` target: `240s+`
- Replayability comes from score chase, cleaner combo routes, later heavy-rival pressure, and incremental mastery of angle control and dash timing

## Strongest Raw Screenshot, Clip, Or First-15-second Beat

The strongest raw screenshot is a bright tabletop frame with one cyan player car cutting across two red rivals, blue battery shards spilling near the rail, and a clean battery HUD at the edge. The first `15` seconds should show:

1. one fast opening drift
2. one successful dash ram
3. one battery pickup burst
4. one immediate near-miss that proves the pressure

## The Failure Condition That Sends The Project Back To 01-idea

If the raw build still reads like a flat toy-car prototype without obvious desire, or if the honest description collapses into “generic tiny racer with enemies,” the concept goes back to `01-idea` instead of being rescued with prettier media.

## Concrete Media Plan

- Capture a real landscape gameplay clip from the raw build after the feel pass
- Pull the hero art from a real gameplay screenshot reference, not from invented packaging
- Use a battery-burst ram moment as the primary screenshot
- Use one landscape gameplay video for listing and X

## Complexity Likely To Be Challenged In Simplify

- Too many enemy archetypes
- Too much prop density
- Any arena verticality, ramps, or track-piece ambition
- Any temptation to add laps, weapons, unlock trees, or multi-stage progression

## If A Starter, Demo, Template, Or Remix Path Is Involved, The Source-signature Removal Plan

There is no gameplay starter or remix source here beyond the raw PlayDrop TypeScript scaffold. The implementation must still replace the template signature immediately with:

- a real tabletop arena
- toy-car silhouettes
- explicit touch controls
- battery-drop combat feedback
- a real start and end screen that belong to `Overvolt`
