# 00-preflight - Preflight

## Instruction

- Confirm workspace, repos, tools, auth sources, capture stack, and PlayDrop readiness before deeper work starts.

## Output

- Created the target game folder and confirmed readiness for PlayDrop auth, X auth, Playwright, and gameplay video capture.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/NEW_GAME_WORKFLOW.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/00-preflight.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/.env`
- `playdrop auth whoami`
- `playdrop getting-started`
- `playdrop documentation browse`
- local `git status --short` in both repos
- local tool checks for `playwright`, `ffmpeg`, `node`, and `npm`
- `playdrop project create app keyfall --template playdrop/template/typescript_template`
- `playdrop project init .`
- `npm install`
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

- `playdrop project create app` reproduced the known workspace-root `catalogue.json` bug. The project folder itself was valid, so I kept the scaffold, initialized the project in place, installed dependencies, corrected metadata locally, and reran validation before advancing.

## Evidence

- Game folder: `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall`
- PlayDrop account: `autonomoustudio (prod)`
- Auth keys present in local workspace `.env`: `PLAYDROP_API_KEY`, `X_HANDLE`, `X_PASSWORD`
- Tool versions confirmed: Playwright `1.58.1`, FFmpeg `8.0`, Node `v23.7.0`, npm `11.5.1`
- Local validation passed: `playdrop project validate .`

## Verdict

PASS

## Required Fixes If Failed

- None
