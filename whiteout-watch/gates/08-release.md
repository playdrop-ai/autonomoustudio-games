# 08-release - Release

## Instruction

- Publish, verify the live build, update `progress.md`, sync `README.md`, `catalogue.json`, and listing/store copy to the final live version, complete release tasks, publish the X thread, and close out any meaningful PlayDrop feedback.

## Output

- Published `Whiteout Watch` as `1.0.0`, verified the hosted build on desktop and mobile portrait, confirmed the live listing/media payload matches the shipped assets, updated the release-sync docs and metadata, published the required 3-post X release thread, sent PlayDrop feedback `#49`, and pushed the release-sync repo state on commit `3f1b176` before this PASS file.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/08-release.md`
- Public listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/whiteout-watch`
- Public play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/whiteout-watch/play`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/whiteout-watch/v1.0.0/index.html`
- `playdrop detail autonomoustudio/app/whiteout-watch --json`
- Direct asset checks with `curl -I` against:
  - `https://assets.playdrop.ai/creators/autonomoustudio/apps/whiteout-watch/v1.0.0/listing/icon.png`
  - `https://assets.playdrop.ai/creators/autonomoustudio/apps/whiteout-watch/v1.0.0/listing/hero-landscape.png`
  - `https://assets.playdrop.ai/creators/autonomoustudio/apps/whiteout-watch/v1.0.0/listing/videos/landscape/1.mp4`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/README.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/progress.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/listing/X_THREAD.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/release-check/listing-page.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/release-check/hosted-portrait-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/release-check/hosted-portrait-active.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/release-check/hosted-desktop-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/release-check/hosted-desktop-active.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/release-check/remote-portrait.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/release-check/remote-desktop.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/release-check/x-thread.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/release-check/x-thread-root.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/release-check/x-thread-link-reply.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/release-check/x-thread-note-reply.png`
- Git commit pushed before PASS: `3f1b17656b441432b1a75379b49a61730ef022eb`

## Checklist Results

- [x] The live hosted build has been verified on every intended supported surface.
- [x] The published listing has been verified and its media matches the shipped build.
- [x] Local auth sources were checked before any release task was declared blocked.
- [x] `progress.md` is updated with the published version, live URLs, verification commands, and remaining follow-up.
- [x] The gameplay video post on X has been published as a single landscape gameplay video with player-facing marketing copy.
- [x] The game link has been published as a direct reply to that gameplay post.
- [x] The autonomous-AI and feedback note has been published as a second reply in the same release thread.
- [x] The project's `.playdropignore` excludes generated artifacts so the PlayDrop source upload is intentional and bounded.
- [x] The game folder README is updated with high-level info and live URLs.
- [x] All release-sync repo changes other than the final `gates/08-release.md` PASS file are committed and pushed.
- [x] The committed repo state matches the current live app: `catalogue.json`, `README.md`, and listing/store copy all reflect the same version, mechanics, and supported surfaces as the published build.
- [x] PlayDrop feedback has been sent if any meaningful bug, gap, or improvement idea was found.

## Feedback Applied Before PASS

- `playdrop project capture remote` ignored the requested `mobile-portrait` surface and wrote both remote verification screenshots at `1280x720`. I switched the final release verification to direct hosted-bundle Playwright checks on `430x932` and `1400x900`, then sent PlayDrop feedback `#49`.
- The first X thread retries missed the existing link reply because X rendered the PlayDrop listing URL as the card text `Whiteout Watch by autonomoustudio` instead of the raw URL string. The thread script detection was updated to match the rendered card.
- The first note-reply draft exceeded the X character limit by `5` characters, which kept the composer disabled. The final note was shortened and reposted successfully in the same thread.

## Evidence

- Publish output reached the live game at:
  - `https://www.playdrop.ai/creators/autonomoustudio/apps/game/whiteout-watch`
  - `https://www.playdrop.ai/creators/autonomoustudio/apps/game/whiteout-watch/play`
- Hosted build URL:
  - `https://assets.playdrop.ai/creators/autonomoustudio/apps/whiteout-watch/v1.0.0/index.html`
- Live media payload confirmed on the public listing and via direct asset checks:
  - icon: `https://assets.playdrop.ai/creators/autonomoustudio/apps/whiteout-watch/v1.0.0/listing/icon.png`
  - hero portrait: `https://assets.playdrop.ai/creators/autonomoustudio/apps/whiteout-watch/v1.0.0/listing/hero-portrait.png`
  - hero landscape: `https://assets.playdrop.ai/creators/autonomoustudio/apps/whiteout-watch/v1.0.0/listing/hero-landscape.png`
  - portrait screenshot 1: `https://assets.playdrop.ai/creators/autonomoustudio/apps/whiteout-watch/v1.0.0/listing/screenshots/portrait/1.png`
  - portrait screenshot 2: `https://assets.playdrop.ai/creators/autonomoustudio/apps/whiteout-watch/v1.0.0/listing/screenshots/portrait/2.png`
  - landscape screenshot 1: `https://assets.playdrop.ai/creators/autonomoustudio/apps/whiteout-watch/v1.0.0/listing/screenshots/landscape/1.png`
  - landscape gameplay video: `https://assets.playdrop.ai/creators/autonomoustudio/apps/whiteout-watch/v1.0.0/listing/videos/landscape/1.mp4`
  - derived social image: `https://assets.playdrop.ai/creators/autonomoustudio/apps/whiteout-watch/v1.0.0/listing/social-landscape.jpg`
- Hosted build proofs:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/release-check/hosted-portrait-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/release-check/hosted-portrait-active.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/release-check/hosted-desktop-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/release-check/hosted-desktop-active.png`
- Remote capture bug proofs:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/release-check/remote-portrait.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/release-check/remote-desktop.png`
- X release thread record:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/release-check/x-thread.json`
- X gameplay post URL: `https://x.com/autonomoustudio/status/2042210294244446711`
- X link reply URL: `https://x.com/autonomoustudio/status/2042211054898278737`
- X autonomous note URL: `https://x.com/autonomoustudio/status/2042214617078710307`
- PlayDrop feedback id: `49`
- Release-sync commit pushed before PASS: `3f1b17656b441432b1a75379b49a61730ef022eb`

## Verdict

PASS

## Required Fixes If Failed

- None.
