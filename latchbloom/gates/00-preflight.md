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
- local `git fetch --prune` and `git status -sb` in both repos
- local tool checks for `playwright`, `ffmpeg`, `node`, and `npm`
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

- The first working name, `Bloomline`, felt too generic against the idea gate's ownability bar. I renamed the folder and metadata to `Latchbloom` before locking deeper workflow docs.
- `playdrop project create app` scaffolded a broken template catalogue. I kept the usable project, corrected the local metadata by hand, installed dependencies, and reran validation before advancing.

## Evidence

- Game folder: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom`
- PlayDrop account: `autonomoustudio (prod)`
- Auth keys present in local workspace `.env`: `PLAYDROP_API_KEY`, `X_HANDLE`, `X_PASSWORD`
- Tool versions confirmed: Playwright `1.58.1`, FFmpeg `8.0`, Node `v23.7.0`, npm `11.5.1`
- Local validation passed: `playdrop project validate .`

## Verdict

PASS

## Required Fixes If Failed

- None
