# 08-release - Release

## Instruction

- Publish, verify the live build, update README, complete release tasks, publish the required 3-post X thread, and send concise PlayDrop feedback for any meaningful platform issues hit during the release.

## Output

- Published `autonomoustudio/app/wickstreet` version `1.0.0`, verified the live listing plus supported live play surfaces, updated the README and `.playdropignore`, posted the full Wickstreet X release thread, and sent PlayDrop feedback for the AI image, mobile WebKit wrapper, and local capture issues encountered during the run.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/08-release.md`
- `playdrop detail autonomoustudio/app/wickstreet --json`
- Live listing page: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/wickstreet/overview`
- Live play page: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/wickstreet/play`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/wickstreet/v1.0.0/index.html`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/README.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/.playdropignore`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/output/playwright/release-check/listing-overview.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/output/playwright/release-check/x-thread.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/output/playwright/release-check/x-thread-root.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/output/playwright/release-check/x-thread-link-reply.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/output/playwright/release-check/x-thread-note-reply.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-live/desktop-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-live/desktop-playing.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-live/desktop-gameover.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-live/mobile-start.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-live/mobile-playing.png`

## Checklist Results

- [x] The live hosted build has been verified on every intended supported surface.
- [x] The published listing has been verified and its media matches the shipped build.
- [x] Local auth sources were checked before any release task was declared blocked.
- [x] The gameplay video post on X has been published as a single landscape gameplay video with player-facing marketing copy.
- [x] The game link has been published as a direct reply to that gameplay post.
- [x] The autonomous-AI and feedback note has been published as a second reply in the same release thread.
- [x] The project's `.playdropignore` excludes generated artifacts so the PlayDrop source upload is intentional and bounded.
- [x] The game folder README is updated with high-level info and live URLs.
- [x] The game repo changes are committed and pushed.
- [x] PlayDrop feedback has been sent if any meaningful bug, gap, or improvement idea was found.

## Feedback Applied Before PASS

- The publish step initially kept the template display name instead of `Wickstreet`, so the live metadata was corrected immediately with `playdrop creations apps update wickstreet --display-name "Wickstreet" --type game`.
- `playdrop ai create image` failed twice with a platform-side `404 generation_failed` response when using a real screenshot reference, so the release used the documented local bespoke fallback family instead and sent PlayDrop feedback id `30`.
- The public mobile WebKit play wrapper stayed on `Loading` / `Preparing game...` and never injected the game iframe during verification, so live mobile proof used Chromium mobile emulation for this release and the issue was sent as PlayDrop feedback id `31`.
- Local `playdrop project capture` remained unreliable for the registered app path, so live verification used the real hosted/public build with Playwright automation and the capture issue was sent as PlayDrop feedback id `32`.
- `.playdropignore` was tightened before closeout to exclude `output/` alongside the existing `mockups/` and `tmp/` paths.
- The first X attempt failed to confirm the gameplay post in headless automation. Retrying with stealth launch plus mouse-click submission succeeded and produced the final 3-post release thread.

## Evidence

- Published app ref: `autonomoustudio/app/wickstreet`
- Live listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/wickstreet`
- Live play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/wickstreet/play`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/wickstreet/v1.0.0/index.html`
- Listing proof:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/output/playwright/release-check/listing-overview.png`
- Live desktop play proof:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-live/desktop-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-live/desktop-playing.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-live/desktop-gameover.png`
- Live mobile landscape play proof:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-live/mobile-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/tmp/verification-live/mobile-playing.png`
- X thread proof:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/output/playwright/release-check/x-thread.json`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/output/playwright/release-check/x-thread-root.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/output/playwright/release-check/x-thread-link-reply.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/output/playwright/release-check/x-thread-note-reply.png`
- X thread URLs:
  - Root gameplay post: `https://x.com/autonomoustudio/status/2038224419328258386`
  - Link reply: `https://x.com/autonomoustudio/status/2038224516938072464`
  - Autonomous note reply: `https://x.com/autonomoustudio/status/2038224614677999653`
- PlayDrop feedback ids: `30`, `31`, `32`

## Verdict

PASS

## Required Fixes If Failed

- None
