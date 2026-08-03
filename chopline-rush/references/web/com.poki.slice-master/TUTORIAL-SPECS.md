# Slice Master — Tutorial Deconstruction and Implementation Spec

Canonical URL: <https://poki.com/en/g/slice-master>

Captured: 2026-08-03, iPhone 15 emulation, 393 × 852 CSS px. The embedded game canvas measured
393 × 595 CSS px with a 1179 × 1785 backing buffer. This specification is based on direct interaction
with the real Poki embed and inspection of its publicly shipped PlayCanvas scene/config/scripts.

## Tutorial contract

The tutorial is Level 0, not a separate overlay sequence. The camera opens on a cyan-and-green
low-poly landscape. A large two-tone knife is already planted blade-first in a tall white block. A
long white runway begins after a narrow gap, and a green apple is the first visible target.

The only instruction is world-space white text, angled by the 3D camera:

> TAP ANYWHERE
> TO JUMP AND FLIP!

It has no panel, hand cursor, animated ring, ghost trajectory, forced landing decal, or second written
step. The normal in-game interface is hidden for Level 0. The text remains anchored at its world
position, so camera movement carries it naturally off the left edge.

## Input and state sequence

1. Idle indefinitely with the knife planted and the instruction readable.
2. Accept the action on pointer/mouse release. A very short click that does not span an update frame
   may not register; the captured interaction used a 100 ms press.
3. First release: unstick, apply jump impulse, spin backward, show a pale segmented trail, and track
   the knife forward with the camera.
4. Approximately one second later: land blade-first on the first runway before the green apple. No
   score is awarded. This safe landing silently teaches that a planted knife can be launched again.
5. Second release: repeat the same jump/flip. The blade intersects the green apple on the descending
   portion of the arc.
6. Slice response: hide the intact apple, create two green shell halves with yellow-green interiors,
   push the halves apart so at least one falls from the runway, emit small yellow cube debris, and
   float `+1$` near the contact point.
7. Continue with a red apple and a yellow apple using the same planted-jump cadence.

## Shipped motion values

The minified production script exposes these values directly:

| Property | Shipped value |
|---|---:|
| Initial jump linear velocity | `(4.2, 11.7, 0)` |
| Gravity | `-23` |
| Maximum rotation velocity | `560 degrees/s` |
| Jump cooldown | `0.15 s` |
| Initial stuck cooldown | `0.4 s` |
| Later stuck cooldown | `0.15 s` |
| Strong rotation damping delay | `0.45 s` |
| Physics integration | three substeps per update |

The script clamps forward velocity to 4.2 and initial upward velocity to at least 11.7. Rotation is
kicked by subtracting the full 560-degree/s maximum. After the damping delay, rotation eases toward a
slower value while collision/stick logic determines the landing.

## Composition and level geometry

- Portrait, low three-quarter side view; knife and first target dominate the lower half.
- Tall, bright-white start block with a cool gray side face.
- Narrow gap that is visually real but mechanically forgiving.
- One long white runway with the first three targets ordered green, red, yellow.
- First target spacing is tuned against the motion model: one untouched jump lands before it; the
  next planted jump intersects it.
- The camera follows smoothly, keeps the next target and landing surface readable, and does not snap
  to a separate tutorial camera.

## Visual-feedback acceptance criteria

- The initial frame contains the planted knife, narrow gap, first green apple, and exact two-line
  world-space instruction at once.
- At 250–350 ms after the first release, the knife is visibly airborne and rotating with an arc.
- After the first jump, the blade is planted on the runway with the first apple still intact.
- The second jump produces two apple halves, a bright interior, cube debris, and `+1$` in one readable
  beat.
- No regular HUD, invented tutorial panel, hand icon, ring, ghost knife, or gate appears during these
  beats.

## Chopline mapping

Chopline keeps its deterministic Y–Z simulation and Three.js renderer. The reference vertical
velocity, gravity, rotation speed, and cooldown are copied directly. Forward velocity remains scaled
to Chopline's world units so the one-second travel distance and on-screen composition match. Tutorial
completion is bound to the first green apple's actual slice event, not to input count or elapsed time.
