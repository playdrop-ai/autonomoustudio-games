# Switchback Dispatch - SPECS v1

## Original Game Name

Switchback Dispatch

## One-line Player-facing Value Proposition

Thread a courier truck through tight alpine switchbacks, hit every delivery beacon in sequence, and beat the clock before the mountain route eats your shift.

## Clear Differentiator

This is not a generic lap racer and not a sandbox driving toy. Every run is a compact courier contract with a fixed beacon sequence, visible next-stop pressure, and medal-time goals. The player is mastering one route as a delivery specialist, not pretending a stripped-down starter demo is a full racing game.

## Best Platform And Why It Is Best

`desktop`

Keyboard steering is the cleanest fit for the tight switchback handling, quick retries, and low-chrome HUD. The concept wants precise directional control more than broad surface coverage.

## Additional Supported Platforms And Why They Still Survive

- None in v1. Mobile landscape remains cut unless later implementation proves it is equally strong without bloated touch chrome.

## Gameplay Family

Compact 3D arcade courier racer.

## Game Meta

Three solo courier contracts on one loop, each with bronze, silver, and gold medal times plus a saved personal best.

## Input Per Supported Platform

- Desktop:
  - `W` or `Up`: accelerate
  - `S` or `Down`: brake or reverse
  - `A/D` or `Left/Right`: steer
  - `R`: retry from result or fail state

## Game Category And Subcategory

- Category: Racing
- Subcategory: Courier contract time trial

## Reference Games We Are Intentionally Close To

- `playdrop/app/starter-kit-racing` for browser-feasible low-poly arcade handling and scene scale
- `patcodes/app/racing_cart` for short-session solo racing readability
- arcade checkpoint and time-trial racers broadly, for instantly legible corner-speed mastery

## Core Loop

1. Select one of three courier contracts.
2. Launch from the dispatch cabin onto the alpine loop.
3. Read the active delivery beacon and the next beacon preview.
4. Drive the courier truck through the active beacon as quickly and cleanly as possible.
5. The next beacon lights immediately after a successful delivery.
6. Keep momentum through hairpins and avoid losing too much speed on guardrails.
7. Finish the full beacon sequence before the clock expires.
8. Earn a medal based on final time and retry for a cleaner run.

## Rules

- Contracts: `3`
  - `First Light`: `4` deliveries
  - `Ridge Relay`: `5` deliveries
  - `Last Run`: `6` deliveries
- Timer starts when control is handed to the player after the short countdown.
- Only the lit active beacon counts as progress.
- Driving through a non-active beacon does nothing.
- Hitting barriers does not instantly fail the run, but it kills speed and costs time.
- Falling badly off-line triggers a fast respawn on the road with a time penalty.
- The run fails when the timer reaches `0`.
- The run succeeds when the final active beacon is cleared.
- Medal targets are stored per contract and tuned during implementation.
- Best time persists locally per contract.

## Hazard, Reward, And Fail-state Signifiers

- Reward or target object: tall golden delivery beacon with a parcel icon and a bright ground ring
- Next preview: small gold parcel chip showing the next stop number and rough route direction
- Danger objects: red-and-white guardrails, cliff-edge hazard paint, and hard scenery near the road edge
- Fail pressure: timer displayed in a high-contrast top-left band that turns red under the final `10s`

These cannot be mistaken for each other. The active delivery beacon is warm and celebratory, while collision objects are striped or red and physically punitive.

## Main Screens And What Each One Shows

- Contract-select start screen:
  - title
  - one-line pitch
  - `3` contract cards with route names and medal targets
  - short control line
- Gameplay:
  - timer
  - contract name
  - deliveries complete / total
  - next beacon preview
  - full-viewport driving view with no webpage-card framing
- Result screen:
  - contract name
  - final time or fail state
  - medal earned
  - best time
  - `Retry` and `Back to Contracts`

## Core Interaction Quality Bar

- Steering response must feel immediate and readable through the first hairpin.
- Camera must stay stable enough that the next corner and beacon read at speed.
- The truck must feel planted on asphalt and visibly punished by barrier scrapes.
- Delivery beacons must be readable from far enough away that planning, not guesswork, drives the turn.
- Retry flow must get the player back into motion quickly, without menu bloat.
- The gameplay screen must still read as a game scene, not a UI composition.

## Strongest First-minute Feeling

The player should feel like a highly capable courier barely holding a mountain shift together: fast, focused, and under clean visible pressure rather than chaotic noise.

## HUD And Screen Plan

- One compact timer cluster at the top-left
- One compact contract-progress cluster at the top-center
- One compact next-stop chip at the top-right
- No bottom dashboard, no persistent tutorial panel, no split-screen minimap

## Art Direction And Asset Plan

- Camera: low chase camera with clear road read and slight drift-friendly tilt
- Palette: charcoal road, pine green, warm sunrise gold, courier yellow, bright gold delivery beacons, red-and-white hazards
- Materials: matte low-poly asphalt, clean reflective beacon cores, restrained bloom only on active delivery targets
- Environment: pine trees, roadside tents, cabins, and mountain props reused from the starter asset language
- Vehicle: one courier truck only, visually distinct from the starter by palette, markings, and UI framing
- Audio:
  - countdown chirp
  - delivery-confirmation hit
  - barrier scrape
  - result stinger

## Tech Approach And Code Structure

- Keep the remixed starter-kit racing stack and cut away what the concept does not need.
- Use the existing Three.js plus Rapier route instead of inventing a fresh runtime.
- Proposed modules after refactor:
  - `src/main.ts` bootstraps the app and PlayDrop host integration
  - `src/runtime/demo.ts` becomes the single-player courier game controller
  - `src/runtime/contracts.ts` defines contract order, medal targets, and persistence keys
  - `src/runtime/dom.ts` owns the contract-select UI, HUD, and result UI
  - `src/data/track-layout.ts` is reshaped to the final loop
  - `tests/` cover contract progression, medal evaluation, timer failure, and respawn penalties

## Testing Plan

- `npm run validate`
- `playdrop project validate .`
- contract logic tests for delivery progression, wrong-beacon no-op behavior, finish detection, respawn penalty, and medal evaluation
- real browser runs on desktop through the full contract flow
- Playwright screenshot and video capture for both local and hosted verification

## Target Player Session Length, Target Skilled Clear Or Run Length, And Replayability Plan

- Fresh player session target: `10-15` minutes across the three contracts plus retries
- Skilled clear target:
  - `First Light`: about `55-70s`
  - `Ridge Relay`: about `70-85s`
  - `Last Run`: about `85-100s`
- Replayability:
  - bronze, silver, and gold medal chase
  - cleaner line mastery on the same loop
  - faster recoveries after mistakes
  - best-time improvement per contract

## Strongest Raw Screenshot, Clip, Or First-15-second Beat

The strongest raw moment is the courier truck entering the first downhill hairpin with the active beacon glowing just beyond the apex, timer already running, and the next beacon preview hinting that the player must exit cleanly to stay on medal pace.

## The Failure Condition That Sends The Project Back To `01-idea`

If the refactor still honestly reads like `Starter Kit Racing` with a relabeled HUD, or if the first 15 seconds do not make the courier-contract fantasy immediately desirable, the project fails back to `01-idea` instead of trying to rescue it with prettier listing art.

## Concrete Media Plan For Icon, Hero, Screenshots, And Gameplay Video

- Icon: the courier truck nose plus one bright parcel beacon, full-bleed and motion-forward
- Hero: the truck sliding into a mountain hairpin with the title centered over the open road band
- Screenshot 1: early-contract clean line with one beacon ahead
- Screenshot 2: tense late-contract moment with low timer and one delivery left
- Gameplay video: start in-motion within seconds, show one clean delivery, one barrier scrape, one late-contract recovery, and the medal result

## Complexity Likely To Be Challenged In The Simplify Step

- Whether any extra surface beyond desktop survives
- Whether respawn penalties need more than one simple rule
- Whether more than three contracts are necessary
- Whether decorative props beyond trees, tents, cabins, and beacons are worth keeping
