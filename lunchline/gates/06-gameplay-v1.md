# 06-gameplay-v1 - Gameplay Review

## Instruction

- Run the pre-publish gameplay review and fail the build if the shipped game no longer feels desirable, legible, distinct, or strong enough in raw motion before listing work.

## Output

- Reviewed the live local build on the best platform first (`mobile portrait`), then checked the supported desktop presentation.
- Confirmed the endless-run balance targets with the scripted idle/casual/expert sweep.
- Captured raw runtime screenshots from the PlayDrop local dev route and used them as the plain-build desirability check.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/CONCEPT_KILL_CRITERIA.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/V1_GATE_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/06-gameplay-v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/SIMPLIFY_v1.md`
- `/Users/oliviermichon/.codex/plugins/cache/local-plugins/playdrop/local/skills/gameplay-review/SKILL.md`
- `/Users/oliviermichon/.codex/plugins/cache/openai-curated/game-studio/f78e3ad49297672a905eb7afb6aa0cef34edc79e/skills/game-playtest/SKILL.md`

## Review Verdict

- `PASS`: `Lunchline` reads as a real lunch-rush cluster puzzle, not as a thin SameGame wrapper. The active order card changes what the player wants from the first move, the touch-first portrait surface is clearly the best fit, and the plain gameplay frame now looks polished enough to support listing work without overselling the build.

## Blocking Issues

- None

## Polish Issues

- None that need to block listing or release work. Any further change at this point would be marketing/media polish rather than gameplay rescue.

## Next Step Recommendation

- Proceed to `07-listing-media` and use the strongest raw mobile gameplay frame as the reference input for the primary hero exploration.

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
- [x] If this is not an endless score game, the build has enough session depth or replayability to feel like a real game rather than a sub-minute demo. Not applicable because `Lunchline` is an endless score game with a replay loop already proven by the balance sweep.
- [x] A competent player cannot fully exhaust the shipped build in under 90 seconds unless the replay loop is already clearly strong and explicitly justified by the concept.
- [x] The strongest plain-build screenshot or raw gameplay clip already looks worth clicking before bespoke listing art.
- [x] The strongest screenshot or opening clip stays distinct even without relying on title text, menu copy, or listing art to explain why it is not the source template/demo.
- [x] The build would still sound appealing if marketed honestly in one sentence, without relying on a misleading wrapper.
- [x] If the concept still feels weaker than the best-known game in the same lane with no real angle of its own, the build fails even if technically coherent.
- [x] The live game presentation is strong enough that the shipped marketing art does not materially oversell it.
- [x] There are no obvious gameplay, UX, art, or polish failures left for the release gate to catch.

## Feedback Applied Before PASS

- The first browser review failed the spirit of this gate because the runtime did not boot cleanly and the live order header clipped on small screens. Those issues were fixed in `05-implementation` before rerunning the gameplay review.

## Evidence

- Strongest raw gameplay screenshot candidate:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/runtime-review/mobile-portrait-play.png`
- Supporting runtime review captures:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/runtime-review/mobile-portrait-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/runtime-review/mobile-portrait-gameover.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/runtime-review/desktop-play.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/runtime-review/desktop-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/runtime-review/desktop-gameover.png`
- Balance evidence:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/validation/balance-report.json`
  - `casual` median `66.5s`
  - `expert` median `900s`
  - `expert` p25 `900s`
- Structured browser QA evidence:
  - real mobile tap on the canvas increased score from `0` to `264`
  - start -> play -> game-over -> restart flow completed with no browser exceptions or console errors

## Verdict

PASS

## Required Fixes If Failed

- None
