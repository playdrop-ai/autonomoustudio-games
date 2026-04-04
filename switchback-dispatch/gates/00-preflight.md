# 00-preflight - Preflight

## Instruction

- Confirm workspace, repos, tools, auth sources, capture stack, and PlayDrop readiness before deeper work starts.

## Output

- Created the target game folder, started `progress.md`, and confirmed readiness for PlayDrop auth, X auth sources, Playwright, FFmpeg, and local validation.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/NEW_GAME_WORKFLOW.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/SKILL_ROUTING.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/CONCEPT_KILL_CRITERIA.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/00-preflight.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/AGENTS.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/.env`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/.playdrop.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/.playdrop.json`
- `playdrop whoami`
- `playdrop project create app --help`
- `git status -sb` in both repos
- `ffmpeg -version`
- `node -v`
- `npm -v`
- `npx playwright --version`
- `npm install`
- `npm run validate`
- `playdrop project validate .`

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

- `playdrop project create app` correctly created `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch`, but it also warned that the root games workspace keeps `catalogue.json` as `{}`. I confirmed the root layout is intentional and kept all new work isolated inside the game folder.
- I initially ran `npm run validate` and `playdrop project validate .` in parallel, which caused a `dist/` build collision. I reran the PlayDrop validation sequentially and recorded the concurrency issue here so it is not mistaken for a project failure.
- Both repos already contained unrelated local changes before this run. I verified those changes are outside `switchback-dispatch/` and do not block isolated work on the new game.

## Evidence

- Game folder: `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch`
- PlayDrop account: `autonomoustudio (prod)`
- Internal workspace `.env` keys present: `PLAYDROP_API_KEY`, `X_HANDLE`, `X_PASSWORD`
- Tool versions:
  - Playwright `1.58.1`
  - FFmpeg `8.0`
  - Node `v23.7.0`
  - npm `11.5.1`
- Repo state:
  - `/Users/oliviermichon/Documents/autonomoustudio-internal` is `ahead 1` with unrelated local edits
  - `/Users/oliviermichon/Documents/autonomoustudio-games` is `ahead 1` with unrelated local edits plus the new untracked game folders
- Local validation passed: `npm run validate`
- PlayDrop validation passed: `playdrop project validate .`

## Verdict

PASS

## Required Fixes If Failed

- None
