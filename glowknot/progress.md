Original prompt: Create and publish a new game using the canonical gated workflow in `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/NEW_GAME_WORKFLOW.md`, ending with a live PlayDrop release, final PASS gates `00` through `08`, repo sync, and the required X release thread.

2026-03-31
- Created the registered PlayDrop project folder `/Users/oliviermichon/Documents/autonomoustudio-games/glowknot` from `playdrop/template/typescript_template`.
- Confirmed the games repo root `catalogue.json` still stays `{}` and that `Glowknot` will live as a self-contained game folder.
- Checked local auth sources in `/Users/oliviermichon/Documents/autonomoustudio-internal/.env` for `PLAYDROP_API_KEY`, `X_HANDLE`, and `X_PASSWORD`.
- Confirmed PlayDrop auth with `playdrop auth whoami` and verified local tool availability for Playwright, FFmpeg, Node, and npm.
- Fetched both local repos with `git fetch --prune` and verified there is no existing local drift blocking the run.
- Installed project dependencies for `Glowknot` and set the initial per-game metadata, README, and `.playdropignore`.
- Locked the concept lane at a portrait-first festival-canopy bubble shooter built on the proven `Puzzle Bobble` / bubble-shooter interaction grammar, with visible anchor-knot collapses as the differentiator.
- Wrote and passed `IDEA.md`, `SPECS_v1.md`, and `SIMPLIFY_v1.md`, keeping the v1 focused on anchor-cut canopy drops, current-plus-reserve shot planning, and a minimal HUD.
- Generated browser-rendered portrait and desktop mockups for start, gameplay, and game-over, then iterated once to clear the top-cluster start overlap and the hidden game-over `best` stat.
- Implemented the playable build in `src/`, including canopy generation and resolution logic, a canvas renderer, reserve-shot swapping, best-score persistence, deterministic debug helpers, and autoplay hooks for review captures.
- Fixed the first implementation-pass failures: the shot animation color bug, the broken glow-color conversion, the overlapping mobile HUD/start layout, the cramped danger chip, and the game-over stat collision.
- Resolved the fresh-app registration problem by registering `autonomoustudio/app/glowknot` from a clean temporary directory, then restoring the real repo folder so later capture and publish steps can target the correct PlayDrop app id.
- Tightened gameplay pressure after the first balance sweep failed: normal clears no longer refund sink time, the sink schedule now ramps at `5 / 4 / 3`, and the scripted casual policy now behaves like a casual player instead of an expert search bot.
- Passed local validation with `playdrop project validate .`, captured local portrait/desktop review screenshots from the real build, and produced a full 120-sample balance report with casual median `72.6s` and expert median `360.3s`.

TODO
- Complete the required 3-post X release thread once X accepts either the saved browser profile or the `.env` login flow.
- After the X thread succeeds, commit and push the release-sync repo state and rewrite `gates/08-release.md` from `FAIL` to `PASS`.

Release update
- Locked the final listing pack with a PlayDrop AI-generated hero family and icon, updated `catalogue.json` to the shipped rules, and passed `gates/07-listing-media.md`.
- The first publish attempt failed with `HTTP 413` because duplicated listing media and large store assets still counted toward the uploaded source bundle. I removed the duplicate screenshot/video copies, excluded `.playwright-cli/`, optimized the icon/hero assets to schema-compliant PNGs, and republished successfully.
- Published `autonomoustudio/app/glowknot` version `1.0.0`.
- Live URLs:
  - Listing: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/glowknot`
  - Play: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/glowknot/play`
  - Hosted build: `https://assets.playdrop.ai/creators/autonomoustudio/apps/glowknot/v1.0.0/index.html`
- Verification commands used:
  - `playdrop detail autonomoustudio/app/glowknot --json`
  - Playwright live check against the listing, play page, and hosted bundle with evidence written to `output/playwright/release-check/live-check.json`
  - `playdrop feedback send --title "Glowknot release: listing upload and public-play friction" ...`
- Verification results:
  - The public listing page resolved and showed the shipped description and live media family.
  - The public creator play URL still presented an account-creation wall to an anonymous browser.
  - The direct hosted bundle rendered the live game on both desktop and portrait surfaces.
- Sent PlayDrop feedback `id 40` covering the publish-size friction, PNG-only listing schema friction, and the public-play account wall.
- X thread attempts:
  - The saved browser profile loaded blank X pages and never exposed a usable compose editor.
  - A fresh login attempt from `/Users/oliviermichon/Documents/autonomoustudio-internal/.env` failed before password entry with `Could not log you in now. Please try again later.`
  - Because the required gameplay post, link reply, and autonomous note reply are still missing, `gates/08-release.md` remains `FAIL` and no repo commit/push has been made yet.
- Hotfix update
  - User-reported issue: the PlayDrop detail page booted the preview with an auth popup because the published bundle called `await sdk.me.login()` immediately after `playdrop.init()`.
  - Fix shipped in `1.0.1`: removed the startup login call from `src/main.ts` while keeping the host loading-state bridge.
  - Live URLs:
    - Listing: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/glowknot`
    - Play: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/glowknot/play`
    - Hosted build: `https://assets.playdrop.ai/creators/autonomoustudio/apps/glowknot/v1.0.1/index.html`
  - Verification results:
    - `playdrop detail autonomoustudio/app/glowknot --json` now reports version `1.0.1`, `authMode: OPTIONAL`, and `previewable: true`.
    - A headed Playwright check of the public detail page stayed on a single tab after load and after a `5s` idle, with no login/sign-in/auth text in the captured DOM logs and no console errors.
  - `gates/08-release.md` still remains `FAIL` because the X release thread is still blocked and the repo has not been committed/pushed.
- Fruit Salad retheme work
  - Swapped the in-game theme from lanterns to fruit without changing the underlying support-cut gameplay rules: the board now renders with PlayDrop-generated fruit sprites over a square orchard background.
  - Added generated gameplay audio sourced from PlayDrop AI: one looping background track plus dedicated fire, swap, drop, apple, orange, lime, grape, and blueberry one-shots.
  - Updated the local build pipeline to inline `.png`, `.jpg`, and `.mp3` assets into the single-file HTML output and changed the local metadata/display copy to `Fruit Salad` `1.1.0`.
  - `README.md` now explicitly separates the local retheme work from the still-live `Glowknot 1.0.1` release so the public state is not overstated.
  - Validation and smoke-test results:
    - `npm run validate`
    - `playdrop project validate .`
    - Browser gameplay capture via `/Users/oliviermichon/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js` against `http://127.0.0.1:4177/dist/index.html?autostart=1&seed=5`
    - Additional portrait Playwright screenshots at `output/playwright/fruit-salad-portrait.png` and `output/playwright/fruit-salad-portrait-stable.png`
  - Current QA read:
    - No console errors surfaced in the desktop or portrait browser checks.
    - The fruit board, reserve slot, launcher, and danger line all remained readable in both desktop and portrait layouts.
    - Audio wiring is in the runtime and the build carries the generated files, but I did not do a human audible listen-back pass inside this turn.

TODO
- Do a human listen-back pass and rebalance music/SFX levels if the mix feels too hot or the fruit pops are not distinct enough in practice.
- Decide whether to regenerate listing media and publish the retheme as a new live version, or keep it as a local art/audio exploration for now.
