# Chopline Rush – Rescue Plan

Internal working document. Delete (or add to `.playdropignore`) before publishing; it names the
reference materials, which must never ship or appear in the remixable source.

## Verdict: why the game feels broken

The underlying simulation was once verified to match the reference feel model. The two "rescue"
commits (947b7d0, 1d6ae58) replaced that model with invented constants and special cases while
keeping the proof tests green. The result is a knife that:

1. **Freezes mid-air at arbitrary orientations.** Rotation is a scripted `+270°` target per tap
   (`TAP_ROTATION_ANGLE = 1.5π`) with a hard stop (`angularVelocity = 0` on reach). The reference
   instead always eases to the next *canonical* angle (`n·2π + READY_ANGLE`, at least 180° ahead),
   so its knife always settles blade-down-forward, ready to land tip-first. Ours settles anywhere:
   first-flight is frozen upside down, drifting handle-first into the wall (verified live).
2. **Has mushy taps.** Airborne taps add `+4` capped at `10`. The reference *refreshes* velocity
   absolutely (`vy = 10`, `vz = 8`) on every accepted tap: that is the crisp "every tap is a full
   kick" feel. Cooldown was also changed from `0.4s` to `0.28s`.
3. **Cuts wrong.** Reference slice-lock: on entering a stack the knife's forward speed **locks to
   zero** (sibling below) and it carves *down* through the stack while rotation eases to canonical
   at 8 rad/s: the "chop". Ours forces forward speed to a *minimum* of `5.76` and plows
   horizontally, with a hardcoded `REFERENCE_WALL_CUT_COURSES = 7` cap, middle-brick selection, and
   per-substep damping hacks living inside the collision routine. Cut qualification lost its
   speed/orientation gates (any blade-OBB graze cuts); the reference gates slice-lock on the blade
   being within `[−130°, +45°]` of canonical, and forgives handle-first hits with a half-turn
   look-ahead (will the blade sweep the target soon? then cut, else bounce).
4. **Lands without truth.** `MIN_STICK_ALIGNMENT = 0.28` accepts near-flat contact as a "stick";
   the knife can rest on its handle end and count as planted. Ready pose (`readyAngle = 2π/3` on a
   broad dark cleaver) reads as "cleaver lying on the block", not a planted blade.
5. **Lives in two physics realities.** Knife: hand-rolled integrator, gravity −20. Fragments:
   Rapier rigidbodies, gravity −15, heavy damping: cut bricks scatter as whole-brick rubble that
   occludes the course, instead of the reference's readable two-halves slide → fall → settle.

None of this is fixable by more tuning-by-vibes. The fix is to restore the proven motion model as
a small, pure, testable module and delete the special cases.

## Ground-truth feel spec (from tmp/reference/astrocade-game-code.js: internal only)

Coordinate model: knife moves in the Y–Z plane, rotates about X. Pure 2D physics, 3D visuals.

| Constant | Value |
|---|---|
| Launch velocity (up / forward) | 10 / 8 |
| Gravity | −20 (knife), fragments −15 |
| Rotation speed | 7 rad/s (8 rad/s easing during slice-lock) |
| Tap cooldown | 0.4 s |
| Substep | 1/120 s, swept mid-sample OBB checks |
| Ready/canonical angle | 120° (`READY_ANGLE`); rotation targets are always `n·2π + READY_ANGLE` |
| Blade / handle reach | 1.69 / 0.78 (pivot at hilt), half-widths 0.25 / 0.12 |
| Embed depth top / side | 0.15 / 0.4 |
| Stick alignment | reject if `cos·dir > 0.3` (top/bottom) or `sin·dir > 0.3`; side needs `|sin| ≥ 0.5` |
| Ceiling / ground | y ≤ 30, y < 0 = fail |
| Endless no-score timeout | 10 s |

Rules:
- **Tap (any state, cooldown-gated):** set `vy = 10`, `vz = 8` absolutely (face-dependent when
  launching from bottom/side sticks: bottom `vy = −10·(0.25 roof / 0.1 else)`, side scales `vz`).
  Advance rotation target to the next canonical angle ≥ 180° ahead; `ω = 7` until target, then 0
  (knife is then already in the tip-first pose: the freeze is invisible by design).
- **Slice:** blade OBB contact on a sliceable always cuts that object. Slice-lock (drive through a
  stack: widen siblings' halfZ +0.3, `vz = 0` if sibling below else `vz·0.3`, ease rotation to
  canonical at 8 rad/s, batch-cut per substep with `vy·0.85`) only when blade angle is within
  `[−130°, +45°]` of canonical. Handle-first on a sliceable: look ahead `+45°…+180°`; if the blade
  will sweep it, cut anyway (`vy·0.85`), else bounce (`vz = −vz·0.5`, vy preserved, spin on).
- **Land:** blade contact on a platform face → stick if aligned (see table), else rotate-to-stick
  recovery (spin in place at 7 rad/s, re-pin lowest point to surface, stick the moment the blade
  qualifies, give up after 4π). Handle contact: underside knock-down (`vy = −vy·0.3`) or
  rotate-to-stick. Flip-source platform guarded until geometrically clear.
- **Fragments:** two halves per cut, scripted 3 phases: slide apart on X with friction, fall at
  −15 with tumble past the platform edge, ground settle with spring-damper topple. Deterministic,
  cheap, readable. No rigidbody engine.

Product deltas we keep (ours, not the reference's): +1 score and +1 coin per cut, ad-free retry,
PlayDrop leaderboard `endless_score`, knife/theme shop.

## Phase 1: Restore the motion model (core rescue)

- New `src/game/knifePhysics.ts`: pure module (state in, state out, zero DOM/THREE deps) that
  implements the spec table above. All tuning constants in one exported `TUNING` table.
- Delete from `main.ts`: `TAP_ROTATION_ANGLE`, `AIR_TAP_LIFT`, `CUT_CONTACT_TIME_EPSILON`
  contact-order system, `REFERENCE_WALL_CUT_COURSES` + middle-brick + book-dedup special cases,
  per-substep damping in `handleSliceableCollisions`, `SLICE_FORWARD_SPEED_MIN`.
- The 13-course wall becomes plain content: every course is a normal sliceable worth +1. What the
  blade sweeps, it cuts. No authored-beat constants inside collision code.
- Keep: OBB collision core, face detection, rotate-to-stick, flip-source guard, substepping (all
  match the reference already).
- Cooldown back to 0.4 s; taps refresh velocity; rotation targets canonical.

## Phase 2: Make the knife truthful

- Keep the semantic-anchor GLB pipeline (`knifeModel.ts` is good). Starter must be a narrow,
  bright, high-contrast knife whose silhouette matches the blade/handle OBBs; the broad dark
  cleaver cannot be the starter.
- Restore metallic blade material (kill the roughness ≥ 0.72 / metalness ≤ 0.05 clamps).
- Ready pose: blade embedded near-vertical (readyAngle ≈ 110–120° with a *narrow* blade and full
  embed depth reads planted; validate visually per knife via `readyAngle` in its definition).
- Debug overlay (dev-only flag) that draws the blade/handle OBBs so visual-vs-collision drift is
  caught by eye and by the tip/handle-error assertion already in `knifeGeometryProof`.

## Phase 3: Contact payoff

- Cut contact: 40–70 ms hit-stop (exists, keep), camera impulse, flash, haptic pulse, per-material
  sound, `+1` popup. Same event chain for every cut, not just the wall.
- Landing: keep landing-punch squash, add small camera dip; distinct blade-stick vs handle-bounce
  sound/haptic (exists, verify).
- Fragments: replace Rapier with the scripted 3-phase fragment module (`fragmentPhysics.ts`
  becomes ~120 lines of plain math). Removes the second physics world, the dual gravity, the
  rubble-occlusion problem, and megabytes of wasm from the 4 MB bundle.

## Phase 4: Clean, simple, remixable codebase

Delete (repo):
- `src/referenceLevels.ts` (verbatim reference level config: ships in the bundle today; illegal
  to keep in a remixable source drop), and Level mode entirely (SPECS: one endless mode only).
  Endless already uses the 10 self-authored chunks in `buildEndlessCourseTemplates`.
- Dead reference-RNG cluster in `main.ts` (`ENDLESS_REFERENCE_*`, `buildEndlessTemplatePool`,
  `copyEndlessThing`, `estimateReferenceExtraRandomBudget`, `consumeEndlessReferenceRandomDraws`).
- `tmp/` (including `tmp/reference/`: move outside the repo if the ground truth must be kept),
  `evidence/`, `output/`, `COMPARATIVE_STUDY.md`, `RELEASE_AUDIT.md`, `playtest-evidence.json`,
  `tmp-utensil-detail.json`, `scripts/compare-reference-endless.mjs`, this file.
- The `"Slice Rush"` title string at `main.ts:1473` → the game's own name. Rename
  `referenceFilteredSliceHits`, `REFERENCE_PORTRAIT_ASPECT`, `reference-mechanics-proof.mjs`, and
  every `reference*` identifier. `rg -i 'astrocade|slice rush|voodoo|slice it all|reference'`
  must return zero hits in shipped/published files when done.
- Ad/interstitial/revive/IAP code paths that SPECS excludes from the player flow.

Restructure `src/` (target ≈ 8 focused modules, main.ts < 500 lines):
`config.ts` (one tuning table) · `knifePhysics.ts` · `collision.ts` · `world.ts` (entities +
endless generator) · `fragments.ts` · `effects.ts` (audio/haptics/particles/camera) · `ui.ts`
(HUD/screens/shop) · `platform.ts` (PlayDrop SDK) · `main.ts` (loop + wiring). Move the CSS/HTML
blobs into `template.html`. Test hooks shrink to a thin `debug.ts` installed only under
`?chopline_test`, reading state through one narrow interface instead of reaching into every
subsystem.

Rewrite `SPECS.md` so the feel spec above (without reference attribution) IS the product spec ,
remixers get a self-contained description of how the knife is supposed to move.

## Phase 5: Validation and release bar

- `tests/mechanics-proof` asserts the spec, not reference parity: tap refresh values, canonical
  rotation targets, slice-lock vz=0, angle gate, handle look-ahead, stick alignment rejection,
  fragment phase sequence. Deterministic, headless.
- Runtime smoke: boot → tap → cut → stick → fail → restart → shop → leaderboard submit.
- Portrait playthrough evidence per the existing release bar, captured fresh.
- `npm run validate:local` green, `playdrop project check .` green, bundle size reported (expect
  ≈ 4 MB → well under 2 MB after Rapier + reference config removal).
