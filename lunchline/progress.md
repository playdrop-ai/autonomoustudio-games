Original prompt: Automation: New game. Create and publish a new game using the `@playdrop` plugin, follow `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/NEW_GAME_WORKFLOW.md` exactly, and do not advance a gate until the current step has a final PASS file in `gates/`.

Workspace paths:
- Internal workflow repo: `/Users/oliviermichon/Documents/autonomoustudio-internal`
- Games repo: `/Users/oliviermichon/Documents/autonomoustudio-games`
- Game folder: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline`

Current concept: `Lunchline`

Early blockers:
- None for planning. The local `.env`, PlayDrop auth, X auth sources, Playwright, and FFmpeg are all present.
- `playdrop project create app lunchline --template playdrop/template/typescript_template` created the usable scaffold but returned non-zero because the games repo root `catalogue.json` intentionally stays `{}`.
- A follow-up `playdrop project create app lunchline` inside the game folder could not reuse the app yet because `dist/index.html` does not exist. Remote registration will be rechecked after the first real build.

2026-04-07
- Reviewed the gated workflow, skill-routing map, concept kill criteria, planning guidelines, and the `00` through `03` checklists in the internal workflow repo.
- Checked the local `.env` key names first and confirmed `PLAYDROP_API_KEY`, `X_HANDLE`, and `X_PASSWORD` are present before any release-blocker claim.
- Confirmed PlayDrop auth with `playdrop auth whoami`, which resolved to `autonomoustudio (prod)`.
- Fetched both repos with `git fetch --prune` and confirmed there is no local drift blocking a new project.
- Confirmed verification and capture tooling with `npx playwright --version`, `ffmpeg -version`, and `playdrop project capture --help`.
- Reviewed the human taste notes in `/Users/oliviermichon/Documents/autonomoustudio-internal/freeform/GAME_IDEAS.md`.
- Reviewed the current shipped studio catalog from the local games repo so the new idea does not repeat existing lanes like fishing timing, higher-or-lower card chaining, fruit bubble popping, flower routing, row-and-column shrine matching, downhill slalom, or portrait rhythm.
- Reviewed public PlayDrop references and packs through `@playdrop game-planning` and `@playdrop asset-discovery`, including `playdrop browse --kind app --app-type game --limit 20 --json`, `playdrop detail playdrop/app/flapmoji --json`, `playdrop detail playdrop/app/pool-game --json`, and `playdrop detail playdrop/asset-pack/food-kit-repack --json`.
- Reviewed the local clone index in `/Users/oliviermichon/Documents/osgameclones` for `SameGame` and `Clickomania!` as the proven loop reference behind the final concept.
- Rejected weaker directions before locking the folder:
  - `Sudoku` felt too close to a pure clone and too dependent on polish alone.
  - A fishing concept overlapped too much with `Drifthook`.
  - A word/emoji solitaire concept stayed too close to wrapper-only differentiation and the existing card lane.
- Locked `Lunchline` as a portrait-first lunch-rush cluster puzzle: tap connected ingredient groups to fill one visible lunchbox order before the shift racks up complaints.
- Created the scaffolded PlayDrop TypeScript app folder and the per-game workflow folders (`gates/`, `listing/`, `mockups/`, `output/`, `tmp/`, `tests/`, `scripts/`).
- Wrote and passed `IDEA.md`, `SPECS_v1.md`, and `SIMPLIFY_v1.md` with the v1 locked to one active order, four ingredient families, three complaint lives, and no meta systems beyond best-score persistence.
- Used `@playdrop gameplay-mockups` plus `@game-studio game-ui-frontend` to create a responsive single-file gameplay mockup surface at `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/mockups/lunchline-mockup.html`.
- Captured reviewed browser-rendered mockups for start, gameplay, and game-over on both portrait `720x1280` and desktop `1280x720` into `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/mockup-review/`.
- The mockup pass confirmed two useful cuts before implementation:
  - no persistent combo or streak widget in the live HUD
  - desktop support keeps the same portrait-first board centered in a wider stage instead of inventing a separate landscape gameplay layout
- Release update
  - Passed `gates/05-implementation.md`, `gates/06-gameplay-v1.md`, and `gates/07-listing-media.md`.
  - Final listing media was captured from the current shipped build with:
    - `node scripts/capture-media.mjs`
    - `node scripts/export-listing-art.mjs`
  - The PlayDrop-first hero path was retried with three `playdrop ai create image` requests and all failed with `Could not reach the Playdrop AI API.` The exact prompts and CLI options are preserved in `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/ai-art/jobs-image-20260407.json`.
  - Publish attempt one failed on a real listing constraint: `icon_too_large` because `listing/icon.png` exceeded the `512KB` upload limit. I patched `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/scripts/export-listing-art.mjs` to quantize the exported icon with `pngquant`, re-exported the family, and the second publish succeeded.
  - Published `autonomoustudio/lunchline` version `1.0.0`.
  - Live URLs:
    - Listing: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/lunchline`
    - Play: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/lunchline/play`
    - Hosted build: `https://assets.playdrop.ai/creators/autonomoustudio/apps/lunchline/v1.0.0/index.html`
  - Verification commands used:
    - `npm run validate`
    - `playdrop project validate .`
    - `playdrop project publish .`
    - `node scripts/release-check.mjs`
    - `playdrop feedback send --title "Lunchline release: AI image endpoint unreachable" ... --json`
    - `HEADLESS=false CLICK_MODE=mouse node scripts/post-x-thread.mjs`
  - Verification results:
    - The public listing page resolved, showed the shipped name and description, and published the expected icon, hero, screenshot, video, and social asset URLs in the public HTML payload.
    - The public play URL resolved to the expected hosted iframe source: `https://assets.playdrop.ai/creators/autonomoustudio/apps/lunchline/v1.0.0/index.html?playdrop_channel=prod&playdrop_sdkVersion=0.6.0`.
    - The direct hosted build rendered and accepted a real scored move on both intended supported surfaces:
      - desktop score changed from `0` to `216`
      - mobile portrait score changed from `0` to `1,074`
    - No game runtime console errors appeared during the hosted desktop or mobile checks. The only recorded browser noise was an unrelated public-page `401` while loading non-game site assets.
  - Evidence:
    - Release check JSON: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/release-check/live-check.json`
    - Live listing screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/release-check/live-listing.png`
    - Live play page screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/release-check/live-play-page.png`
    - Live desktop screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/release-check/live-desktop.png`
    - Live mobile screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/release-check/live-mobile-portrait.png`
    - X thread record: `/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/output/playwright/release-check/x-thread.json`
  - X release thread:
    - gameplay post: `https://x.com/autonomoustudio/status/2041484168157143217`
    - game link reply: `https://x.com/autonomoustudio/status/2041484277947191540`
    - autonomous note reply: `https://x.com/autonomoustudio/status/2041484385854042255`
  - PlayDrop feedback:
    - feedback id: `2`
    - title: `Lunchline release: AI image endpoint unreachable`
