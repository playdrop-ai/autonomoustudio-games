# Chopline Rush — Production Core Specs

`catalogue.json.design` is the canonical product definition. This document records the playable
contract for the production core: player control, physics, level design, visuals, and juice.

## Product Contract

- Mobile portrait is primary; desktop is a centered portrait compatibility frame.
- Authored progression is primary: 60 finite levels across five 12-level acts.
- Endless is the secondary mastery mode and retains the reviewed 41-chunk generator.
- Every cut awards one score point and one soft coin.
- Level progress submits to `max_level`; endless best submits to `endless_score`.
- A run boots directly into the current level. Retry and next-level actions take one tap.
- The core result flow has no interstitial or rewarded prompt.

## First-Time User Experience

The canonical reference is the clean first session of Poki's Slice Master, captured from
<https://poki.com/en/g/slice-master>. Level 1 must copy that integrated lesson:

1. The knife begins blade-first in a tall white start block. A second white runway begins after one
   narrow, clearly visible gap.
2. The only instruction is a large white world-space message above the knife and runway:
   `TAP ANYWHERE / TO JUMP AND FLIP!`. It has no card, hand icon, ring, arrow, modal, or detached DOM
   treatment. Because it is anchored in the level, it naturally scrolls left as the camera follows.
3. The regular game HUD is hidden while the lesson is active, matching the reference's Level 0
   interface state.
4. Input is accepted on pointer release. The first tap launches and spins the knife across the gap.
   It lands blade-first on the runway immediately before the first green apple. It does not score and
   it does not fail.
5. The second tap launches from that planted position and cuts the green apple. The apple becomes two
   physical halves with a bright cut face, cube debris, a pale segmented arc, and a floating `+1$`.
6. Red and yellow apples continue the learned planted-jump rhythm without adding another instruction.
   Tutorial completion persists only when the first green apple is physically sliced.

No thirteen-slab opening wall, forced airborne follow-up, separate landing target, glowing gate,
ghost knife, or additional tutorial copy is allowed in Level 1.

## Motion Model

The knife moves in the Y-Z plane and rotates about X. Physics is deterministic 2D; visuals are 3D.

| Constant | Value |
|---|---|
| Level 1 launch velocity (up / forward) | 11.7 / 8 (forward is scaled to Chopline world units) |
| Level 1 gravity / rotation / cooldown | -23 / 560 degrees/s / 0.15 s |
| Later-level launch / gravity / rotation / cooldown | 10 / -20 / 7 rad/s / 0.4 s |
| Air-tap vertical impulse | +15, capped at the active launch speed; forward speed renews to 8 |
| Cut fragment gravity | -15 |
| Integration | 1/120 s substeps with swept mid-sample collision checks |
| Canonical angle | 120 degrees; targets are `n * 360 + 120` |
| Blade / handle reach | Derived from semantic model anchors |
| Embed depth (top / side) | 0.15 / 0.4 |
| Endless no-score timer | 10 s, visible whenever active |

Rules:

- Level 1 uses the captured 11.7-up / -23-gravity / 560-degrees-per-second reference motion. Later
  authored levels retain their validated 10-up / -20-gravity / 7-radians-per-second model so the
  existing 60-level geometry remains playable. An airborne tap adds 15 vertical velocity, capped at
  the active launch speed, and renews forward speed to 8, so early taps preserve height while later taps produce lower cutting
  arcs. Bottom and side sticks apply their authored escape coefficients. Every accepted tap advances
  at least half a turn to the next canonical blade-down-forward angle.
- Blade contact cuts. Valid approach angles enter slice-lock, reduce forward travel, ease to the
  canonical angle, and batch-cut a stack as the blade carves downward.
- Handle-first contact looks ahead through half a turn. It cuts if the blade sweep is imminent;
  otherwise it bounces, reverses half the forward speed, and preserves the fall.
- An aligned blade landing sticks. A recoverable bad angle rotates in place toward a valid stick,
  then gives up after 2.25 turns. Launch surfaces cannot be re-caught until geometrically clear.
- Each cut creates two persistent capped halves that slide, fall, tumble, and spring-settle.

The baseline anti-spam contract remains mandatory: the paced test bot must materially outperform
the spam bot.

## Level Design

`src/game/levels.ts` defines all 60 levels as explicit sequences of validated course chunks.

- Act 1 — Picnic Meadow: launch, re-launch, air-tap, landing, and readable stack rhythms.
- Act 2 — Orchard Steps: height changes and the first moving targets.
- Act 3 — Brick Alley: spikes, roofs, and deliberate over/under decisions.
- Act 4 — Windy Shelves: moving platforms and tighter timing combinations.
- Act 5 — Chef's Gauntlet: mixed mastery sequences with no new hidden rules.

Each level has a name, accent, cut requirement, and authored gaps. Every level terminates in a
physical chopping-board station with a marked brick stack. A run only clears after the player cuts
through that stack, satisfies the level's cut requirement, and plants the blade into the board.
Crossing a coordinate cannot award a win; overshooting the final station fails the run. Every
referenced chunk must also remain individually playable in the 41-chunk validation sweep.

## Visual and Juice Hierarchy

- Readability first: cyan sky, green ground, white platforms, strong hazard red, and one act accent.
- Action feedback: specular knife rotation, trajectory trail, individual `+1` labels, physical split
  halves, cut flash, 40 ms hit stop, restrained camera trauma, haptic pulse, and material-specific SFX.
- Landing feedback: blade embed, impact squash, sparks, an expanding accent ring, camera kick, and
  haptic weight proportional to impact speed.
- Milestones: occasional combo praise and act callouts in endless. Level endings use a staged final
  chop: cascading stack destruction, board compression, hit stop, close camera, shockwaves,
  fragments, confetti, and a world-space `PERFECT CHOP` card before results.
- UI communicates only the current decision: score/requirement, level progress, wallet, and controls.
  Pause/gear/wallet are hidden while the FTUE is actively teaching.

## Deterministic and Release Contract

- `window.render_game_to_text()` returns compact gameplay state and nearby interactables.
- `window.advanceTime(ms)` advances the fixed-step simulation deterministically.
- `npm run validate:local` and `npm run proof:mechanics` pass.
- PlayDrop project check validates both declared surfaces and their tap tapes.
- Final portrait playtest covers: clean boot, complete FTUE, level clear, failure/retry, airborne tap,
  tip landing, stack cut, Level 2 unlock, endless timer, shop selection, and both leaderboards.
