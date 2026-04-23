# 06-gameplay-v1 - Gameplay v1

## Instruction

- Judge the implemented build as a real pre-publish game, not just a coherent prototype, and fail it unless the loop, surfaces, and first-minute feel already deserve listing work.

## Output

- Reviewed the live local build on mobile portrait and desktop, verified a deterministic seeded victory path, and recorded a balance sweep plus surface captures showing the current build clears the gameplay bar for v1.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/06-gameplay-v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/V1_GATE_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/tmp/gameplay-qa.md`
- `/Users/oliviermichon/.codex/plugins/cache/local-plugins/playdrop/local/skills/gameplay-review/SKILL.md`
- `/Users/oliviermichon/.codex/plugins/cache/openai-curated/game-studio/f78e3ad49297672a905eb7afb6aa0cef34edc79e/skills/game-playtest/SKILL.md`
- `/Users/oliviermichon/.codex/skills/playwright/SKILL.md`

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
- [x] This is not an endless score game, but the shipped run structure was still balance-swept so the spread progression does not collapse into a toy session.
- [x] If this is not an endless score game, the build has enough session depth or replayability to feel like a real game rather than a sub-minute demo.
- [x] A competent player cannot fully exhaust the shipped build in under 90 seconds unless the replay loop is already clearly strong and explicitly justified by the concept.
- [x] The strongest plain-build screenshot or raw gameplay clip already looks worth clicking before bespoke listing art.
- [x] The build would still sound appealing if marketed honestly in one sentence, without relying on a misleading wrapper.
- [x] If the concept still feels weaker than the best-known game in the same lane with no real angle of its own, the build fails even if technically coherent.
- [x] The live game presentation is strong enough that the shipped marketing art does not materially oversell it.
- [x] There are no obvious gameplay, UX, art, or polish failures left for the release gate to catch.

## Feedback Applied Before PASS

- The first implementation review failed the gameplay bar because the stock was hidden and the first spread balance was too punishing for the hook. I exposed the next draw, raised the stock to `14`, and reran local QA plus the balance sweep before accepting the build.
- The first mobile pass also had a clumsy empty-reserve placeholder that made the secondary action feel more like a note than an affordance. I shortened the reserve socket, rechecked portrait screenshots, and only then accepted the gameplay presentation.

## Evidence

- Gameplay QA summary and sweep numbers: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/tmp/gameplay-qa.md`
- Mobile gameplay proof: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/tmp/qa-mobile-playing-v2.png`
- Desktop gameplay proof: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/tmp/qa-desktop-playing.png`
- Mobile victory overlay proof: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/tmp/qa-mobile-gameover.png`

## Verdict

PASS

## Required Fixes If Failed

- None
