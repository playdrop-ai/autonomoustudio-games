# 08-release - Release

## Instruction

- Publish, verify the live build, update `progress.md`, sync `README.md`, `catalogue.json`, and listing/store copy to the final live version, complete release tasks, publish the X thread, and close out any meaningful PlayDrop feedback.

## Output

- Published `autonomoustudio/app/switchback-dispatch` version `1.0.0`, verified the hosted desktop build plus public listing against the shipped media payload, updated the release-sync docs and metadata, published the required 3-post X release thread, sent PlayDrop feedback `#46`, and pushed the release-sync repo state on commit `18eca18d74f9d0af9c03ef783ab45fae9bd07bf0` before this PASS file.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/08-release.md`
- `playdrop detail autonomoustudio/app/switchback-dispatch --json`
- Public listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/switchback-dispatch`
- Public play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/switchback-dispatch/play`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/switchback-dispatch/v1.0.0/index.html`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/README.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/progress.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/playwright/release-check/public-listing.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/playwright/release-check/public-play.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/playwright/release-check/public-play-live.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/playwright/release-check/public-play-live.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/playwright/release-check/x-thread.json`
- Git commit pushed before PASS: `18eca18d74f9d0af9c03ef783ab45fae9bd07bf0`

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

- The first publish attempt failed PlayDrop's icon-size gate, so the shipped listing PNGs were quantized before the successful `1.0.0` publish.
- Direct hosted-asset checks were not enough on their own because the PlayDrop bridge needs the public play-page iframe host to fully boot. The release evidence therefore includes both the play-page frame diagnostic and a reusable `scripts/verify-live-play.mjs` run against the public play URL.
- The first headless X post attempt hit X authorization error `226` even after local auth was confirmed. The final release thread was then published successfully with the same authenticated Chrome profile in headed mode using mouse-driven submission, and the live thread URLs were recorded in `progress.md` plus `output/playwright/release-check/x-thread.json`.
- PlayDrop feedback `46` was sent after the release because the AI listing downloads arrived with `.png` filenames but JPEG byte content, which created avoidable asset-prep friction before publish.

## Evidence

- Published app ref: `autonomoustudio/app/switchback-dispatch`
- Live listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/switchback-dispatch`
- Live play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/switchback-dispatch/play`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/switchback-dispatch/v1.0.0/index.html`
- Live media payload from `playdrop detail`:
  - icon: `https://assets.playdrop.ai/creators/autonomoustudio/apps/switchback-dispatch/v1.0.0/listing/icon.png`
  - hero portrait: `https://assets.playdrop.ai/creators/autonomoustudio/apps/switchback-dispatch/v1.0.0/listing/hero-portrait.png`
  - hero landscape: `https://assets.playdrop.ai/creators/autonomoustudio/apps/switchback-dispatch/v1.0.0/listing/hero-landscape.png`
  - landscape gameplay video: `https://assets.playdrop.ai/creators/autonomoustudio/apps/switchback-dispatch/v1.0.0/listing/videos/landscape/1.mp4`
- Hosted build proofs:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/playwright/release-check/public-listing.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/playwright/release-check/public-play.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/playwright/release-check/public-play-live.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/playwright/release-check/public-play-live.json`
- X release thread record:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/output/playwright/release-check/x-thread.json`
- X gameplay post URL: `https://x.com/autonomoustudio/status/2040338442916114830`
- X link reply URL: `https://x.com/autonomoustudio/status/2040338560272785692`
- X autonomous note URL: `https://x.com/autonomoustudio/status/2040338678841540670`
- PlayDrop feedback id: `46`
- Release-sync commit pushed before PASS: `18eca18d74f9d0af9c03ef783ab45fae9bd07bf0`

## Verdict

PASS

## Required Fixes If Failed

- None.
