# 00-preflight - Preflight

## Instruction

- Confirm workspace, repos, tools, auth sources, capture stack, and PlayDrop readiness before deeper work starts.

## Output

- Created the registered `velvet-arcana` app folder, started `progress.md`, corrected the scaffold metadata locally, and confirmed readiness for PlayDrop auth, X auth, Playwright, and gameplay video capture.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/NEW_GAME_WORKFLOW.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/SKILL_ROUTING.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/00-preflight.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/.env`
- `playdrop whoami`
- `playdrop help`
- `playdrop project create app --help`
- `playdrop documentation browse`
- `playdrop documentation read cli`
- `playdrop documentation read publishing`
- local `git fetch --prune`, `git status --short --branch`, and `git rev-list --left-right --count origin/main...HEAD` in both repos
- local tool checks for `playwright`, `ffmpeg`, `node`, and `npm`
- PlayDrop public browse of studio games, public games, templates, demos, and asset packs

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

- The CLI scaffold failed against the studio workspace contract because it tried to write into the root `catalogue.json`, which must stay `{}`. The created app folder was kept, and its local metadata was corrected by hand inside `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana` before deeper work.

## Evidence

- Game folder: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana`
- Progress log: `/Users/oliviermichon/Documents/autonomoustudio-games/velvet-arcana/progress.md`
- PlayDrop account: `autonomoustudio (prod)`
- Auth keys present in local workspace `.env`: `PLAYDROP_API_KEY`, `X_HANDLE`, `X_PASSWORD`
- Tool versions confirmed: Playwright `1.58.1`, FFmpeg `8.0`, Node `v23.7.0`, npm `11.5.1`
- Repo sync check: both repos are `0 0` against `origin/main`; the internal docs repo is locally dirty but not ahead or behind remote, and the release-sync repo is clean

## Verdict

PASS

## Required Fixes If Failed

- None
