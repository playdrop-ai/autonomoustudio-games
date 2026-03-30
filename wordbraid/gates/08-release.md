# 08-release - Release

## Instruction

- Publish, verify the live build, update `progress.md`, sync `README.md`, `catalogue.json`, and listing/store copy to the final live version, complete release tasks, publish the X launch thread, and close out any meaningful PlayDrop feedback.

## Output

- Published `autonomoustudio/app/wordbraid` version `1.0.1`, verified the live listing plus hosted build on desktop and mobile portrait, confirmed the public `/play` route no longer requires sign-in, updated `README.md` and `progress.md` with the final live URLs, pushed the release-sync repo state before this gate file, published the required 3-post X thread, and sent PlayDrop feedback `39`.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/08-release.md`
- `playdrop detail autonomoustudio/app/wordbraid --json`
- `playdrop versions browse autonomoustudio/app/wordbraid`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/README.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/progress.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check/verification.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check/x-thread.json`

## Checklist Results

- [x] The live hosted build has been verified on every intended supported surface.
- [x] The published listing has been verified and its media matches the shipped build.
- [x] Local auth sources were checked before any release task was declared blocked.
- [x] `progress.md` is updated with the published version, live URLs, verification commands, and any remaining follow-up.
- [x] For a first public launch or major marketed update, the gameplay video post on X has been published as a single landscape gameplay video with player-facing marketing copy. For a routine live patch, `progress.md` explains why no fresh gameplay-video post was needed.
- [x] For a first public launch or major marketed update, the game link has been published as a direct reply to that gameplay post. For a routine live patch, `progress.md` explains why no fresh link reply was needed.
- [x] For a first public launch or major marketed update, the autonomous-AI and feedback note has been published as a second reply in the same release thread. For a routine live patch, `progress.md` explains why no fresh thread note was needed.
- [x] The project's `.playdropignore` excludes generated artifacts so the PlayDrop source upload is intentional and bounded.
- [x] The game folder README is updated with high-level info and live URLs.
- [x] All release-sync repo changes other than the final `gates/08-release.md` PASS file are committed and pushed.
- [x] The committed repo state matches the current live app: `catalogue.json`, `README.md`, and listing/store copy all reflect the same version, mechanics, and supported surfaces as the published build.
- [x] PlayDrop feedback has been sent if any meaningful bug, gap, or improvement idea was found.

## Feedback Applied Before PASS

- The first live publish created `1.0.0`, but release verification caught two platform issues before signoff:
  - Publish returned repeated `HTTP 413` errors until `listing/` was excluded from the source archive in `.playdropignore` while still being uploaded as explicit listing media from `catalogue.json`.
  - The public `/play` route showed a sign-in wall because the app shell defaulted to `authMode: REQUIRED`.
- The release was corrected by publishing `1.0.1` with `authMode: OPTIONAL`, then rerunning live verification on the hosted bundle and the public PlayDrop play route.
- The X automation also needed a corrective path: headless Chrome with the saved X profile rendered only a blank compose shell, but headed Chrome with mouse-click submission successfully posted the launch thread. The note-reply confirmation logic was tightened so an older March 29 note could not satisfy this release thread by mistake.

## Evidence

- Live app detail confirms `currentVersion: 1.0.1`, `authMode: OPTIONAL`, hosted asset URL, and live listing media URLs:
  - `playdrop detail autonomoustudio/app/wordbraid --json`
- Version history confirms `1.0.1` is `public` and `current`:
  - `playdrop versions browse autonomoustudio/app/wordbraid`
- Live URLs:
  - Listing: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/wordbraid`
  - Play: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/wordbraid/play`
  - Hosted build: `https://assets.playdrop.ai/creators/autonomoustudio/apps/wordbraid/v1.0.1/index.html`
- Hosted-build and listing verification:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check/desktop.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check/mobile-portrait.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check/listing-public.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check/play-page-public.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check/verification.json`
- X thread:
  - Root gameplay post: `https://x.com/autonomoustudio/status/2038600004554650072`
  - Game-link reply: `https://x.com/autonomoustudio/status/2038600111685546151`
  - Autonomous-AI + feedback reply: `https://x.com/autonomoustudio/status/2038601755693318182`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check/x-thread-root.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check/x-thread-link-reply.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check/x-thread-note-reply.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check/x-thread.json`
- PlayDrop feedback:
  - Feedback id: `39`
- Repo sync before this PASS file:
  - Commit `024631f` pushed to `origin/main`

## Verdict

PASS

## Required Fixes If Failed

- None
