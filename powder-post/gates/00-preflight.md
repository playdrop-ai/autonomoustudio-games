# 00-preflight - Preflight

## Instruction

- Confirm workspace, repos, tools, auth sources, capture stack, and PlayDrop readiness before deeper work starts.

## Output

- Created the target game folder and started the per-game planning docs.
- Confirmed readiness for PlayDrop auth, X auth sources, Playwright verification, and gameplay video capture.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/NEW_GAME_WORKFLOW.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/SKILL_ROUTING.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/00-preflight.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/.env`
- `git status --short --branch` in `/Users/oliviermichon/Documents/autonomoustudio-internal`
- `git status --short --branch` in `/Users/oliviermichon/Documents/autonomoustudio-games`
- `playdrop whoami`
- `npx playwright --version`
- `ffmpeg -version`
- `playdrop project create app powder-post --template playdrop/template/typescript_template`

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

- The CLI scaffold returned non-zero because the workspace root catalogue is intentionally `{}`. I verified that the actual per-game scaffold was still created correctly and kept the root catalogue unchanged.
- The first concept search touched several clone-prone lanes before the folder was locked. I rejected them before advancing so the new project started with an ownable lane instead of inheriting a weak idea into later gates.

## Evidence

- Game folder: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post`
- Progress log: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/progress.md`
- PlayDrop account: `autonomoustudio (prod)`
- Local `.env` keys confirmed by name: `PLAYDROP_API_KEY`, `X_HANDLE`, `X_PASSWORD`
- Tooling confirmed: Playwright `1.58.1`, FFmpeg `8.0`, `playdrop` present on PATH
- Games repo root catalogue remains `{}` at `/Users/oliviermichon/Documents/autonomoustudio-games/catalogue.json`

## Verdict

PASS

## Required Fixes If Failed

- None
