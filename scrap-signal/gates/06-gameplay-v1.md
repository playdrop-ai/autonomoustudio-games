# 06-gameplay-v1 - Gameplay v1

## Instruction

- Judge whether the current `Scrap Signal` build is genuinely worth shipping before any listing or release work starts.

## Output

- Confirmed that the shipped desktop build reads as a beacon-defense arena shooter with an immediately legible battery-bank angle instead of a generic kill-only horde skin.
- Completed a browser-based gameplay review using refreshed runtime captures and a reviewed landscape gameplay MP4 from the current build.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/06-gameplay-v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/V1_GATE_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/SIMPLIFY_v1.md`
- `npm run validate`
- `playdrop project validate .`
- `npm run capture:media`
- Desktop runtime evidence:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/runtime-review/desktop-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/runtime-review/desktop-play.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/runtime-review/desktop-gameover.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/video-frames-check/frame-01.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/video-frames-check/frame-02.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/video-frames-check/frame-03.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/scrap-signal_1280x720-recording.mp4`

## Checklist Results

- [x] The core loop is readable, immediately understandable, clearly fun, and still recognizable as a proven lane rather than a novel grammar experiment.
- [x] The honest plain-English description of the shipped build is not just "famous game X with this skin."
- [x] A player familiar with any starter, demo, template, or remix source would not honestly call the shipped build "that source plus a wrapper."
- [x] The first 15 seconds create desire, not just understanding.
- [x] The first 15 seconds, title, and wrapper all point at the same audience that actually enjoys the underlying loop.
- [x] The build does not rely on teaching a new core interaction language before the player can feel the hook.
- [x] The chosen best platform clearly feels best.
- [x] Additional supported surfaces do not compromise the best platform experience.
- [x] Performance is good enough on every supported surface.
- [x] Gameplay presentation is edge to edge and does not look like a webpage card.
- [x] Active gameplay is free of nonessential UI clutter.
- [x] HUD elements stay in safe, intentional positions on every supported surface and do not overlap the frame or active gameplay.
- [x] Covered, revealed, flagged, hazardous, and rewarding states are immediately distinguishable on the smallest supported surface.
- [x] Start and game-over screens do not occlude critical playfield.
- [x] Start and game-over layouts keep stats, supporting copy, and CTA separated without overlap.
- [x] Hazard, reward, and fail-state signifiers are intuitive; the thing that kills the run does not read like the thing the player wants.
- [x] The player's lived fantasy and main verb feel desirable in motion, not perverse, joyless, or contrary to the promise that got the click.
- [x] On touch surfaces, frequent secondary actions have explicit affordances and high-stakes actions are not hidden behind ambiguous long-press or accidental taps.
- [x] Loss proximity is glanceable and next-preview clearly communicates what, where, and when.
- [x] The game quality matches `SIMPLIFY_v1.md`, not the pre-simplify wish list.
- [x] If this is not an endless score game, the build has enough session depth or replayability to feel like a real game rather than a sub-minute demo.
- [x] A competent player cannot fully exhaust the shipped build in under 90 seconds unless the replay loop is already clearly strong and explicitly justified by the concept.
- [x] The strongest plain-build screenshot or raw gameplay clip already looks worth clicking before bespoke listing art.
- [x] The strongest screenshot or opening clip stays distinct even without relying on title text, menu copy, or listing art to explain why it is not the source template/demo.
- [x] The build would still sound appealing if marketed honestly in one sentence, without relying on a misleading wrapper.
- [x] If the concept still feels weaker than the best-known game in the same lane with no real angle of its own, the build fails even if technically coherent.
- [x] The live game presentation is strong enough that the shipped marketing art does not materially oversell it.
- [x] There are no obvious gameplay, UX, art, or polish failures left for the release gate to catch.

## Feedback Applied Before PASS

- The first gameplay review found one blocker: the build showed beacon-loss pressure through the HUD, but enemy arrivals still lacked a readable next-threat preview.
- I added spawn telegraphs that show the incoming threat family, the entry point, and the arrival timing, then reran the browser capture flow so the review is based on the corrected live build rather than the earlier weaker pass.
- The first reviewed gameplay MP4 also carried a late lull after the strongest opening beat, so I trimmed the gameplay video to a tighter `9s` cut that keeps the player-facing hook and battery loop visible throughout the whole clip.

## Evidence

- Current runtime:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/src/main.ts`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/src/game/constants.ts`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/src/game/sim.ts`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/src/game/render.ts`
- Gameplay proof:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/runtime-review/desktop-play.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/scrap-signal_1280x720-screenshot-1.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/scrap-signal_1280x720-screenshot-2.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/scrap-signal_1280x720-recording.mp4`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/video-frames-check/frame-01.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/video-frames-check/frame-02.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/video-frames-check/frame-03.png`

## Verdict

PASS

## Required Fixes If Failed

- None
