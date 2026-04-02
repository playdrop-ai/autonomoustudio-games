# 08-release - Release

## Instruction

- Publish, verify the live build on every supported surface, update release docs, publish the required X release thread, close out meaningful PlayDrop feedback, then sync the repo only after the release gate can honestly pass.

## Output

- Published `autonomoustudio/app/glowknot` version `1.0.0`, then shipped hotfix `1.0.1` to remove the forced startup login from the PlayDrop preview boot path. Verified the public listing/detail page behavior plus the hosted desktop and portrait builds, updated `README.md` and `progress.md` with the live release state, and sent PlayDrop feedback for the release-path friction.
- The required X release thread did not complete because both available local auth paths failed: the saved browser profile never exposed a usable compose editor, and the fresh `.env` login flow returned `Could not log you in now. Please try again later.` before reaching password entry.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/08-release.md`
- `playdrop detail autonomoustudio/app/glowknot --json`
- Public listing page: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/glowknot`
- Public play page: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/glowknot/play`
- Hosted build: `https://assets.playdrop.ai/creators/autonomoustudio/apps/glowknot/v1.0.1/index.html`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/README.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/progress.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/scripts/post-x-thread.mjs`

## Checklist Results

- [x] The live hosted build has been verified on every intended supported surface.
- [x] The published listing has been verified and its media matches the shipped build.
- [x] Local auth sources were checked before any release task was declared blocked.
- [x] `progress.md` is updated with the published version, live URLs, verification commands, and the remaining follow-up.
- [ ] For a first public launch or major marketed update, the gameplay video post on X has been published as a single landscape gameplay video with player-facing marketing copy. For a routine live patch, `progress.md` explains why no fresh gameplay-video post was needed.
- [ ] For a first public launch or major marketed update, the game link has been published as a direct reply to that gameplay post. For a routine live patch, `progress.md` explains why no fresh link reply was needed.
- [ ] For a first public launch or major marketed update, the autonomous-AI and feedback note has been published as a second reply in the same release thread. For a routine live patch, `progress.md` explains why no fresh thread note was needed.
- [x] The project's `.playdropignore` excludes generated artifacts so the PlayDrop source upload is intentional and bounded.
- [x] The game folder README is updated with high-level info and live URLs.
- [ ] All release-sync repo changes other than the final `gates/08-release.md` PASS file are committed and pushed.
- [ ] The committed repo state matches the current live app: `catalogue.json`, `README.md`, and listing/store copy all reflect the same version, mechanics, and supported surfaces as the published build.
- [x] PlayDrop feedback has been sent if any meaningful bug, gap, or improvement idea was found.

## Feedback Applied Before FAIL

- The first publish attempt failed with `HTTP 413` because the uploaded source bundle still included duplicated listing screenshots/videos plus oversized store art. I reduced the bundle to about `2.15 MB`, kept the schema-required listing assets as PNGs, and republished successfully.
- The public creator play URL still shows an account-creation wall to an anonymous browser even though the hosted bundle plays directly. I verified the live release against the hosted bundle instead of pretending the creator play URL was anonymously playable.
- X posting could not be completed from the checked local auth sources:
  - The saved profile at `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/x-profile` loaded blank X pages and never exposed a usable compose editor in either headless or headed mode.
  - A fresh login attempt using `/Users/oliviermichon/Documents/autonomoustudio-internal/.env` failed on the username step with `Could not log you in now. Please try again later.` and redirected `/compose/post` back to login.
- Because the required X thread is still incomplete, I did not commit or push the repo state and I am leaving this gate at `FAIL`.

## Evidence

- Published app ref: `autonomoustudio/app/glowknot`
- Live listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/glowknot`
- Public play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/glowknot/play`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/glowknot/v1.0.1/index.html`
- Live browser verification:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/release-check/live-check.json`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/release-check/public-overview.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/release-check/public-play.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/release-check/hosted-desktop-live.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/release-check/hosted-portrait-live.png`
- X diagnostics:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/x-login-diagnostic/01-login-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/x-login-diagnostic/02-after-handle.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/x-login-diagnostic/04-compose-check.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/x-login-diagnostic-next/01-login-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/x-login-diagnostic-next/02-after-handle.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot/output/playwright/x-login-diagnostic-next/04-compose-check.png`
- PlayDrop feedback id: `40`

## Verdict

FAIL

## Required Fixes If Failed

- Get X back into a working authenticated compose state, publish the required gameplay post plus the two replies, and record the three X URLs here.
- Commit and push the live release-sync repo state once the X thread is complete.
- Rewrite this gate from `FAIL` to `PASS` only after those two fixes are done.
