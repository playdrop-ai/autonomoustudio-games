# Chopline Rush - SPECS

`catalogue.json.design` is the canonical product definition. This file records the user-facing
acceptance criteria and the exact motion model the game must implement. The tuning table in
`src/main.ts` mirrors these numbers; change them here first.

## Product

- Mobile portrait is the primary surface; desktop is compatibility mode.
- One mode only: an endless run for the best score.
- Submit the best score to the PlayDrop `endless_score` leaderboard.
- Every successful cut awards one score point and one soft coin.
- Coins unlock knife models and world themes. There are no levels, quests, revives, ad rewards,
  or paid coin packs anywhere in the game.

## Motion Model

The knife moves in the Y-Z plane and rotates about X. Physics is 2D; visuals are 3D.

| Constant | Value |
|---|---|
| Launch velocity (up / forward) | 10 / 8 |
| Gravity | -20 (knife), -15 (cut fragments) |
| Rotation speed | 7 rad/s (8 rad/s easing during a slice-lock) |
| Tap cooldown | 0.4 s |
| Integration | 1/120 s substeps with swept mid-sample collision checks |
| Canonical angle | 120 degrees; every rotation target is `n * 360 + 120` |
| Blade / handle reach | 1.7 / handle from model anchors; half-widths per model |
| Embed depth (top / side) | 0.15 / 0.4 |
| Stick alignment | reject when `cos * dir > 0.3` (top/bottom) or `sin * dir > 0.3`; side faces need `abs(sin) >= 0.5` |
| Ceiling / ground | y <= 30; y < 0 fails the run |
| No-score timeout | 10 s |

Rules:

- **Tap** (any state, cooldown-gated): velocities are set absolutely (10 up, 8 forward). Launching
  from a bottom stick uses a small downward push (roof 0.25, else 0.1 coefficient); a side stick
  launches up and away from the face (front faces at half forward speed). The rotation target
  advances to the next canonical angle at least half a turn ahead; the knife spins at 7 rad/s and
  settles exactly blade-down-forward.
- **Cut**: any blade contact on a sliceable cuts it. If the blade is within [-130, +45] degrees of
  canonical, the knife enters slice-lock: forward speed drops to zero when a stack sibling is
  below (otherwise 30 percent), rotation eases to canonical at 8 rad/s, and every substep
  batch-cuts what the blade sweeps while vertical speed damps by 0.85 per batch. The knife carves
  down through the stack and plants in whatever is beneath.
- **Handle-first on a sliceable**: look ahead up to half a turn of rotation; if the blade would
  sweep the target, cut it anyway. Otherwise bounce: forward speed reverses and halves, fall
  speed is preserved, spin continues to the next canonical target.
- **Landing**: aligned blade contact sticks with an embed, impact squash, particles, camera kick,
  and haptic pulse. Misaligned contact enters rotating-to-stick: the knife spins in place riding
  the surface and plants the moment the blade qualifies, giving up after 2.25 turns and falling.
  A platform the knife just launched from cannot be re-contacted until geometrically clear, and a
  platform that exhausted a rotate-to-stick cannot be re-caught until cleared.
- **Fragments**: each cut spawns two halves with visible interior caps. They slide apart on the
  cut axis with friction, tumble off the platform edge, fall at -15, then spring-settle onto the
  ground and persist until the camera passes them.

## Visual Target

- Bright low-poly world: cyan sky, green ground, white course blocks, mountain and pine bands.
- Original authored endless opening: pedestal, thirteen-course wall, orange stacks, face
  target, camera props, then the reviewed reusable chunks in `buildEndlessCourseTemplates`.
- The starter knife is the two-tone cooking knife (bright blade, wooden handle) with semantic
  anchors; collision geometry derives from the real tip, hilt, and handle end. The blade carries
  a scoped environment map so rotation reads through specular movement.
- HUD contains only score, best, coins, pause, gear, and the initial tap prompt.
- Cuts show `+1`, occasional praise, a brief hit stop, flash, and restrained camera feedback.

## Release Bar

- `npm run validate:local` and `npm run proof:mechanics` pass.
- Portrait playtest proves startup, repeated airborne taps, a successful cut, a tip landing,
  failure, restart, knife selection, theme selection, and the leaderboard submission path.
- Portrait listing media shows the real endless run with visible split geometry.
