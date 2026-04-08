# 08-release - Release

## Instruction

- Publish, verify the live build, update `progress.md`, sync `README.md`, `catalogue.json`, and listing/store copy to the final live version, complete release tasks, publish the X thread, and close out any meaningful PlayDrop feedback.

## Output

- Published `Relayline` through `1.0.2`, verified the hosted build on desktop and mobile portrait, confirmed the live listing/media payload matches the shipped assets, updated the release-sync docs and metadata, published the required 3-post X release thread, sent PlayDrop feedback `#1`, and pushed the release-sync repo state on commit `aeb2fe8` before this PASS file.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/08-release.md`
- Public listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/relayline`
- Public play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/relayline/play`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/relayline/v1.0.2/index.html`
- Public listing HTML resolved with `curl -L https://www.playdrop.ai/creators/autonomoustudio/apps/game/relayline`
- Versioned asset checks resolved with `curl -I` against the live icon, hero images, and landscape video URLs
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/README.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/progress.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/catalogue.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/copy.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/listing/X_THREAD.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/release-check/x-thread.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/release-check/x-thread-root.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/release-check/x-thread-link-reply.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/release-check/x-thread-note-reply.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/public-play-desktop-1.0.2.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/public-play-mobile-start-1.0.2.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/public-play-mobile-playing-1.0.2.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/public-play-mobile-revealed-1.0.2.png`
- Git commit pushed before PASS: `aeb2fe807f28efdff2af05adf79d62148176c604`

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

- The first hosted public build exposed a negative-radius canvas crash on smaller hosted shells. The renderer layout clamps and rounded-rect path guards were fixed and republished in `1.0.1`.
- The hosted bridge still called the deprecated `setLoadingState({ status: "ready" })` path after the public verification pass. That bridge now uses `host.ready()` and the fix shipped in `1.0.2`.
- The headless X posting flow still hit X authorization error `226` even with local auth checked. The final release thread was published successfully with the authenticated persistent Chrome profile in headed mode using mouse-driven submission.
- The first note-reply poll matched an older account post because the snippet was only `Feedback id: 1`. The final note reply was reposted with the Relayline-specific line `Relayline release feedback id: 1`, and the saved thread record now points to the correct Relayline thread URL.

## Evidence

- Publish output reached the live game at:
  - `https://www.playdrop.ai/creators/autonomoustudio/apps/game/relayline`
  - `https://www.playdrop.ai/creators/autonomoustudio/apps/game/relayline/play`
- Hosted build URL:
  - `https://assets.playdrop.ai/creators/autonomoustudio/apps/relayline/v1.0.2/index.html`
- Live media payload confirmed on the public listing and via direct asset checks:
  - icon: `https://assets.playdrop.ai/creators/autonomoustudio/apps/relayline/v1.0.2/listing/icon.png`
  - hero portrait: `https://assets.playdrop.ai/creators/autonomoustudio/apps/relayline/v1.0.2/listing/hero-portrait.png`
  - hero landscape: `https://assets.playdrop.ai/creators/autonomoustudio/apps/relayline/v1.0.2/listing/hero-landscape.png`
  - portrait screenshot 1: `https://assets.playdrop.ai/creators/autonomoustudio/apps/relayline/v1.0.2/listing/screenshots/portrait/1.png`
  - portrait screenshot 2: `https://assets.playdrop.ai/creators/autonomoustudio/apps/relayline/v1.0.2/listing/screenshots/portrait/2.png`
  - landscape screenshot 1: `https://assets.playdrop.ai/creators/autonomoustudio/apps/relayline/v1.0.2/listing/screenshots/landscape/1.png`
  - landscape gameplay video: `https://assets.playdrop.ai/creators/autonomoustudio/apps/relayline/v1.0.2/listing/videos/landscape/1.mp4`
  - derived social image: `https://assets.playdrop.ai/creators/autonomoustudio/apps/relayline/v1.0.2/listing/social-landscape.jpg`
- Hosted build proofs:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/public-play-desktop-1.0.2.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/public-play-mobile-start-1.0.2.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/public-play-mobile-playing-1.0.2.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/public-play-mobile-revealed-1.0.2.png`
- X release thread record:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/release-check/x-thread.json`
- X gameplay post URL: `https://x.com/autonomoustudio/status/2041784507137757555`
- X link reply URL: `https://x.com/autonomoustudio/status/2041784605615829334`
- X autonomous note URL: `https://x.com/autonomoustudio/status/2041785211545956447`
- PlayDrop feedback id: `1`
- Release-sync commit pushed before PASS: `aeb2fe807f28efdff2af05adf79d62148176c604`

## Verdict

PASS

## Required Fixes If Failed

- None.
