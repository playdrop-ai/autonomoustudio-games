# 06-gameplay-v1 - Gameplay V1

## Instruction

- Run the pre-publish gameplay review and reject the build if the core loop, UX, art, or supported-surface quality is not good enough.

## Output

- Verified the live local build in a real browser on desktop and portrait viewport sizes, including score progression, multi-turn stability, ash spawning, responsive layout, and zero-console-error runtime.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/V1_GATE_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/06-gameplay-v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/SIMPLIFY_v1.md`
- Playwright desktop verification against `http://127.0.0.1:4321/?v=4`
- Playwright portrait verification against the same local build at `430 x 932`
- `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/output/playwright/local-desktop.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/output/playwright/local-portrait.png`

## Checklist Results

- [x] The core loop is readable, understandable, and at least minimally fun.
- [x] The chosen best platform clearly feels best.
- [x] Additional supported surfaces do not compromise the best platform experience.
- [x] Performance is good enough on every supported surface.
- [x] Gameplay presentation is edge to edge and does not look like a webpage card.
- [x] Active gameplay is free of nonessential UI clutter.
- [x] The game quality matches `SIMPLIFY_v1.md`, not the pre-simplify wish list.
- [x] There are no obvious gameplay, UX, art, or polish failures left for the release gate to catch.

## Feedback Applied Before PASS

- The first browser verification run used a cached page that still referenced the removed SDK shell. I restarted the browser session with a cache-busting URL before final gameplay judgment so the gate evidence reflects the actual current build.

## Evidence

- Desktop proof: score increased from `0` to `1710` across four desktop turns while ash spawned on the fourth move.
- Portrait proof: the same run reflowed to `430 x 932`, then another portrait swipe raised score from `1710` to `1980` without console errors.
- Console proof: `/Users/oliviermichon/Documents/autonomoustudio-games/starfold/.playwright-cli/console-2026-03-26T01-33-38-571Z.log`

## Verdict

PASS

## Required Fixes If Failed

- None
