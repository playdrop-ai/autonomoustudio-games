# 06-gameplay-v1 - Gameplay v1

## Instruction

- Run the pre-publish gameplay gate on the implemented build and only pass if the live desktop play experience is strong enough to support listing and release work.

## Output

- Reviewed the live local desktop build for frame composition, HUD safety, onboarding clarity, relay-state readability, timeout presentation, and desktop-only support posture.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/V1_GATE_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/06-gameplay-v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/output/shardspan-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/output/shardspan-smoke.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/output/shardspan-timeout.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/output/shardspan-relay-topdown.png`
- `playdrop project validate .`

## Checklist Results

- [x] The core loop is readable, understandable, and at least minimally fun.
- [x] The chosen best platform clearly feels best.
- [x] Additional supported surfaces do not compromise the best platform experience.
- [x] Performance is good enough on every supported surface.
- [x] Gameplay presentation is edge to edge and does not look like a webpage card.
- [x] Active gameplay is free of nonessential UI clutter.
- [x] HUD elements stay in safe, intentional positions on every supported surface and do not overlap the frame or active gameplay.
- [x] Start and game-over screens do not occlude critical playfield.
- [x] Start and game-over layouts keep stats, supporting copy, and CTA separated without overlap.
- [x] Loss proximity is glanceable and next-preview clearly communicates what, where, and when.
- [x] The game quality matches `SIMPLIFY_v1.md`, not the pre-simplify wish list.
- [x] Not applicable. `Shardspan` is a fixed-course relay, not an endless score game.
- [x] The live game presentation is strong enough that the shipped marketing art does not materially oversell it.
- [x] There are no obvious gameplay, UX, art, or polish failures left for the release gate to catch.

## Feedback Applied Before PASS

- The first gameplay sweep failed the onboarding read: Relay I sat under the HUD, the opening camera yaw made the first move non-obvious, and the initial span punished the player before the phase mechanic had paid off. I moved the HUD off the route, widened the first amber bridge chain, and reoriented the default camera until the first relay clear and cobalt flip were visible and the timeout overlay still held its layout cleanly.

## Evidence

- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/output/shardspan-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/output/shardspan-smoke.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/output/shardspan-timeout.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/output/shardspan-relay-topdown.png`
- `playdrop project validate .`

## Verdict

PASS

## Required Fixes If Failed

- None
