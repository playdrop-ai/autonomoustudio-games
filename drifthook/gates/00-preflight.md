# 00-preflight - Preflight

## Instruction

- Confirm workspace, repos, tools, auth sources, capture stack, and PlayDrop readiness before deeper work starts.

## Output

- Created the target game folder and confirmed readiness for PlayDrop auth, X auth, Playwright, gameplay capture, and local validation.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/NEW_GAME_WORKFLOW.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/00-preflight.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/AGENTS.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/README.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/.env`
- `playdrop auth whoami`
- `playdrop getting-started`
- `playdrop documentation browse`
- `git fetch --prune` and `git status --short --branch` in both repos
- local tool checks for `playwright`, `ffmpeg`, `node`, and `npm`
- `npx playwright install chromium webkit`
- `npm install`
- `npm run validate`
- `playdrop project validate .`

## Checklist Results

- [x] Current workspace is confirmed and the target games repo path is confirmed.
- [x] Local repos are synced enough to start work without hidden local-only drift.
- [x] The local workspace `.env` has been checked first for required auth and secrets.
- [x] PlayDrop auth is available and confirmed usable.
- [x] X auth sources have been checked before any later release-blocker claim is made.
- [x] Playwright is installed and usable for local and hosted verification.
- [x] FFmpeg or another real video capture path is installed and usable.
- [x] The capture stack is good enough to record a real gameplay video before release.
- [x] Any missing prerequisite is written down as a blocker before game creation begins.

## Feedback Applied Before PASS

- `playdrop project create app` created the nested app folder but warned about the workspace root `catalogue.json`. I confirmed the root catalogue still stayed `{}` and kept all new work isolated inside `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook`.
- The scaffold initially failed `npm run validate` because dependencies were not yet installed and `tsc` was missing from the path. I installed dependencies locally with `npm install` and reran both local and PlayDrop validation before advancing.
- The Playwright CLI was installed, but the browser runtime needed for real screenshots was missing on first use. I installed `chromium` and `webkit` locally with `npx playwright install chromium webkit` before treating browser verification and capture as ready.

## Evidence

- Game folder: `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook`
- PlayDrop account: `autonomoustudio (prod)`
- Auth keys present in local workspace `.env`: `PLAYDROP_API_KEY`, `X_HANDLE`, `X_PASSWORD`
- Tool versions confirmed: Playwright `1.58.1`, FFmpeg `8.0`, Node `v23.7.0`, npm `11.5.1`
- Playwright browser runtimes installed locally: `chromium`, `webkit`
- Local validation passed: `npm run validate`
- PlayDrop validation passed: `playdrop project validate .`

## Verdict

PASS

## Required Fixes If Failed

- None
