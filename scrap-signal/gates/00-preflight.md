# 00-preflight - Preflight

## Instruction

- Confirm workspace, repos, tools, auth sources, capture stack, and PlayDrop readiness before deeper work starts.

## Output

- Created the target game folder and started the per-game planning docs.
- Confirmed readiness for PlayDrop auth, X auth sources, Playwright verification, and gameplay video capture.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/NEW_GAME_WORKFLOW.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/SKILL_ROUTING.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/CONCEPT_KILL_CRITERIA.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/00-preflight.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/.env`
- `git status --short --branch` in `/Users/oliviermichon/Documents/autonomoustudio-internal`
- `git status --short --branch` in `/Users/oliviermichon/Documents/autonomoustudio-games`
- `playdrop update`
- `playdrop whoami`
- `ffmpeg -version`
- `/Users/oliviermichon/.codex/skills/playwright/scripts/playwright_cli.sh --help`
- `playdrop project create app scrap-signal --template playdrop/app/typescript_template`

## Checklist Results

- [x] Current workspace is confirmed and the target games repo path is confirmed.
- [x] Local repos are synced enough to start work without hidden local-only drift.
- [x] A per-game `progress.md` has been started with the original prompt or request, workspace path, and any early blockers.
- [x] The local workspace `.env` has been checked first for required auth and secrets.
- [x] PlayDrop auth is available and confirmed usable.
- [x] X auth sources have been checked before any later release-blocker claim is made.
- [x] Playwright is installed and usable for local and hosted verification.
- [x] FFmpeg or another real video capture path is installed and usable.
- [x] The capture stack is good enough to record a real gameplay video before release.
- [x] Any missing prerequisite is written down as a blocker before game creation begins.

## Feedback Applied Before PASS

- The PlayDrop CLI initially failed workspace account verification because it was still on `0.6.5` while the workspace now requires `0.6.6`. I updated the CLI before proceeding.
- `playwright-cli` was not globally installed on `PATH`, so I verified the bundled Playwright wrapper at `/Users/oliviermichon/.codex/skills/playwright/scripts/playwright_cli.sh` instead of treating browser verification as blocked.
- `playdrop project create app scrap-signal --template playdrop/app/typescript_template` returned non-zero because the games repo root catalogue intentionally stays `{}`. I verified that the registered per-game scaffold was still created correctly and left the root catalogue unchanged.

## Evidence

- Game folder: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal`
- Progress log: `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/progress.md`
- PlayDrop account: `autonomoustudio (prod)`
- Local `.env` keys confirmed by name: `PLAYDROP_API_KEY`, `X_HANDLE`, `X_PASSWORD`
- Tooling confirmed: PlayDrop `0.6.6`, FFmpeg `8.0`, Playwright wrapper `/Users/oliviermichon/.codex/skills/playwright/scripts/playwright_cli.sh`
- Games repo root catalogue remains `{}` at `/Users/oliviermichon/Documents/autonomoustudio-games/catalogue.json`

## Verdict

PASS

## Required Fixes If Failed

- None
