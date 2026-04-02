# Glowknot - SPECS v1

## Original Game Name

Glowknot

## One-line Player-facing Value Proposition

Aim glowing lanterns into matching clusters, cut the silk anchor knots, and drop whole festival canopies before the line sinks too low.

## Clear Differentiator From The Reference Games

The differentiator is visible anchor-cut canopy collapse. Standard bubble shooters often feel like shaving colors off a flat ceiling. `Glowknot` presents each board as a suspended lantern canopy with obvious silk attachment points, so the best move is the dramatic whole-canopy drop instead of incremental cleanup.

## Best Platform And Why It Is Best

`mobile portrait`

Portrait is best because the bubble-shooter lane already reads naturally as a vertical hanging field with a bottom launcher. A phone-sized portrait frame makes the sinking line, next-shot preview, and giant falling drops legible without side chrome or camera movement.

## Additional Supported Platforms And Why They Still Survive

- `desktop`

Desktop survives because mouse aiming preserves the same interaction grammar, helps capture a landscape gameplay video for X, and does not force layout changes beyond modest scaling and safe-area adjustments.

## Gameplay Family

Single-screen hanging-cluster bubble shooter.

## Game Meta

Endless score chase through rising-pressure lantern canopies.

## Input Per Supported Platform

- Mobile portrait: drag from the launcher to aim; release to fire.
- Desktop: move the pointer to aim; click to fire.

## Game Category And Subcategory

- Category: Puzzle
- Subcategory: Bubble shooter

## Reference Games We Are Intentionally Close To

- `Puzzle Bobble` for the aim-shoot-match-drop grammar.
- `Frozen Bubble` for reserve-shot planning and clean bubble-shooter readability.
- `Bubble Shooter HTML5` from `osgameclones` for proof that a pure JavaScript implementation path is realistic.

## Core Loop

1. Read the hanging lantern canopy and the current plus reserve shot.
2. Aim the current shot, banking off walls when useful.
3. Land a same-color group of 3+ to pop that cluster.
4. Detach any lanterns no longer connected to a top silk anchor and cash in the drop bonus.
5. Survive the sinking line, larger color mixes, and faster late-run pacing long enough to engineer bigger canopy cuts.

## Main Screens And What Each One Shows

### Start

- Live gameplay board visible behind a compact bottom sheet.
- Game name, one-sentence promise, one-line how-to-play, and a single `Start` CTA.
- The lower sheet must stop above the launcher so the player still reads the board shape before starting.

### Gameplay

- Full-viewport hanging board, edge to edge.
- Minimal HUD only: score, best score, sinking danger indicator, current shot, reserve shot.
- No persistent tutorial text during play.

### Game Over

- Live frozen board still visible.
- Compact bottom sheet with final score, best score, biggest drop bonus, and `Retry`.
- Supporting text stays short and separated from the stats and CTA.

## Art Direction And Asset Plan

### Camera And Composition

- Portrait-first full-viewport board with three visible top silk anchors and a bottom-centered launcher.
- Desktop keeps the same board, just wider backdrop shoulders and landscape-safe HUD spacing.

### Palette

- Midnight indigo backdrop.
- Warm lantern colors: ember coral, honey gold, jade, cyan, and plum.
- Silk ropes and anchors in dark teal and brass.

### Materials And Motion

- Lanterns read as lacquered paper discs with a soft inner glow and crisp outline.
- Pop feedback is a quick paper-burst spark, then detached lanterns fall with a short silk-snap flash.
- The board should feel glossy and festive, not toy-physics sloppy.

### Asset Plan

- Bespoke 2D canvas shapes for lanterns, ropes, and anchors.
- Painted background generated procedurally or as a simple gradient-and-silhouette composition.
- No external gameplay asset dependency is required beyond optional reference use.

## Core Interaction Quality Bar

### Alignment And Spacing

- Shot landing must snap cleanly into the hex grid with no visual wobble or half-overlaps.
- Top anchors, grid cells, and launcher centerline must align exactly across portrait and desktop.
- HUD sits outside the active lantern cluster mass and never overlaps the sinking line or launcher arc.

### Motion

- Aim line updates at full refresh with no visible lag.
- Shot travel is fast enough to feel arcade-sharp, but not so fast that bank angles become unreadable.
- Pop timing: immediate match flash, very short hit-stop, then detached sections fall as one satisfying event.
- Ceiling sinks in clear stepped beats, never in a jittery continuous drift.

### Readability

- Current shot and reserve shot must be recognizable at a glance.
- The sinking line must read instantly as danger without extra text.
- The three top anchors must make it obvious where a canopy is still attached.

## HUD And Screen Plan

- Active gameplay HUD remains minimal: score, best, sinking-line proximity, current shot, reserve shot.
- Start and game-over are the only overlay states.
- No pause menu, settings page, tutorial carousel, or progression screen in v1.

## Tech Approach And Code Structure

- TypeScript + canvas inside the PlayDrop TypeScript template.
- Keep gameplay independent from SDK except for init, host loading state, and optional future persistence hooks.
- Planned modules:
  - `src/main.ts` for bootstrap, resize, and screen orchestration.
  - `src/game/board.ts` for hex-grid state, spawning, and detach logic.
  - `src/game/rules.ts` for scoring, shot counters, and danger descent pacing.
  - `src/render/renderer.ts` for board, HUD, overlays, and motion.
  - `src/debug/hooks.ts` for deterministic capture helpers such as `window.render_game_to_text`.
- No physics engine and no 3D scene graph.

## Testing Plan

- Type-check plus build on every validation run.
- Logic tests for hex neighbors, cluster detection, detachment, reserve-shot swap, and wave spawn validity.
- Scripted balance sweeps for idle, casual, and expert policies.
- Local Playwright capture script for portrait and desktop screenshots plus a short gameplay recording.

## Target Player Session Length, Skilled Run Length, And Replayability Plan

- Endless score game target medians:
  - casual policy: `60-120s`
  - expert policy median: `300s+`
  - expert policy p25: `240s+`
- Replayability comes from seeded canopy patterns, reserve-shot planning, bank shots, and increasingly valuable canopy drops in longer runs.

## Scripted Balance Sweeps

- Idle policy: fire random legal shots with no planning.
- Casual policy: prefer the largest visible same-color cluster in the lower half of the board and use reserve only for obvious immediate matches.
- Expert policy: evaluate bank shots plus anchor-detach opportunities, prefer shots that either pop immediately or create a likely detach on the following shot, and spend reserve strategically.
- Sweep outputs must report median and p25 survival times against the target windows above before `06-gameplay-v1` can pass.

## Strongest Raw Screenshot, Clip, Or First-15-second Beat

- The first 15 seconds must show a near-immediate canopy drop: the player banks a lantern into a small support cluster, the silk-lit section detaches, and 8 to 12 glowing lanterns fall through the frame while the score spikes.
- The strongest raw screenshot is a portrait gameplay moment with one anchor still holding, one canopy mid-fall, and the next two shots visible below the board.

## Failure Condition That Sends The Project Back To 01-idea

- If the raw build does not make anchor-cut drops look clearly better than generic bubble cleanup, or if the board-reading fantasy is not obvious without explanatory text, the project fails back to `01-idea` instead of being rescued with prettier art or more content.

## Concrete Media Plan

- Capture a strong portrait gameplay screenshot from the real build with a visible canopy drop before any hero generation.
- Use that screenshot as the PlayDrop AI reference for the primary portrait hero, with `Glowknot` centered in the composition.
- Generate the landscape hero from the approved portrait or landscape-safe sibling reference so the family stays matched.
- Generate the icon from the approved hero reference after the hero family is locked.
- Capture at least two portrait gameplay screenshots and one desktop/landscape gameplay screenshot from the real build.
- Record one real landscape gameplay MP4 from the desktop-supported surface for the X-first release post.

## Complexity Likely To Be Challenged In Simplify

- A fully bespoke backdrop painting is optional and should be cut before any gameplay system if time gets tight.
- Multiple special-lantern types are out unless the simplest ruleset feels too flat.
- A third future shot in the queue is out unless the basic current-plus-reserve design somehow fails readability.
