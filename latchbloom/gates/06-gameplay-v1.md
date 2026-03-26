# 06-gameplay-v1 - Gameplay v1

## Instruction

- Run the pre-publish gameplay review and reject the build if the core loop, UX, art, or supported-surface quality is not good enough.

## Output

- Re-ran the gameplay gate on the `1.0.2` build with browser-rendered portrait and desktop proof, explicit HUD/overlay readability checks, marketing-parity review, and the full idle/casual/expert balance sweep.

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

- The original `1.0.0` review should have failed for unclear loss pressure and for the detached next preview. That fix landed in `1.0.1`, but `1.0.2` only passed after the preview became a ghosted in-board token with a readable charge ring and the portrait HUD was moved fully above the painted frame.
- The original portrait start and game-over framing also should have failed. The final gate only passed after replacing those treatments with bottom sheets, rebuilding the game-over stat stack, and re-capturing browser-rendered proof.
- Endless-play balance stayed on the passing `1.0.1` schedule. I reran the scripted sweep after the visual patch and confirmed the casual median remained within `60-120s` and expert results still cleared the `300s+` / `240s+` targets without further retuning.
- Marketing parity was rechecked after the new listing family landed. The live gameplay no longer reads materially cheaper than the hero art because the board now sits inside the same greenhouse visual language used by the listing.

## Evidence

- Balance report: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/balance/balance-report.md`
- Portrait gameplay proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/portrait-gameplay.png`
- Portrait game-over proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/portrait-gameover.png`
- Desktop gameplay proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/desktop-gameplay.png`
- Desktop game-over proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/desktop-gameover.png`
- Live portrait gameplay proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/live-build-1.0.2-portrait-gameplay.png`
- Live desktop gameplay proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/live-build-1.0.2-desktop-gameplay-v2.png`

## Verdict

PASS

## Required Fixes If Failed

- None
