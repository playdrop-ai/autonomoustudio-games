# 05-implementation - Implementation

## Instruction

- Build the game to match the simplified concept and approved mockups with correct layout, readability, and motion quality.

## Output

- Runnable portrait-first puzzle build with desktop support
- Core logic tests, typecheck, and build validation
- Local review captures for start, gameplay, and game-over across desktop and mobile portrait

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/gates/04-mockup.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/src/main.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/src/game.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/src/bots.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/tests/game.test.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/playwright/review-composite-final.png`

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

- The first hosted-shell proof attempt failed before the PlayDrop dev shell ever requested the local app iframe. I restored the static SDK loader, kept host init gated to real PlayDrop contexts, and continued implementation review from the direct local build while treating the shell behavior as a PlayDrop platform issue to report during release.
- The intro preview originally inherited a mid-run score from the seeded board reveal. I reset preview score state to `0` so the start screen reads as a fresh run instead of a captured gameplay frame.
- The portrait start sheet originally clipped the CTA below the viewport. I tightened the narrow-screen board and sheet sizing so the intro and game-over panels fit fully on mobile portrait.

## Evidence

- Validation:
  - `npm run validate`
  - `playdrop project validate .`
- Local review captures:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/playwright/review-desktop-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/playwright/review-desktop-gameplay.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/playwright/review-desktop-gameover.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/playwright/review-mobile-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/playwright/review-mobile-gameplay.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/playwright/review-mobile-gameover.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/playwright/review-composite-final.png`

## Verdict

PASS

## Required Fixes If Failed

- None
