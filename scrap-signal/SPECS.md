# Scrap Signal - High-level Requirements

## Objective

Ship a new PlayDrop game through the full gated workflow in `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/NEW_GAME_WORKFLOW.md` with final PASS files for `00` through `08`.

## Locked Direction

- Original name: `Scrap Signal`
- Core lane: desktop-first top-down beacon-defense shooter
- Proven loop: arena-survival shooting plus fixed-object defense
- Distinct angle: enemies are not enough to kill; the player must also haul single battery drops back into the beacon to keep the signal alive through the rescue shift

## Hard Constraints

- Do not drift back into a studio-covered lane such as tower defense, route deduction, bubble clearing, rhythm lanes, golf solitaire, or cluster-tap puzzle work.
- Do not ship a plain horde shooter that still reads like `Monster March`, `NEUROBOT`, or another kill-only arena survival clone.
- Do not add extra surfaces, weapons, upgrade shops, bosses, or meta systems unless the desktop core is already clearly strong.
- Do not start listing or release work until the raw build looks worth clicking without bespoke marketing treatment.

## Release Requirements

- Build on the PlayDrop TypeScript app path created by `playdrop project create app`.
- Keep `.playdropignore` current so generated artifacts stay out of the uploaded source.
- Validate with typecheck, `playdrop project validate`, Playwright/browser checks, real screenshots, and a real landscape gameplay video before release.
- Sync `README.md`, `catalogue.json`, `progress.md`, listing copy, and the final live PlayDrop state before `08-release`.
