Original prompt: Create and publish a new game using $playdrop skill.

2026-03-30 08:18 EDT
- Chosen concept: `Wordbraid`, a portrait-first word arcade game about braiding 3-to-5-letter words off a live five-ribbon loom before ink reaches the front and jams the press.
- Workspace path: `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid`
- Early release checks:
  - PlayDrop auth confirmed with `playdrop auth whoami` as `autonomoustudio (prod)`.
  - Local release auth sources confirmed in `/Users/oliviermichon/Documents/autonomoustudio-internal/.env` for PlayDrop and X.
  - Reusable X browser profile confirmed at `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/x-profile`.
- Major implementation notes:
  - Built deterministic board generation and safe-commit validation so invalid braids that would stall the loom are rejected before submit.
  - Added scripted balance sweeps with idle, casual, and expert policies. Current report passes the target window with casual median `96.6s`, expert median `364.8s`, and expert p25 `364.8s`.
  - Added deterministic media capture tooling in `scripts/capture-media.mjs` for the final screenshots and gameplay MP4.
- Gate status:
  - `00-preflight` through `07-listing-media` are currently PASS in `gates/`.
- Release sync status before publish:
  - Updated `catalogue.json` to include the shipped listing family and the full how-to-play description used for the live listing.
  - `README.md` still needs the final live PlayDrop URL and X thread URL after release.
  - `08-release` is still pending publish, live verification, X posting, README sync, and final repo push order.

TODO
- Publish `autonomoustudio/app/wordbraid` version `1.0.0`.
- Verify the public listing plus hosted build on desktop and mobile portrait.
- Post the required 3-post X thread with the landscape gameplay video first.
- Update `README.md` and this file with the live URLs, verification commands, feedback ids, and final release notes.

2026-03-30 08:59 EDT
- Published `autonomoustudio/app/wordbraid` version `1.0.0`.
- Immediate release check found two platform issues:
  - `playdrop project publish .` returned repeated `HTTP 413` failures until `listing/` was excluded from the source zip via `.playdropignore`, while the same listing assets were still uploaded separately from `catalogue.json`.
  - The public PlayDrop `/play` route showed a sign-in wall because the app shell defaulted to `authMode: REQUIRED`, even though `Wordbraid` does not need account login.
- Corrective release:
  - Bumped the live release to `1.0.1`.
  - Set `authMode` to `OPTIONAL`.
  - Kept the shipped listing family and screenshots live while removing the gameplay MP4 from the PlayDrop listing payload; the MP4 is still used for the X launch post and release evidence.
- Verification commands and results:
  - `playdrop detail autonomoustudio/app/wordbraid --json`
    - Confirmed `currentVersion: 1.0.1`, `authMode: OPTIONAL`, hosted asset URL, and the live icon/hero/screenshot URLs.
  - `playdrop versions browse autonomoustudio/app/wordbraid`
    - Confirmed `1.0.1` is `public` and `current`.
  - `node scripts/verify-release.mjs`
    - Verified the hosted build on desktop and mobile portrait by starting real runs and committing a real word on each surface.
    - Captured:
      - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check/desktop.png`
      - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check/mobile-portrait.png`
      - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check/listing-public.png`
      - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check/verification.json`
  - Public PlayDrop play-route check:
    - Captured `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check/play-page-public.png`
    - Confirmed the sign-in wall is gone and the public `/play` route now renders the game shell iframe.
- X release thread:
  - Root gameplay post: `https://x.com/autonomoustudio/status/2038600004554650072`
  - Game-link reply: `https://x.com/autonomoustudio/status/2038600111685546151`
  - Autonomous-AI + feedback reply: `https://x.com/autonomoustudio/status/2038601755693318182`
  - Thread evidence:
    - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check/x-thread-root.png`
    - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check/x-thread-link-reply.png`
    - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check/x-thread-note-reply.png`
    - `/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check/x-thread.json`
- PlayDrop feedback:
  - Sent feedback `39`: `Publish bundle duplication and auth default friction`
- Release URLs:
  - Listing: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/wordbraid`
  - Play: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/wordbraid/play`
  - Hosted build: `https://assets.playdrop.ai/creators/autonomoustudio/apps/wordbraid/v1.0.1/index.html`

TODO
- None.
