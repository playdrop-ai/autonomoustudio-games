# 06-gameplay-v1 - Gameplay V1

## Instruction

- Run the pre-publish gameplay gate on the real Wickstreet build and confirm the score-chase loop, supported surfaces, HUD safety, and endless-run balance are strong enough to publish.

## Output

- A tuned endless courier run with passing seeded balance sweeps, verified desktop/mobile-landscape browser captures, and no remaining obvious gameplay or presentation blockers.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/V1_GATE_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/06-gameplay-v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/scripts/simulate-balance.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/scripts/verify-gameplay.mjs`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-local/desktop-playing.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-local/desktop-gameover.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-local/mobile-playing.png`

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

- The first gameplay sweep failed because the storm curve was too soft and near-perfect bots could coast indefinitely. I increased late-run closure density, tightened the live timer ramp, and reran the seeded sweep until the run bands held.
- The first post-implementation UI review still showed gameplay HUD under the start and game-over overlays. I hid the active-play HUD outside `playing` so the non-playing states read as deliberate screens rather than stacked layers.
- I replaced the brittle manual proof path with a reusable browser verifier that starts the real build, proves desktop keyboard response, completes deliveries with live pointer steering, waits into game-over, and verifies retry/persistence behavior from the same runtime.

## Evidence

- Seeded balance sweep after tuning:
  - `IDLE median 30.1s`
  - `CASUAL median 111.9s`
  - `CASUAL p25 92.9s`
  - `EXPERT median 335.2s`
  - `EXPERT p25 274.2s`
- Balance command: `npm run balance:report`
- Browser verification command: `node scripts/verify-gameplay.mjs tmp/verification-local local`
- Verified captures:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-local/desktop-playing.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-local/desktop-gameover.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-local/mobile-playing.png`

## Verdict

PASS

## Required Fixes If Failed

- None
