# 06-gameplay-v1 - Gameplay V1

## Instruction

- Run the pre-publish gameplay gate on the actual build, confirm the simplified loop is readable and worth replaying, and verify that the chosen best platform remains strongest without the secondary surface compromising it.

## Output

- Verified `Drifthook` as a portrait-first release with desktop support using current real-build screenshots, a real gameplay video, a balance sweep, and live local browser review of start, play, and game-over states.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/V1_GATE_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/06-gameplay-v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/screenshots/portrait-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/screenshots/portrait-gameover.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/screenshots/landscape-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/screenshots/landscape-gameover.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/drifthook-gameplay.mp4`

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
- [x] If this is an endless score game, the balance has been swept with idle/casual/expert policies and the target medians hold: casual 60-120s, expert 300s+, and expert p25 240s+.
- [x] If this is not an endless score game, the build has enough session depth or replayability to feel like a real game rather than a sub-minute demo.
- [x] A competent player cannot fully exhaust the shipped build in under 90 seconds unless the replay loop is already clearly strong and explicitly justified by the concept.
- [x] The live game presentation is strong enough that the shipped marketing art does not materially oversell it.
- [x] There are no obvious gameplay, UX, art, or polish failures left for the release gate to catch.

## Feedback Applied Before PASS

- The earliest gameplay review still felt too sparse between catches, so I treated ambient fish motion as a required polish fix rather than optional dressing.
- Portrait HUD spacing needed a rerun after first runtime captures; the order strip now stays clear of the score chip and knot display on narrow screens.
- I rechecked balance after the logic tuning pass and kept the gate closed until the scripted medians landed in the required idle, casual, and expert bands.

## Evidence

- Balance sweep:
  - `npm run balance`
  - idle `median=28.1s`, `p25=23.3s`, `p75=33.7s`
  - casual `median=91.7s`, `p25=78.3s`, `p75=104.5s`
  - expert `median=303.3s`, `p25=276.4s`, `p75=329.1s`
- Verification commands:
  - `npm run validate`
  - `playdrop project validate .`
  - `npm run capture:media`
- Real-build screenshots:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/screenshots/portrait-gameplay.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/screenshots/portrait-gameover.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/screenshots/landscape-gameplay.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/screenshots/landscape-gameover.png`
- Real gameplay video:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/listing/drifthook-gameplay.mp4`

## Verdict

PASS

## Required Fixes If Failed

- None
