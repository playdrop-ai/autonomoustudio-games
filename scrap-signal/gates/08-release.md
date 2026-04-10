# 08-release - Release

## Instruction

- Publish, verify the live build, sync `README.md`, `progress.md`, `catalogue.json`, and listing copy to the final live version, complete the X release thread, send PlayDrop feedback for meaningful release-path issues, and close the release against the already-pushed release-sync repo state.

## Output

- Published `autonomoustudio/app/scrap-signal` version `1.0.0`, verified the hosted build on desktop, confirmed the public listing and media match the shipped build, synced the release docs and metadata, published the required 3-post X release thread, sent PlayDrop feedback `#52`, and pushed the release-sync repo state on commit `dd4ea381b57f7e2652c0952872989d6edb53b296` before this PASS file.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/08-release.md`
- Public listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/scrap-signal`
- Public play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/scrap-signal/play`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/scrap-signal/v1.0.0/index.html`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/README.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/progress.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/listing/X_THREAD.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/release-check/live-check.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/release-check/x-thread.json`
- Git commit pushed before PASS: `dd4ea381b57f7e2652c0952872989d6edb53b296`

## Checklist Results

- [x] The live hosted build has been verified on every intended supported surface.
- [x] The published listing has been verified and its media matches the shipped build.
- [x] Local auth sources were checked before any release task was declared blocked.
- [x] `progress.md` is updated with the published version, live URLs, verification commands, and any remaining follow-up.
- [x] For a first public launch or major marketed update, the gameplay video post on X has been published as a single landscape gameplay video with player-facing marketing copy.
- [x] For a first public launch or major marketed update, the game link has been published as a direct reply to that gameplay post.
- [x] For a first public launch or major marketed update, the autonomous-AI and feedback note has been published as a second reply in the same release thread.
- [x] The project's `.playdropignore` excludes generated artifacts so the PlayDrop source upload is intentional and bounded.
- [x] The game folder README is updated with high-level info and live URLs.
- [x] All release-sync repo changes other than the final `gates/08-release.md` PASS file are committed and pushed.
- [x] The committed repo state matches the current live app: `catalogue.json`, `README.md`, and listing/store copy all reflect the same version, mechanics, and supported surfaces as the published build.
- [x] PlayDrop feedback has been sent if any meaningful bug, gap, or improvement idea was found.

## Feedback Applied Before PASS

- The first publish attempt failed on `icon_too_large` because the reviewed square icon exceeded the PlayDrop upload cap at `863096` bytes. I quantized the same approved icon composition down to `166K`, then re-ran publish successfully without changing the shipped visual system.
- `playdrop credits balance` initially returned `404` even though `playdrop whoami` resolved `autonomoustudio (prod)`. Refreshing the session with `playdrop auth login --env prod --key "$PLAYDROP_API_KEY"` restored the credits lookup and unblocked `playdrop feedback send`, which then succeeded as feedback `#52`.
- The headless X login path timed out before the username field rendered. The final release thread was published successfully with the same local auth sources through the persistent headed Chrome profile using the script's mouse-driven path, and the resulting thread URLs were recorded in the repo evidence.
- As of `2026-04-10T13:30:00Z`, `playdrop detail autonomoustudio/app/scrap-signal --json` still reports `reviewState: "QUEUED"`, but the public listing, public play wrapper, and direct hosted bundle were already reachable and passed the live checks below.

## Evidence

- Published app ref: `autonomoustudio/app/scrap-signal`
- Live listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/scrap-signal`
- Live play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/scrap-signal/play`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/scrap-signal/v1.0.0/index.html`
- Live listing media confirmed from the public page source:
  - icon: `https://assets.playdrop.ai/creators/autonomoustudio/apps/scrap-signal/v1.0.0/listing/icon.png`
  - hero portrait: `https://assets.playdrop.ai/creators/autonomoustudio/apps/scrap-signal/v1.0.0/listing/hero-portrait.png`
  - hero landscape: `https://assets.playdrop.ai/creators/autonomoustudio/apps/scrap-signal/v1.0.0/listing/hero-landscape.png`
  - screenshot 1: `https://assets.playdrop.ai/creators/autonomoustudio/apps/scrap-signal/v1.0.0/listing/screenshots/landscape/1.png`
  - screenshot 2: `https://assets.playdrop.ai/creators/autonomoustudio/apps/scrap-signal/v1.0.0/listing/screenshots/landscape/2.png`
  - landscape gameplay video: `https://assets.playdrop.ai/creators/autonomoustudio/apps/scrap-signal/v1.0.0/listing/videos/landscape/1.mp4`
- Hosted build proofs:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/release-check/live-desktop.png`
- Public listing proof:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/release-check/live-listing.png`
- Public play wrapper proof:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/release-check/live-play-page.png`
- Live verification records:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/release-check/live-check.json`
  - hosted desktop advanced from `elapsedMs: 0` to `elapsedMs: 2219`
  - hosted desktop moved the player from `(788, 412)` to `(986, 285)`
  - hosted desktop stayed in `runState: "playing"` after real mouse and keyboard input
- X release thread record:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/release-check/x-thread.json`
- X gameplay post URL: `https://x.com/autonomoustudio/status/2042594535306326376`
- X link reply URL: `https://x.com/autonomoustudio/status/2042595712207090118`
- X autonomous note URL: `https://x.com/autonomoustudio/status/2042595826178867535`
- PlayDrop feedback id: `52`
- Release-sync commit pushed before PASS: `dd4ea381b57f7e2652c0952872989d6edb53b296`

## Verdict

PASS

## Required Fixes If Failed

- None.
