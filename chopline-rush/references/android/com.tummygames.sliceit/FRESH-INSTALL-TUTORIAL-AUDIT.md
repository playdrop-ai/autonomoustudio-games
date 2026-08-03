# Slice It All! — fresh-install Level 1 tutorial audit

Date: August 3, 2026
Package: `com.tummygames.sliceit`
Runtime: Android `2141.0.4` (`versionCode 21375`)
Primary environment: wiped dedicated Android 15 AVD, 1080 × 2400 portrait

## Correction

The previous Chopline Rush tutorial implementation was based on the wrong interpretation of valid
gameplay evidence. It used a successful Level 1 recording and a preserved returning-player profile
to conclude that the reference tutorial ended after one tap. Those captures showed the correct game
and level, but did not isolate the clean first-time input sequence.

The clean-install result is different and decisive:

- `TAP TO FLIP` is the only written instruction.
- The first tap launches the knife and dismisses the instruction.
- One tap with no airborne follow-up is not sufficient. The knife follows a low arc toward the
  opening wall, loses support, and reaches `REVIVE` in about 1.5–2 seconds.
- The player must tap again while airborne to renew lift and rotation.
- Timing changes the lesson's outcome: an early cadence can fly over the wall, a rhythmic lower arc
  cuts it, and a missing or late follow-up fails.

The tutorial is therefore integrated into the 3D level design, but it spans a sequence of inputs. The
prompt names the verb; the opening wall, flight path, contact result, and fast retry teach repetition
and cadence without another text card.

## Package and build identity

| Evidence | Package | Version |
|---|---|---|
| Inspected local split APK | `com.tummygames.sliceit` | `2141.0.4` / `21375` |
| Fresh emulator installation | `com.tummygames.sliceit` | `2141.0.4` / `21375` |
| Existing connected Pixel 8 installation | `com.tummygames.sliceit` | `2141.0.4` / `21375` |

The Pixel install was inspected read-only and its player data was not cleared. The emulator was the
only environment wiped for the onboarding replay.

## Clean Level 1 evidence

Raw artifacts are in
`output/android/com.tummygames.sliceit/fresh-install-audit/`.

| State | Artifact | What it proves |
|---|---|---|
| Level 1 ready | `04-after-branded-close.png` | Knife planted left, opening slab wall right, and one `TAP TO FLIP` prompt. |
| First tap, about 0.65 s | `14-first-real-tap-0.65s.png` | Knife is airborne on a low trajectory toward an intact wall; the first input has not solved the obstacle. |
| No follow-up, about 1.45 s | `15-first-real-tap-1.45s.png` | The game has already entered `REVIVE`; one launch tap is a losing input sequence. |
| Failure exposed | `17-revive-uncovered.png` | The knife remains failed at the opening structure and `TAP TO RESTART` appears. |
| Continuous capture | `fresh-install-tutorial-failed-run.mp4` | Preserves the clean launch, first-level interaction, failure, and intercepted ad/modal surfaces in sequence. |

A branded `SLICE IT ALL!` close overlay appeared during first launch. It is recorded as a first-launch
interruption, not classified as part of the core tutorial. Unity exposes the game as one canvas node,
so coordinate input was used only after full-resolution screenshot inspection.

## Timing envelope

This fresh failure replay must be read together with the already reproduced cadence tests:

| Input | Observed Level 1 behavior | Tutorial meaning |
|---|---|---|
| Launch once; no follow-up | Fails at the opening in about 1.5–2 s | A launch is not enough. |
| Re-tap around 0.55 s | Preserves high altitude and can skip the wall/rewards | Tapping too early trades destruction for safety. |
| Re-tap around 0.8–0.9 s | Produces lower arcs that bite through the wall and continue | Rhythmic timing creates the intended cut path. |

These are behavioral calibration points, not recovered physics constants.

## Chopline Rush parity finding and correction

The rejected Chopline Rush build copied the initial composition but not the tutorial behavior. Its
first tap destroys all thirteen slabs and returns the knife to a safe landing. That teaches the player
that a single tap solves the opening and removes the reference's essential air-tap and cadence lesson.

The corrected acceptance contract is:

1. The ready frame contains only the planted knife, visible wall, negative space, and `TAP TO FLIP`.
2. The first tap launches and dismisses the prompt but cannot automatically destroy the full wall or
   settle into safety.
3. No follow-up tap must visibly fail at the opening within roughly two seconds.
4. A correctly timed airborne follow-up must rotate the blade into a readable wall cut and continue.
5. An early follow-up may clear or skim the wall with fewer cuts, preserving the reference's
   risk/reward spectrum.
6. No ring, ghost knife, forced landing marker, checklist, or second text instruction is added.

The corrected build now reproduces the three required outcomes with no additional tutorial UI:

- ready state: planted knife, visible thirteen-slab wall, and one `TAP TO FLIP` prompt;
- one tap/no follow-up: zero cuts and a physical failure at the intact opening;
- timed airborne follow-up: the lesson completes, the wall cuts, and play continues.

Deterministic runtime evidence is captured in
[tutorial-parity-correction.png](tutorial-parity-correction.png). This corrects the FTUE parity
failure; it is not by itself a claim that the entire game is production-ready.
