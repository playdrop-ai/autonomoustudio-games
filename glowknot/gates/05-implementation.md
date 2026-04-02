# 05-implementation - First Complete Build

## Instruction

- Implement the first complete playable `Glowknot` build so it matches `SIMPLIFY_v1.md`, is capture-ready, and is solid enough to move into the gameplay gate.

## Output

- Built the full v1 game loop in the local app:
  - canopy generation, match resolution, detached-drop scoring, sink pressure, and refill waves
  - portrait-first canvas presentation with reserve swap, loss line, start/game-over states, and best-score persistence
  - deterministic debug helpers for review captures and autoplay media sweeps
- Added validation coverage with gameplay logic tests and a repeatable balance-report script.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/mockups/portrait-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/mockups/portrait-gameplay.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/mockups/desktop-gameover.png`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/05-implementation.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/src/main.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/src/game/logic.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/src/game/render.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/src/game/bots.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/tests/logic.test.ts`

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

- The first implementation pass failed on three obvious issues: the shot animation always rendered as coral, the lantern glow renderer treated hex values like `rgb(...)` strings, and the mobile HUD/start screen overlapped both the canopy and the CTA area.
- I fixed those by wiring the real shot color through the animation path, converting lantern glows through a real `hex -> rgba` helper, moving the live HUD to gameplay-only surfaces, simplifying the live HUD, and redesigning the start/game-over overlays so they no longer collide with the playfield or stats.
- The first capture attempt also exposed that `glowknot` had not been registered server-side because the scaffold command had been run from the nested games workspace. I registered the app from a clean temporary directory, restored the real repo folder, and kept the later implementation review on the real local build instead of mockups.

## Evidence

- Validation: `playdrop project validate .`
- Local portrait start review: `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/local-portrait-start.png`
- Local portrait gameplay review: `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/local-portrait-gameplay.png`
- Local desktop gameplay review: `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/local-desktop-gameplay-short.png`
- Local desktop game-over review: `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/local-desktop-gameover.png`

## Verdict

PASS

## Required Fixes If Failed

- None
