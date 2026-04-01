# 08-release - Release

## Instruction

- Publish the current live version, verify the public listing and public play shell on every intended surface, sync repo metadata and listing media to the live app, and only pass once the release-sync repo state has already been committed and pushed without this final gate file update.

## Output

- live PlayDrop release for `Shardlight` version `1.0.1`
- updated `progress.md` and `README.md` synced to the live app
- pushed release-sync repo state at commit `02fff5903a51f7b0877b903ab0c7eb0be7fbe7af`
- refreshed listing screenshots/video for the fixed build
- final updated `gates/08-release.md` PASS file

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/NEW_GAME_WORKFLOW.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/V1_GATE_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/08-release.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/.env`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/.playdropignore`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/store-copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/README.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/progress.md`
- `playdrop detail autonomoustudio/app/shardlight --json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/review-now/live-1.0.1/listing.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/review-now/live-1.0.1/play-shell.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/review-now/live-1.0.1/play-shell-portrait.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/review-now/live-1.0.1/hosted.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/review-now/live-1.0.1/hosted-portrait.png`

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

- The initial `1.0.0` release shipped with two public-facing issues: the play shell was gated behind account creation because auth metadata was omitted, and the desktop chamber grid collapsed to content height so the board looked like a mostly empty brown panel.
- I fixed the metadata by setting `authMode: "OPTIONAL"` and `previewable: true`, fixed the chamber layout by anchoring `.board` to the stage bounds, refreshed the canonical screenshots and gameplay video from the repaired build, and republished as `1.0.1`.
- No fresh X release thread was posted for `1.0.1` because this was a routine accessibility/layout patch rather than a marketed major update. `progress.md` records that decision explicitly.

## Evidence

- Live PlayDrop URLs:
  - listing: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/shardlight`
  - play page: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/shardlight/play`
  - hosted build: `https://assets.playdrop.ai/creators/autonomoustudio/apps/shardlight/v1.0.1/index.html`
- Live verification:
  - `playdrop detail autonomoustudio/app/shardlight --json`
  - listing proof: `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/review-now/live-1.0.1/listing.png`
  - public play proof desktop: `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/review-now/live-1.0.1/play-shell.png`
  - public play proof portrait: `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/review-now/live-1.0.1/play-shell-portrait.png`
  - hosted proof desktop: `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/review-now/live-1.0.1/hosted.png`
  - hosted proof portrait: `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/output/review-now/live-1.0.1/hosted-portrait.png`
- Listing media refreshed for the repaired build:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/shardlight_1280x720-screenshot-1.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/shardlight_720x1280-screenshot-1.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/shardlight_720x1280-screenshot-2.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/shardlight/listing/shardlight_1280x720-recording.mp4`
- Repo sync:
  - pushed release-sync commit before this gate: `02fff5903a51f7b0877b903ab0c7eb0be7fbe7af`
- Prior PlayDrop feedback still applies:
  - feedback id `43`: `Dev-shell capture never loads local iframe`

## Verdict

PASS

## Required Fixes If Failed

- None
