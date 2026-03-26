# 06-gameplay-v1 - Gameplay v1

## Instruction

- Run the pre-publish gameplay review and reject the build if the core loop, UX, art, or supported-surface quality is not good enough.

## Output

- Re-ran the gameplay gate on the `1.0.3` corrective build with browser-rendered portrait and desktop proof, explicit marketing-parity review against the fresh AI-generated hero family, and the existing idle/casual/expert balance sweep.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/V1_GATE_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/06-gameplay-v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/portrait-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/portrait-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/portrait-gameover.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/desktop-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/desktop-gameover.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/balance/balance-report.md`

## Checklist Results

- [x] The core loop is readable, understandable, and at least minimally fun.
- [x] The chosen best platform clearly feels best.
- [x] Additional supported surfaces do not compromise the best platform experience.
- [x] Performance is good enough on every supported surface.
- [x] Gameplay presentation is edge to edge and does not look like a webpage card.
- [x] Active gameplay is free of nonessential UI clutter.
- [x] Start and game-over screens do not occlude critical playfield.
- [x] Loss proximity is glanceable and next-preview clearly communicates both what and where.
- [x] The game quality matches `SIMPLIFY_v1.md`, not the pre-simplify wish list.
- [x] If this is an endless score game, the balance has been swept with idle/casual/expert policies and the target medians hold: casual 60-120s, expert 300s+, and expert p25 240s+.
- [x] There are no obvious gameplay, UX, art, or polish failures left for the release gate to catch.

## Feedback Applied Before PASS

- The original `1.0.0` review should have failed for unclear loss pressure and for the detached next preview. Those gameplay fixes remain intact, and `1.0.3` only reopened the gate to verify that the corrected AI-generated art family did not compromise the already-passing preview timing, HUD safe-area placement, or game-over spacing.
- The `1.0.2` fallback composites materially undersold the goal of “real AI-generated matching family assets.” The corrective pass only passed after replacing them with the approved prod-generated hero/icon/backdrop set and rechecking that live gameplay still reads as the same product as the listing art.
- Endless-play balance stayed on the passing `1.0.2` schedule. I reran the scripted sweep after the art correction and confirmed the casual median remained within `60-120s` and expert results still cleared the `300s+` / `240s+` targets without further retuning.

## Evidence

- Balance report: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/balance/balance-report.md`
- Desktop gameplay proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/local-desktop-1.0.3-gameplay.png`
- Desktop game-over proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/local-desktop-1.0.3-gameover.png`
- Portrait gameplay proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/local-portrait-1.0.3-gameplay.png`
- Portrait game-over proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/local-portrait-1.0.3-gameover.png`
- Landscape hero proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/hero-landscape.png`
- Portrait hero proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/listing/hero-portrait.png`

## Verdict

PASS

## Required Fixes If Failed

- None
