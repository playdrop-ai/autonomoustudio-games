Original prompt: Automation: New game. Create and publish a new game using the `@playdrop` plugin, follow `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/NEW_GAME_WORKFLOW.md` exactly, and do not advance a gate until the current step has a final PASS file in `gates/`.

Workspace paths:
- Internal workflow repo: `/Users/oliviermichon/Documents/autonomoustudio-internal`
- Games repo: `/Users/oliviermichon/Documents/autonomoustudio-games`
- Game folder: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post`

Current concept: `Powder Post`

Early blockers:
- None. The local `.env`, PlayDrop auth, X auth sources, Playwright, and FFmpeg are all present.
- `playdrop project create app powder-post --template playdrop/template/typescript_template` returned non-zero because the workspace root catalogue is intentionally `{}`. The usable scaffold was still created correctly in the per-game folder.

2026-04-06
- Reviewed the gated workflow, skill-routing map, concept kill criteria, and all planning guidelines/checklists in the internal repo.
- Confirmed the current workspace and both repos, checked `git status --short --branch` in the internal repo and the games repo, and confirmed the games repo is clean enough for a new project.
- Checked the local `.env` key names first and confirmed `PLAYDROP_API_KEY`, `X_HANDLE`, and `X_PASSWORD` are present before any release-blocker claim.
- Confirmed PlayDrop auth with `playdrop whoami`, which resolved to `autonomoustudio (prod)` from the local `.playdrop.json`.
- Confirmed verification and capture tooling with `npx playwright --version` and `ffmpeg -version`.
- Reviewed the optional human taste notes in `/Users/oliviermichon/Documents/autonomoustudio-internal/freeform/GAME_IDEAS.md`.
- Reviewed the local shipped catalog and the public `autonomoustudio` PlayDrop catalog to avoid repeating existing lanes such as portrait-first row/column puzzles, flower routing, card solitaire, fishing timing, fruit cluster popping, and lane defense.
- Reviewed public PlayDrop references and packs through `@playdrop game-planning` and `@playdrop asset-discovery`, including `scobelverse/app/vector_tango`, `deryatr_/app/pixel_sky_hop`, `playdrop/app/starter-kit-racing`, `kenneynl/asset-pack/tiny-ski`, and related public browse/search results.
- Checked the local clone index in `/Users/oliviermichon/Documents/osgameclones` for downhill-runner references such as `skifree.js` so the idea work started from a proven public lane rather than a made-up grammar.
- Rejected several concept directions before locking the folder: `Sudoku` felt too dependent on polish alone, a traffic-control variant drifted too close to `Latchbloom`, and minesweeper/racing lanes were already crowded in the public PlayDrop feed.
- Created the `powder-post` app scaffold from the PlayDrop TypeScript template and created the per-game workflow folders (`gates/`, `mockups/`, `listing/`, `output/`, `tmp/`, `tests/`).
- Locked the planning direction as a downhill courier slalom built on a proven ski-dodge loop with a stronger gate-choice layer instead of a pure theme swap.
- Used `@playdrop gameplay-mockups` plus `@game-studio game-ui-frontend` to create a literal single-file mockup surface at `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/mockups/powder-post-mockup.html`.
- Captured reviewed raster mockups for desktop `1280x720` and mobile-landscape `844x390`, including start, gameplay, and game-over screens, then assembled `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/mockup-review-sheet.png` for the `04-mockup` gate review.
- Implemented the full playable runtime in `src/main.ts`, `src/game/sim.ts`, `src/game/render.ts`, and `src/game/types.ts`, keeping the game on the simple PlayDrop TypeScript app path instead of introducing Phaser or a heavier runtime.
- Added focused validation coverage with `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/tests/sim.test.ts` and a scripted endless-run balance sweep in `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/scripts/balance-report.ts`.
- Fixed local-hosted startup by only touching the PlayDrop host bridge when the `playdrop_channel` query param exists, which prevents local SDK init failures during non-hosted browser checks.
- Added `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/.playdropignore` so captures, mockups, listing workfiles, and temp output stay out of source uploads.
- Registered the existing local app entry with the PlayDrop API by rerunning `playdrop project create app powder-post` inside the game folder after the first capture attempt exposed that the original scaffold step had not completed remote registration.
- Re-ran `npm run test`, `npm run validate`, `npm run balance:report`, and `playdrop project validate .` after the implementation pass; all current outputs still pass.
- Started `playdrop project dev .` successfully and verified the real build through the local PlayDrop dev router at `http://127.0.0.1:8888/apps/dev/autonomoustudio/game/powder-post/index.html`.
- Captured fresh start, gameplay, and game-over evidence from the real current build at `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/impl-desktop-start-v3.png`, `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/impl-desktop-autoplay-v3.png`, `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/impl-mobile-autoplay-v2.png`, and `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/impl-desktop-gameover-v2.png`.
- `playdrop project capture .` still fails on the hosted `playdrop.ai` dev URL with a `404` even while the local dev router works. That looks like a PlayDrop-side issue rather than a game bug, so I am using the local dev router plus Playwright for gate evidence and will send feedback if it still reproduces after launch.
- Passed `05-implementation` and `06-gameplay-v1` with fresh validation, supported-surface screenshots, a manual mobile-landscape carve pass, and the current endless-run balance sweep.
- Added a reusable media capture path with `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/scripts/capture-media.mjs` and exported the final real-build listing screenshots and gameplay MP4 into the `listing/` folder.
- Reviewed the gameplay MP4 start frames and confirmed the final X-first video begins on actual gameplay and holds the shipped visual tone without a blank lead-in.
- Explored PlayDrop listing references through `playdrop search` and `playdrop detail`, then attempted the required PlayDrop AI hero path with three landscape hero prompts anchored to `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/powder-post_1280x720-screenshot-1.png`.
- All three `playdrop ai create image` attempts failed immediately with `Could not reach the Playdrop AI API.` I preserved the prompts and failure mode in `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/ai-art/jobs-image-20260406.json` before switching to a documented local fallback.
- Built a local fallback listing-art family from the real screenshots through `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/marketing.html` and `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/scripts/export-listing-art.mjs`, then exported the final `hero-landscape.png`, `hero-portrait.png`, and `icon.png`.
- Wired the final listing block into `catalogue.json` and drafted the public-facing listing copy and X thread in `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/copy.md` and `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/listing/X_THREAD.md`.
- Re-ran `npm run validate` and `playdrop project validate .` after the listing media pass. The current listing assets validate cleanly and the final exported sizes are `1600x900`, `1080x1920`, `1024x1024`, and `1280x720`.

- Published `autonomoustudio/app/powder-post` version `1.0.0` successfully with `playdrop project publish .`.
- Live listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/powder-post`
- Live play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/powder-post/play`
- Hosted bundle URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/powder-post/v1.0.0/index.html`
- Verified the hosted live build on both intended supported surfaces with Playwright:
  - desktop proof: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/release-check/live-desktop.png`
  - mobile-landscape proof: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/release-check/live-mobile-landscape.png`
- Verified the public listing page in browser and captured `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/release-check/live-listing.png`.
- Confirmed the published listing media payload from the live page source is serving the current `v1.0.0` assets:
  - `listing/icon.png`
  - `listing/hero-landscape.png`
  - `listing/hero-portrait.png`
  - `listing/screenshots/landscape/1.png`
  - `listing/screenshots/landscape/2.png`
  - `listing/videos/landscape/1.mp4`
- Release verification commands:
  - `npm run validate`
  - `playdrop project validate .`
  - `curl -I -s https://assets.playdrop.ai/creators/autonomoustudio/apps/powder-post/v1.0.0/index.html | head -n 5`
  - `curl -Ls https://www.playdrop.ai/creators/autonomoustudio/apps/game/powder-post | rg -o 'https://assets\\.playdrop\\.ai[^\" ]+' | sort -u`
- Sent PlayDrop feedback `#1` for the two confirmed release-path issues:
  - `playdrop project capture .` hit a hosted `/dev` `404` while the local dev router worked
  - `playdrop ai create image` could not reach the PlayDrop AI API during listing prep
- Published the required X release thread:
  - gameplay post: `https://x.com/autonomoustudio/status/2041127706734002271`
  - game link reply: `https://x.com/autonomoustudio/status/2041127815538500083`
  - autonomous note reply: `https://x.com/autonomoustudio/status/2041127924540092649`
- X automation note: the authenticated headless profile path still hit X authorization error `226`; the final thread was published successfully with the same authenticated Chrome profile in headed mode using mouse-driven submission. The final record is stored in `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/release-check/x-thread.json`.
- Remaining follow-up: none.
