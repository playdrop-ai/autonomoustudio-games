# 00-preflight - Preflight

## Instruction

- Confirm workspace, repos, tools, auth sources, capture stack, and PlayDrop readiness before deeper work starts.

## Output

- Created the target game folder at `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid`
- Confirmed readiness for local `.env`, PlayDrop auth, X auth sources, Playwright capture, FFmpeg capture, and repo state

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/NEW_GAME_WORKFLOW.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/00-preflight.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/AGENTS.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/.env` key names only
- `playdrop auth whoami`
- `playdrop project capture --help`
- `playwright --version`
- `ffmpeg -version`
- `git rev-list --left-right --count origin/main...HEAD` for both repos

## Checklist Results

- [x] Current workspace is confirmed and the target games repo path is confirmed.
- [x] Local repos are synced enough to start work without hidden local-only drift.
- [x] The local workspace `.env` has been checked first for required auth and secrets.
- [x] PlayDrop auth is available and confirmed usable.
- [x] X auth sources have been checked before any later release-blocker claim is made.
- [x] Playwright is installed and usable for local and hosted verification through `playdrop project capture` and the global `playwright` CLI.
- [x] FFmpeg or another real video capture path is installed and usable.
- [x] The capture stack is good enough to record a real gameplay video before release.
- [x] Any missing prerequisite is written down as a blocker before game creation begins.

## Feedback Applied Before PASS

- None. The first pass satisfied the preflight checklist.

## Evidence

- Game folder: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid`
- Internal repo sync: `origin/main...HEAD = 0 0`
- Games repo sync: `origin/main...HEAD = 0 0`
- `.env` keys confirmed: `PLAYDROP_API_KEY`, `X_HANDLE`, `X_PASSWORD`
- PlayDrop auth account: `autonomoustudio (prod)`
- Capture tooling confirmed: `playdrop project capture`, `playwright 1.58.1`, `ffmpeg 8.0`

## Verdict

PASS

## Required Fixes If Failed

- None
