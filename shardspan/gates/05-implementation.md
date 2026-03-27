# 05-implementation - Implementation

## Instruction

- Implement the simplified desktop-first `Shardspan` build and iterate until the shipped loop, HUD, overlays, and route are solid enough for gameplay gating.

## Output

- Replaced the starter collectible demo with a bespoke `Shardspan` relay course, ordered beacons, amber/cobalt bridge-state switching, checkpoint respawns with time penalties, a countdown HUD, and timeout/retry overlays.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/05-implementation.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/mockups/desktop-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/mockups/desktop-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/mockups/desktop-gameover.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/src/main.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/src/shardspan-course.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/template.html`
- local browser captures from the built `dist/test-host.html`

## Checklist Results

- [x] Core layout is aligned correctly with no obvious board, tile, or HUD misalignment.
- [x] Core interaction motion is good enough, including movement, merge, spawn, and state-change feedback.
- [x] The implementation matches the locked simplify doc and approved mockups.
- [x] The best-platform input feels crisp and obvious without relying on explanation text.
- [x] Visual polish is intentional enough that the game does not read as placeholder or hacked together.
- [x] End states, restart flow, and persistence behavior are solid enough for repeat play.
- [x] The current build is capture-ready for screenshots and video.
- [x] There are no obvious quality bugs that would embarrass the release.

## Feedback Applied Before PASS

- The first implementation pass still read like a starter-kit port: the follow camera framed the route diagonally, the HUD blocked the first relay, and the opening path made the onboarding relay too fussy. I widened the initial amber span, aligned the default camera so `W` drives into Relay I, moved the HUD cluster to a safe corner, and reran browser captures until the relay flip, active HUD, and timeout overlay all read cleanly.

## Evidence

- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/output/shardspan-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/output/shardspan-smoke.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/output/shardspan-relay-topdown.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/output/shardspan-timeout.png`
- `playdrop project validate .`

## Verdict

PASS

## Required Fixes If Failed

- None
