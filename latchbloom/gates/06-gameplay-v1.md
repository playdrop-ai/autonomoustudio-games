# 06-gameplay-v1 - Gameplay v1

## Instruction

- Run the pre-publish gameplay review and reject the build if the core loop, UX, art, or supported-surface quality is not good enough.

## Output

- Re-ran the gameplay gate on the `1.0.1` build with browser-rendered portrait and desktop proof, explicit HUD/overlay readability checks, and a full idle/casual/expert balance sweep.

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

- The original `1.0.0` review should have failed for unclear loss pressure and for the detached next preview. I changed the release HUD to a global top-right 3-pip strike meter and a single in-board next-preview above the actual incoming lane, then rechecked both surfaces.
- The original portrait start and game-over framing also should have failed. The final gate only passed after replacing those treatments with bottom sheets and re-capturing browser-rendered proof.
- Endless-play balance is now backed by a scripted sweep instead of subjective feel. The passing report records idle, casual, and expert results against the target windows.

## Evidence

- Balance report: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/balance/balance-report.md`
- Portrait gameplay proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/portrait-gameplay.png`
- Portrait game-over proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/portrait-gameover.png`
- Desktop gameplay proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/desktop-gameplay.png`
- Desktop game-over proof: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/mockups/desktop-gameover.png`

## Verdict

PASS

## Required Fixes If Failed

- None
