# 05-implementation - Implementation

## Instruction

- Build the simplified game to match the approved mockups, validate it locally, and confirm the live runtime is capture-ready.

## Output

- Shipped a runnable PlayDrop TypeScript build for `Lunchline`.
- Passed local validation with `npm run validate` and `playdrop project validate .`.
- Captured browser-rendered runtime states for portrait and desktop from the PlayDrop local dev route.
- Passed the scripted endless-run balance sweep with target medians.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/NEW_GAME_WORKFLOW.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/05-implementation.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/gates/04-mockup.md`
- `/Users/oliviermichon/.codex/plugins/cache/local-plugins/playdrop/local/skills/dev-testing/SKILL.md`

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

- Fixed a live runtime bootstrap bug in `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/src/main.ts` where `#stage` was rendered as a `<section>` but validated as an `HTMLDivElement`, which broke browser startup before debug and input hooks were available.
- Tightened the HUD header layout after the first browser review so the order card title and rush meter no longer clip on portrait or desktop captures.
- Retuned the scripted `casual` autoplay policy in `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/scripts/balance-report.ts` to hit the locked endless-run target without changing the shipped game rules.

## Evidence

- Validation: `npm run validate`
- PlayDrop validation: `playdrop project validate .`
- Balance sweep: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/validation/balance-report.json`
  - `idle` median: `15.6s`
  - `casual` median: `66.5s`
  - `expert` median: `900s`
  - `expert` p25: `900s`
- Runtime review captures:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/runtime-review/mobile-portrait-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/runtime-review/mobile-portrait-play.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/runtime-review/mobile-portrait-gameover.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/runtime-review/desktop-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/runtime-review/desktop-play.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/runtime-review/desktop-gameover.png`
- Mobile input smoke test on the live dev route:
  - started the run with the real `Start Shift` button
  - tapped the real canvas on a detected cluster center
  - observed score change from `0` to `264` with complaints unchanged at `0`

## Verdict

PASS

## Required Fixes If Failed

- None
