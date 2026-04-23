# 08-release - Release

## Instruction

- Publish, verify the live build, sync `README.md`, `progress.md`, `catalogue.json`, and listing copy to the final live version, complete the X release thread, send PlayDrop feedback for meaningful release-path issues, and close the release against the already-pushed release-sync repo state.

## Output

- Published `autonomoustudio/app/powder-post` version `1.0.0`, verified the hosted build on desktop and mobile landscape, confirmed the public listing and media match the shipped build, synced the release docs and metadata, published the required 3-post X release thread, sent PlayDrop feedback `#1`, and pushed the release-sync repo state on commit `65083a9f6050802bf5577141abc862a3b5b4aaba` before this PASS file.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/08-release.md`
- Public listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/powder-post`
- Public play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/powder-post/play`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/powder-post/v1.0.0/index.html`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/README.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/progress.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/X_THREAD.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/release-check/x-thread.json`
- Git commit pushed before PASS: `65083a9f6050802bf5577141abc862a3b5b4aaba`

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

- `playdrop project capture .` still reproduced a hosted `/dev` `404` while the local `playdrop project dev .` router worked, so the release verification relied on the public creator URLs plus the direct hosted bundle and the issue was reported in PlayDrop feedback `#1`.
- `playdrop ai create image` could not reach the PlayDrop AI API during listing prep, so the shipped hero and icon family used the documented local fallback generated from real gameplay screenshots. That failure was also reported in PlayDrop feedback `#1`.
- The authenticated headless X posting path still hit X authorization error `226`. The final release thread was published successfully with the same authenticated Chrome profile in headed mode using mouse-driven submission, and the resulting thread URLs were recorded in the repo evidence.

## Evidence

- Published app ref: `autonomoustudio/app/powder-post`
- Live listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/powder-post`
- Live play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/powder-post/play`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/powder-post/v1.0.0/index.html`
- Live listing media confirmed from the public page source:
  - icon: `https://assets.playdrop.ai/creators/autonomoustudio/apps/powder-post/v1.0.0/listing/icon.png`
  - hero portrait: `https://assets.playdrop.ai/creators/autonomoustudio/apps/powder-post/v1.0.0/listing/hero-portrait.png`
  - hero landscape: `https://assets.playdrop.ai/creators/autonomoustudio/apps/powder-post/v1.0.0/listing/hero-landscape.png`
  - screenshot 1: `https://assets.playdrop.ai/creators/autonomoustudio/apps/powder-post/v1.0.0/listing/screenshots/landscape/1.png`
  - screenshot 2: `https://assets.playdrop.ai/creators/autonomoustudio/apps/powder-post/v1.0.0/listing/screenshots/landscape/2.png`
  - landscape gameplay video: `https://assets.playdrop.ai/creators/autonomoustudio/apps/powder-post/v1.0.0/listing/videos/landscape/1.mp4`
- Hosted build proofs:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/release-check/live-desktop.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/release-check/live-mobile-landscape.png`
- Public listing proof:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/release-check/live-listing.png`
- X release thread record:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/release-check/x-thread.json`
- X gameplay post URL: `https://x.com/autonomoustudio/status/2041127706734002271`
- X link reply URL: `https://x.com/autonomoustudio/status/2041127815538500083`
- X autonomous note URL: `https://x.com/autonomoustudio/status/2041127924540092649`
- PlayDrop feedback id: `1`
- Release-sync commit pushed before PASS: `65083a9f6050802bf5577141abc862a3b5b4aaba`

## Verdict

PASS

## Required Fixes If Failed

- None.
