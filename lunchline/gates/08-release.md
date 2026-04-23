# 08-release - Release

## Instruction

- Publish, verify the live build, sync `README.md`, `progress.md`, `catalogue.json`, and listing copy to the final live version, complete the X release thread, send PlayDrop feedback for meaningful release-path issues, and close the release against the already-pushed release-sync repo state.

## Output

- Published `autonomoustudio/lunchline` version `1.0.0`, verified the hosted build on desktop and mobile portrait, confirmed the public listing and media match the shipped build, synced the release docs and metadata, published the required 3-post X release thread, sent PlayDrop feedback `#2`, and pushed the release-sync repo state on commit `4b90b8cdc0cab3cbceceea316a625f6ec203d7db` before this PASS file.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/08-release.md`
- Public listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/lunchline`
- Public play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/lunchline/play`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/lunchline/v1.0.0/index.html`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/README.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/progress.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/listing/X_THREAD.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/release-check/live-check.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/release-check/x-thread.json`
- Git commit pushed before PASS: `4b90b8cdc0cab3cbceceea316a625f6ec203d7db`

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

- The first publish attempt failed on a real listing constraint because `listing/icon.png` exceeded the `512KB` limit. I patched `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/scripts/export-listing-art.mjs` to quantize the exported icon with `pngquant`, regenerated the family, and the next publish succeeded without changing the visual system.
- `playdrop ai create image` could not reach the PlayDrop AI API during listing prep, so the shipped hero and icon family used the documented local fallback generated from real gameplay screenshots. That failure was reported in PlayDrop feedback `#2`.
- The headless X posting path never rendered a usable username field from the local auth flow. The final release thread was published successfully in headed Chrome with the same local `.env` credentials and mouse-driven submission, and the resulting thread URLs were recorded in the repo evidence.

## Evidence

- Published app ref: `autonomoustudio/lunchline`
- Live listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/lunchline`
- Live play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/lunchline/play`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/lunchline/v1.0.0/index.html`
- Live listing media confirmed from the public listing HTML payload:
  - icon: `https://assets.playdrop.ai/creators/autonomoustudio/apps/lunchline/v1.0.0/listing/icon.png`
  - hero portrait: `https://assets.playdrop.ai/creators/autonomoustudio/apps/lunchline/v1.0.0/listing/hero-portrait.png`
  - hero landscape: `https://assets.playdrop.ai/creators/autonomoustudio/apps/lunchline/v1.0.0/listing/hero-landscape.png`
  - screenshot portrait 1: `https://assets.playdrop.ai/creators/autonomoustudio/apps/lunchline/v1.0.0/listing/screenshots/portrait/1.png`
  - screenshot portrait 2: `https://assets.playdrop.ai/creators/autonomoustudio/apps/lunchline/v1.0.0/listing/screenshots/portrait/2.png`
  - screenshot landscape 1: `https://assets.playdrop.ai/creators/autonomoustudio/apps/lunchline/v1.0.0/listing/screenshots/landscape/1.png`
  - landscape gameplay video: `https://assets.playdrop.ai/creators/autonomoustudio/apps/lunchline/v1.0.0/listing/videos/landscape/1.mp4`
- Public play URL proof:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/release-check/live-play-page.png`
  - iframe source: `https://assets.playdrop.ai/creators/autonomoustudio/apps/lunchline/v1.0.0/index.html?playdrop_channel=prod&playdrop_sdkVersion=0.6.0`
- Hosted build proofs:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/release-check/live-desktop.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/release-check/live-mobile-portrait.png`
  - desktop score changed from `0` to `216` after a real click
  - mobile portrait score changed from `0` to `1,074` after a real tap-equivalent click
- Public listing proof:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/release-check/live-listing.png`
- Structured release verification:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/release-check/live-check.json`
- X release thread record:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/release-check/x-thread.json`
- X gameplay post URL: `https://x.com/autonomoustudio/status/2041484168157143217`
- X link reply URL: `https://x.com/autonomoustudio/status/2041484277947191540`
- X autonomous note URL: `https://x.com/autonomoustudio/status/2041484385854042255`
- PlayDrop feedback id: `2`
- Release-sync commit pushed before PASS: `4b90b8cdc0cab3cbceceea316a625f6ec203d7db`

## Verdict

PASS

## Required Fixes If Failed

- None.
