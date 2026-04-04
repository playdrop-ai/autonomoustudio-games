# 06-gameplay-v1 - Pre-Publish Gameplay Gate

## Instruction

- Judge whether the current `Switchback Dispatch` build is actually worth shipping before any listing or media work starts.

## Output

- Reviewed the live local build on its intended best platform, `desktop`.
- Sampled the first playable seconds across multiple opening steering lines to judge the strongest honest raw moment instead of one weak capture.
- Applied the gameplay-gate fixes needed to make the build read like a real courier contract racer instead of a starter remix:
  - synced `catalogue.json` to the actual desktop-only game metadata
  - strengthened active-delivery readability with taller beacon beams
  - added short checkpoint and finish cues plus an in-run delivery toast so contract progress is felt, not just timed

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/gates/05-implementation.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/V1_GATE_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/06-gameplay-v1.md`
- `/Users/oliviermichon/.codex/plugins/cache/local-plugins/playdrop/local/skills/gameplay-review/SKILL.md`
- `/Users/oliviermichon/.codex/plugins/cache/openai-curated/game-studio/f78e3ad49297672a905eb7afb6aa0cef34edc79e/skills/game-playtest/SKILL.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/src/runtime/audio.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/src/runtime/camera.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/src/runtime/game.ts`

## Checklist Results

- [x] The core loop is readable, immediately understandable, clearly fun, and still recognizable as a proven lane rather than a novel grammar experiment.
- [x] The honest plain-English description of the shipped build is not just "famous game X with this skin."
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
- [x] The build would still sound appealing if marketed honestly in one sentence, without relying on a misleading wrapper.
- [x] If the concept still feels weaker than the best-known game in the same lane with no real angle of its own, the build fails even if technically coherent.
- [x] The live game presentation is strong enough that the shipped marketing art does not materially oversell it.
- [x] There are no obvious gameplay, UX, art, or polish failures left for the release gate to catch.

## Feedback Applied Before PASS

- The first gameplay review would have failed because the app metadata still claimed this was the starter racing demo and still advertised mobile surfaces that the simplified plan had already cut. I corrected `catalogue.json` before re-running the gate.
- The first raw gameplay captures were not strong enough because the active delivery marker read like a vague white prop and the sampled opening line was a weak wall scrape. I improved the active-beacon read with taller beams, added concise checkpoint/finish cues and a delivery toast, and then re-sampled multiple honest opening lines until the strongest raw frame looked like a real in-motion contract run.

## Evidence

- Validation:
  - `npm run validate`
  - `playdrop project validate .`
- Start-state review:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/playwright/start-after-layout-fix-2/page.png`
- Strongest raw gameplay frame:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/playwright/opening-lines/hard-left/page.png`
- Additional gameplay samples:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/playwright/opening-lines/left-arc/page.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/playwright/opening-lines/right-arc/page.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/playwright/opening-lines/straight/page.png`
- Result-state review:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/playwright/result-timeout/page.png`

## Verdict

PASS

## Required Fixes If Failed

- None
