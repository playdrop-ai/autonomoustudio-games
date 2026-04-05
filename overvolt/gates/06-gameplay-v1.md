# 06-gameplay-v1 - Gameplay v1

## Instruction

- Judge the built game as a real pre-publish candidate, using the gameplay gate to reject weak raw motion, weak desirability, weak balance, or a wrapper that is stronger than the underlying play.

## Output

- Reviewed the current `Overvolt` build as an endless score game and confirmed that the raw build, not just the wrapper, is strong enough to move into listing/media work.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/06-gameplay-v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/V1_GATE_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/balance-sweep.txt`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/desktop-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/desktop-play.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/desktop-play-early.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/mobile-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/mobile-play.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/video/desktop-raw-15s.webm`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/video/contact.png`

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
- [x] If this is an endless score game, the balance has been swept with idle/casual/expert policies and the target medians hold: casual 60-120s, expert 300s+, and expert p25 240s+.
- [x] If this is not an endless score game, the build has enough session depth or replayability to feel like a real game rather than a sub-minute demo.
- [x] A competent player cannot fully exhaust the shipped build in under 90 seconds unless the replay loop is already clearly strong and explicitly justified by the concept.
- [x] The strongest plain-build screenshot or raw gameplay clip already looks worth clicking before bespoke listing art.
- [x] The strongest screenshot or opening clip stays distinct even without relying on title text, menu copy, or listing art to explain why it is not the source template/demo.
- [x] The build would still sound appealing if marketed honestly in one sentence, without relying on a misleading wrapper.
- [x] If the concept still feels weaker than the best-known game in the same lane with no real angle of its own, the build fails even if technically coherent.
- [x] The live game presentation is strong enough that the shipped marketing art does not materially oversell it.
- [x] There are no obvious gameplay, UX, art, or polish failures left for the release gate to catch.

## Feedback Applied Before PASS

- The first gameplay review pass still read slightly too zoomed out in the raw desktop frame, which made the tabletop feel cleaner than it felt exciting. I tightened the camera and enlarged the readable car and pickup silhouettes before recapturing the gameplay evidence.
- The first mobile QA pass still surfaced touch controls on non-gameplay screens. That fix was applied during the implementation gate, then this gameplay gate was rerun against the corrected shell so the touch-first experience matched the simplify doc and approved mockups.
- PlayDrop’s current `project dev` / `project capture` host path is still broken for this new app, so gameplay review used the validated build through the QA-only local preview wrapper rather than through the broken host shell. Release verification will still require a real hosted pass after publish.

## Evidence

- Balance sweep:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/balance-sweep.txt`
- Desktop QA:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/desktop-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/desktop-play.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/desktop-play-early.png`
- Mobile QA:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/mobile-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/mobile-play.png`
- Raw gameplay clip package:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/video/desktop-raw-15s.webm`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/video/contact.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/video/frame-5s.png`
- QA wrapper used only because the current PlayDrop dev host shell is broken:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/tmp/qa/local-preview.html`

## Verdict

PASS

## Required Fixes If Failed

- None
