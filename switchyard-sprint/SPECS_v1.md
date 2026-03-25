# Switchyard Sprint V1

## Core Promise

Deliver an instantly readable arcade routing game: trains keep coming, the yard is tiny, and the only thing between a clean delivery streak and disaster is whether the player flips the right switch in time.

## Core Game Loop

1. The title screen shows the rail yard, three switch buttons, and a short one-line instruction.
2. The player starts a run.
3. Trains spawn from the left one after another with a clear cargo color and depot target.
4. The player toggles three switches to route each train toward the top, middle, or bottom depot.
5. Correct deliveries add score, raise combo, and slightly increase traffic speed.
6. A wrong delivery ends the run immediately.
7. The game-over overlay shows score, best score, deliveries, and a replay button.

## Screens

### Title / Ready

- Large title
- One-sentence rule explanation
- Visible live yard preview
- Start button
- Small keyboard hint on desktop only

### Gameplay

- Fixed non-scrolling game board
- Score
- Combo
- Best score
- Upcoming queue of the next few trains
- Three large switch controls with clear current states
- Brief destination labels integrated into the depots, not in a separate menu

### Game Over

- Final score
- Best score
- Deliveries count
- Replay button
- Fast restart path with no extra menu depth

## Gameplay Details

- Three depot targets: top, middle, bottom
- Three switch states:
  - Branch switch sends a train into the upper or lower half of the yard
  - Upper switch routes upper-branch trains to top or middle
  - Lower switch routes lower-branch trains to middle or bottom
- Multiple trains can be active at once, but spacing stays generous enough to keep the board readable on mobile
- Difficulty ramps by gradually increasing train speed and reducing spawn interval after successful deliveries
- No lives, currencies, meta-progression, settings page, or tutorial maze in v1

## Art Direction

- Bright tabletop rail yard with a deep green board, warm wood trim, glossy depot lights, and saturated cargo colors
- Use selected train models from `kenneynl/asset-pack/train-kit` as runtime art
- Keep the track presentation simple and readable; the focus is on the trains and switch timing, not on simulation complexity
- Do not rely on more than a few imported art assets:
  - one engine model
  - three colored carriage models
- Listing media should come from the actual running game, not synthetic marketing-only renders

## Tech

- Playdrop-hosted static app
- TypeScript + esbuild local build
- Three.js for the fixed camera diorama scene
- Pure gameplay logic separated from rendering so routing, scoring, and difficulty can be unit-tested
- No server, ECS, multiplayer, or identity requirement for v1
- We are not using the heavier racing or character starter kits because this game only needs a fixed camera, simple spline movement, and precise UI responsiveness

## Code Structure

- `src/main.ts`: bootstraps Playdrop, scene, UI, and session lifecycle
- `src/game-logic.ts`: pure routing, queue, scoring, and difficulty helpers
- `src/network.ts`: fixed rail graph and curve metadata
- `tests/game-logic.test.ts`: unit coverage for route selection, combo scoring, and difficulty scaling
- `assets/models/`: selected train GLBs
- `listing/`: screenshots, heroes, icon, and gameplay video once the game is ready

## Input

- Desktop:
  - keyboard `1`, `2`, `3`
  - mouse click on switch controls
- Mobile portrait and landscape:
  - large tap targets for each switch
- No drag-only or hover-only mechanic in v1

## Testing

- Unit tests for route resolution, queue generation constraints, score/combo progression, and difficulty ramp
- Local manual playtesting on desktop, mobile landscape, and mobile portrait
- Playdrop validation before publish
- Playdrop capture for real screenshots and listing media
- Final live verification on the published URL

## V1 Gate Targets

- The rules are understandable in seconds without a separate tutorial screen
- The board fits on screen with no scrolling on all supported surfaces
- Frame rate stays smooth because the scene is small and assets are limited
- The code remains remix-friendly: readable modules, deterministic logic helpers, and automated tests
