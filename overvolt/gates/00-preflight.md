# 00-preflight - Preflight

## Instruction

- Confirm workspace, repos, tools, auth sources, capture stack, and PlayDrop readiness before deeper work starts.

## Output

- Reused the existing raw `overvolt` app scaffold, started `progress.md`, and confirmed readiness for PlayDrop auth, X auth, Playwright, and real gameplay capture.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/NEW_GAME_WORKFLOW.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/SKILL_ROUTING.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/00-preflight.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/README.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/README.md`
- `git status --short --branch` and recent `git log --oneline -5` in `/Users/oliviermichon/Documents/autonomoustudio-games`
- `git status --short --branch` and recent `git log --oneline -5` in `/Users/oliviermichon/Documents/autonomoustudio-internal`
- workspace env search in `/Users/oliviermichon/Documents/autonomoustudio-games`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/.env`
- `playdrop auth whoami`
- `playdrop help`
- `playdrop project create app --help`
- `playdrop documentation browse`
- `npx playwright --version`
- `ffmpeg -version`
- `node -v`
- `npm -v`

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

- This run inherited `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt` as an untracked raw template folder from an earlier attempt. Instead of creating a second app slug and fragmenting release history, I treated the existing scaffold as the registered app folder for this run and formalized the workflow around it.
- The games repo has no local `.env`, so I explicitly checked that absence first, then confirmed the shared internal auth source at `/Users/oliviermichon/Documents/autonomoustudio-internal/.env` before deciding that PlayDrop and X were actually ready.

## Evidence

- Game folder: `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt`
- Progress log: `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/progress.md`
- PlayDrop account: `autonomoustudio (prod)`
- Auth keys present in `/Users/oliviermichon/Documents/autonomoustudio-internal/.env`: `PLAYDROP_API_KEY`, `X_HANDLE`, `X_PASSWORD`
- Tool versions confirmed: Playwright `1.58.1`, FFmpeg `8.0`, Node `v23.7.0`, npm `11.5.1`
- Repo status: both repos track `main...origin/main`; both are locally dirty from existing unrelated work but not blocked for a new game run

## Verdict

PASS

## Required Fixes If Failed

- None
