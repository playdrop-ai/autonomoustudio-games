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
- local `git fetch --all --prune` and `git status -sb` in both repos
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

- The automation memory path again expanded through an empty `CODEX_HOME`. I treated `~/.codex/automations/new-game/memory.md` as the canonical path for this run instead of advancing with a broken variable.
- `playdrop project create app` created the nested `shardspan` folder successfully but still emitted the known root-catalogue warning because the games repo intentionally keeps a root `{}` catalogue. I kept the usable project and validated inside the game folder instead of restarting the workspace shape.
- The public `starter-kit-3d-platformer` remix was not self-contained: it referenced missing `perf-shared` modules and failed validation. I copied the public shared modules into the local project, patched the imports to stay inside `shardspan`, and reran validation before continuing.

## Evidence

- Game folder: `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan`
- Games repo path: `/Users/oliviermichon/Documents/autonomoustudio-games`
- PlayDrop account: `autonomoustudio (prod)`
- Auth keys present in local workspace `.env`: `PLAYDROP_API_KEY`, `X_HANDLE`, `X_PASSWORD`
- Tool versions confirmed: Playwright present at `/opt/homebrew/bin/playwright`, FFmpeg present at `/opt/homebrew/bin/ffmpeg`, Node `v23.7.0`, npm `11.5.1`
- Local validation passed in the target project: `playdrop project validate .`

## Verdict

PASS

## Required Fixes If Failed

- None
