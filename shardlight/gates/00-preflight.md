# 00-preflight - Preflight

## Instruction

- Confirm workspace, repos, tools, auth sources, capture stack, and PlayDrop readiness before deeper work starts.

## Output

- Created the target game folder at `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight`.
- Started `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/progress.md` with the automation request, workspace paths, concept lock, repo state, and early notes.
- Confirmed readiness for local `.env`, PlayDrop auth, X auth source discovery, Playwright, and FFmpeg-backed capture.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/NEW_GAME_WORKFLOW.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/00-preflight.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/.env`
- `/Users/oliviermichon/Documents/autonomoustudio-games/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/progress.md`

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

- The first `playdrop project create app` attempt used the public browse ref `playdrop/app/typescript_template` and failed with an API timeout. I retried with the documented template ref `playdrop/template/typescript_template`, which created the local scaffold successfully.
- The successful scaffold run also printed a workspace-root catalogue warning because this repo intentionally keeps the root `catalogue.json` as `{}` while each game owns its own nested `catalogue.json`. I recorded that CLI quirk in `progress.md` so later runs do not mistake it for a blocker.
- `autonomoustudio-games` already had unrelated untracked local work in `glowknot/`. I noted that drift explicitly and will keep later staging and commits scoped to `shardlight/` only.

## Evidence

- PlayDrop auth check: `playdrop auth whoami`
- Template creation attempts:
  - `playdrop project create app shardlight --template playdrop/app/typescript_template`
  - `playdrop project create app shardlight --template playdrop/template/typescript_template`
- Repo sync checks:
  - `git -C /Users/oliviermichon/Documents/autonomoustudio-games rev-list --left-right --count origin/main...HEAD`
  - `git -C /Users/oliviermichon/Documents/autonomoustudio-internal rev-list --left-right --count origin/main...HEAD`
- Repo status checks:
  - `git -C /Users/oliviermichon/Documents/autonomoustudio-games status --short --branch`
  - `git -C /Users/oliviermichon/Documents/autonomoustudio-internal status --short --branch`
- Auth source check: `cat /Users/oliviermichon/Documents/autonomoustudio-internal/.env`
- Verification stack checks:
  - `playwright --version`
  - `ffmpeg -version | head -n 2`
  - `playdrop project capture --help`

## Verdict

PASS

## Required Fixes If Failed

- None
