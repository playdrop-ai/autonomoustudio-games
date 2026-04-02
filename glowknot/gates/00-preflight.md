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
- `playdrop browse --kind app --json`
- `playdrop browse --kind asset --json`
- `playdrop documentation browse`
- `git -C /Users/oliviermichon/Documents/autonomoustudio-internal fetch --prune`
- `git -C /Users/oliviermichon/Documents/autonomoustudio-games fetch --prune`
- `git status -sb` in both repos
- `npx playwright --version`
- `ffmpeg -version`
- `node -v`
- `npm -v`
- `npm install`
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

- `playdrop project create app glowknot --template playdrop/app/typescript_template` printed a workspace-root `catalogue.json` warning after scaffolding. I verified the repo root `catalogue.json` remained `{}` and continued inside the per-game folder instead of treating the warning as a blocker.
- The first validation attempt failed because the fresh scaffold had not installed local TypeScript tooling yet. I ran `npm install`, updated the app metadata away from the raw template values, and reran local validation before accepting the gate.

## Evidence

- Game folder: `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot`
- Progress log: `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/progress.md`
- PlayDrop account: `autonomoustudio (prod)`
- Auth keys present in local workspace `.env`: `PLAYDROP_API_KEY`, `X_HANDLE`, `X_PASSWORD`
- Tool versions confirmed: Playwright `1.58.1`, FFmpeg `8.0`, Node `v23.7.0`, npm `11.5.1`
- Repo status after fetch: `## main...origin/main` in both repos
- Local validation passed: `playdrop project validate .`

## Verdict

PASS

## Required Fixes If Failed

- None
