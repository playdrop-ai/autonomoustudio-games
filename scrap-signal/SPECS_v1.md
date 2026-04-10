# Scrap Signal - SPECS v1

## Original Game Name

Scrap Signal

## One-line Player-facing Value Proposition

Hold the beacon through a storm-lashed salvage shift by blasting scrap drones and hauling battery drops home before the blackout closes in.

## Clear Differentiator From The Reference Games

`Scrap Signal` keeps the proven top-down survival-shooter language, but the run is not just about kill efficiency. The player can carry only one battery canister at a time, and the beacon lives or dies on those return trips. That forces the first minute to revolve around kill priority, pickup timing, and how far the player dares to drift from center, which is a stronger angle than a generic wander-and-shoot arena.

## Best Platform And Why It Is Best

`desktop`

The game wants simultaneous movement and cursor aim with a clean, uncluttered field. Desktop mouse aim gives the crispest version of that loop and keeps the arena readable without dedicating on-screen space to twin-stick touch controls.

## Additional Supported Platforms And Why They Still Survive

None in the locked v1.

## Gameplay Family

Single-arena top-down beacon-defense shooter.

## Game Meta

One rescue shift per run, local best score, and no extra progression systems in v1.

## Input Per Supported Platform

- Desktop:
  - `WASD` to move
  - mouse to aim
  - hold left mouse to fire the arc-welder stream

## Game Category And Subcategory

- Category: Action
- Subcategory: arena defense shooter

## Reference Games We Are Intentionally Close To

- `Robotron: 2084`, `Geometry Wars`, and `Crimsonland` for the proven move-aim-shoot survival loop
- `Monster March` as public PlayDrop proof that top-down action reads on the platform, while also serving as a warning against shipping a kill-only wrapper
- `Pocket Bastion` as a negative-space studio reference so the final build does not drift into another defense-grid lane

## Core Loop

1. Spawn beside the beacon with the rescue timer already counting down.
2. Strafe around the arena and cut down incoming drones before they ram the signal tower.
3. Prioritize battery carriers when the beacon drops into danger.
4. Drive over one dropped battery canister to pick it up.
5. Return that battery into the beacon halo to repair integrity and bank the deposit score.
6. Repeat until rescue arrives or the beacon blacks out.

## Final Rules For The Planned v1

- The arena is one full-screen top-down salvage field centered on a beacon tower.
- The beacon starts each run with `12` integrity.
- The run lasts `6:00`; if the beacon still has integrity when the timer reaches zero, rescue arrives and the player wins.
- The player can move freely within the arena bounds.
- The player fires toward the cursor while left mouse is held.
- Enemy families:
  - `Scrappers`: basic drones that rush the beacon
  - `Rammers`: faster units that commit to hard dives on the beacon
  - `Carriers`: slower armored targets that always drop one battery canister on death
- If an enemy reaches the beacon, it deals integrity damage and is destroyed.
- The player can carry only one battery canister at a time.
- A carried battery repairs the beacon when the player brings it into the beacon halo.
- Enemy contact with the player causes strong knockback and a short weapon jam, but the run still fails only on beacon blackout.
- Score comes from kills, successful battery deposits, and remaining beacon integrity at clear.

## Hazard, Reward, And Fail-state Signifiers

- Reward:
  - hot amber battery canisters
  - blue-white beacon halo pulses on a successful repair deposit
  - clean white score pop on a kill or bank
- Hazard:
  - rust-red drones and rammers
  - dark impact streaks from beacon hits
  - integrity bar shifting from cool blue to orange to critical red
- Fail state:
  - the beacon halo collapses and the tower goes dark when integrity reaches zero

The player should read amber as good, red as bad, and the bright center halo as the thing that must stay alive.

## Main Screens And What Each One Shows

- Start overlay:
  - title
  - one-line hook
  - one short controls line
  - single `Start Shift` CTA
- Gameplay:
  - full-viewport arena
  - rescue timer
  - beacon integrity bar
  - score
  - one small carry indicator showing whether the player is holding a battery
- Run-end overlay:
  - rescued or blackout verdict
  - score
  - best score
  - restart CTA

## Core Interaction Quality Bar

- Movement must feel crisp and responsive, with enough inertia to read as a skiff rather than a floating cursor.
- The player should never lose the cursor or firing direction against the storm-dark background.
- Bullet impacts, carrier destruction, battery pickup, and beacon deposit all need distinct feedback pulses.
- The arena must read edge to edge, not as a webpage card floating in dead space.
- The integrity bar and timer must stay legible without dominating the frame.
- The carried-battery state must be obvious at a glance before the player commits to a return run.

## HUD And Screen Plan

- Active gameplay HUD is minimal: timer, beacon integrity, score, and carry state only.
- No side panels, no inventory list, no upgrade tree, and no persistent tutorial block during play.
- Start and run-end overlays should leave enough of the arena visible that the product still reads as the same game.

## Art Direction And Asset Plan

- Camera/framing: straight top-down 2D arena filling the whole viewport
- Palette:
  - storm-black and steel-blue background
  - cold white-blue beacon core and halo
  - rust-red enemies
  - amber battery canisters
  - white tracer fire and sharp weld-spark impacts
- Materials:
  - wet steel and harbor-water texture treatment
  - restrained bloom on the beacon and deposit pulses only
  - no toyish plastic bevels or debug-grid look
- Scale:
  - player and enemies large enough to read instantly on desktop
  - battery canisters clearly distinct from hazards at first glance

## Tech Approach And Code Structure

- Stay on the simple PlayDrop TypeScript app path.
- Use a full-viewport canvas for the arena, actors, particles, and hit effects.
- Use lightweight DOM overlays for the start screen, HUD text, and run-end screen.
- Planned module split:
  - `src/main.ts`: PlayDrop boot, app shell, resize, screen state
  - `src/game/input.ts`: keyboard and mouse input state
  - `src/game/sim.ts`: entities, waves, combat, pickup and deposit rules, win or lose checks
  - `src/game/render.ts`: arena draw, actors, particles, HUD anchoring math
  - `src/game/waves.ts`: deterministic wave schedule and seeded spawn variation
  - `src/game/types.ts`: shared constants and data shapes
- Keep the simulation deterministic enough for scripted tests and repeatable capture seeds.

## Testing Plan

- Deterministic logic tests for:
  - wave timing and enemy spawn composition
  - beacon-hit damage
  - carrier death and battery drop behavior
  - one-battery carry limit
  - battery deposit and repair
  - timer-based rescue win
  - blackout loss
- `npm run validate`
- `playdrop project validate .`
- Real browser QA on desktop
- Hosted verification after publish with Playwright

## Target Session Length, Target Skilled Clear Or Run Length, And Replayability Plan

- Fresh-player target session: `2-5` minutes before blackout
- Skilled clear target: `6:00`
- Replayability comes from better clear scores, cleaner beacon preservation, and seeded wave variation rather than unlock trees or content volume

## Strongest Raw Screenshot, Clip, Or First-15-second Beat

The strongest raw screenshot is a mid-shift frame where the player is carrying one amber battery back toward the bright center halo while two rust-red rammers cut in from opposite edges and white tracer fire is still crossing the frame. The first `15` seconds should show the player clearing an early carrier, picking up its battery, and pulsing the beacon back to health.

## The Failure Condition That Sends The Project Back To `01-idea`

Return to `01-idea` if the real build still feels like a generic kill-only horde shooter, if the battery-deposit loop does not materially change the first-minute decisions, or if the raw screenshot still looks too close to `Monster March` or a placeholder arena prototype.

## Concrete Media Plan For Icon, Hero, Screenshots, And Gameplay Video

- Icon:
  - beacon tower plus one amber battery and one attacking red silhouette
- Hero:
  - the beacon halo mid-defense with the title centered
- Screenshots:
  - active defense frame with crossfire
  - battery return frame showing the carry-and-bank loop
- Gameplay video:
  - open directly on active combat
  - show one carrier drop, one battery pickup, one beacon repair deposit, and the rescue or blackout ending

## Complexity Likely To Be Challenged In The Simplify Step

- mobile-landscape twin-stick support
- a secondary EMP pulse or dash button
- boss waves
- multiple arenas
- hard mode or challenge modifiers
- upgrade shops or between-wave buy screens

## Starter, Demo, Template, Or Remix Source-signature Removal Plan

The only starter path is `playdrop/template/typescript_template`. Before implementation, every visible trace of that starter must disappear:

- opening beat: replace the template message with a real `Scrap Signal` start screen
- framing: full-viewport arena instead of a generic page shell
- visual identity: bespoke beacon halo, storm field, enemy silhouettes, and battery canisters
- HUD: timer, integrity, score, carry state only
- objective presentation: rescue shift and beacon protection, not template copy or starter text
