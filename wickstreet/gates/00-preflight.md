# 00-preflight - Preflight

## Instruction

- Confirm workspace, repos, tools, auth sources, capture stack, and PlayDrop readiness before deeper work starts.

## Output

- Created the target game folder and confirmed readiness for PlayDrop auth, X auth, Playwright, gameplay capture, and local validation.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/NEW_GAME_WORKFLOW.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/00-preflight.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/AGENTS.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/.env`
- `playdrop auth whoami`
- `git fetch --prune` and `git status --short --branch` in both repos
- local tool checks for `node`, `npm`, `playwright`, and `ffmpeg`
- `npm install`
- `npm run validate`
- `playdrop project validate .`
- `npx playwright install chromium webkit`

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

- `playdrop project create app` scaffolded `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet` but exited with a workspace-root `catalogue.json` warning. I confirmed the games repo root catalogue still remained `{}` and kept all new work isolated inside the nested app folder.
- Both repos already had unrelated local changes. I fetched both remotes, confirmed neither branch was ahead or behind `origin/main`, and treated the existing dirtiness as known non-blocking context rather than hidden drift.
- The initial PlayDrop validation warned that the new app still had template metadata and no emoji/color. I accepted that as a non-blocking early-state warning because the app scaffold, auth, validation stack, and capture stack are all working before deeper implementation begins.

## Evidence

- Game folder: `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet`
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
