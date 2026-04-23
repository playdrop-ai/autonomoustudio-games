# 05-implementation - Implementation

## Instruction

- Implement the approved simplified game and make the build solid enough for gameplay review, screenshots, and video capture.

## Output

- Shipped a complete playable build with three-spread progression, reserve charm logic, omen-suit bonuses, local best-score persistence, face-up next-draw preview, and responsive portrait-first UI on mobile portrait plus desktop.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/05-implementation.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/mockups/portrait-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/mockups/desktop-gameplay.png`
- `/Users/oliviermichon/.codex/plugins/cache/local-plugins/playdrop/local/skills/dev-testing/SKILL.md`
- `/Users/oliviermichon/.codex/skills/playwright/SKILL.md`

## Checklist Results

- [x] Core layout is aligned correctly with no obvious board, tile, or HUD misalignment.
- [x] Core interaction motion is good enough, including movement, merge, spawn, and state-change feedback.
- [x] The implementation matches the locked simplify doc and approved mockups.
- [x] The best-platform input feels crisp and obvious without relying on explanation text.
- [x] Visual polish is intentional enough that the game does not read as placeholder or hacked together.
- [x] End states, restart flow, and persistence behavior are solid enough for repeat play.
- [x] The current build is capture-ready for screenshots and video.
- [x] There are no obvious quality bugs that would embarrass the release.

## Feedback Applied Before PASS

- The first gameplay-ready pass was too harsh and too opaque because the stock was hidden and the opening spread often died before the hook landed. I changed the live ruleset to a `14`-card stock with a face-up next-draw preview so loss proximity and planning are readable in the shipped UI instead of being inferred.
- The first empty-reserve placeholder also wrapped awkwardly on phone. I reduced it to a short ready-state card and tightened the bottom-rail copy so the portrait build stays clean at shipping width.

## Evidence

- Logic implementation: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/src/game/state.ts`
- UI implementation: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/src/main.ts`
- Final shell and styling: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/template.html`
- Logic tests: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/tests/logic.test.ts`
- QA summary: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/tmp/gameplay-qa.md`
- Mobile gameplay capture: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/tmp/qa-mobile-playing-v2.png`
- Desktop gameplay capture: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/tmp/qa-desktop-playing.png`

## Verdict

PASS

## Required Fixes If Failed

- None
