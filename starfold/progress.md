Original prompt: Create and publish a new game using $playdrop skill.

2026-03-25 23:10 EDT
- Continuing post-release balance tuning for Starfold after the 1.0.2 bug-fix release.
- Current focus: verify that ash pressure ramps hard enough that long runs end reliably and scores stay meaningful.
- Existing local changes already add late-game ash ramp constants plus a simulation script for random and greedy policies.

2026-03-25 23:23 EDT
- Simulation results after tuning: random policy over 300 games averaged 80.65 moves with 0/300 capped at 1500; greedy policy over 30 games averaged 173.53 moves with 0/30 capped at 1500; greedy policy over 20 games with a 3000-move cap still had 0/20 caps and maxed at 235 moves.
- Final late-game balance change: from move 120 onward ash now spawns every move and in bursts of 3, so high-skill runs remain possible but no longer trend toward endless farming.
- Local browser verification on the built `dist/` passed: fresh board rendered cleanly with no intro overlay, drag moves updated score, and ash appeared correctly after several moves.

2026-03-29 08:47 EDT
- Upgrading Starfold to Playdrop `0.5.0` / CLI `0.5.1` with the workspace authenticated against the studio API key from `.env`.
- Added Playdrop v0.5 integration for optional auth, previewable boot, live leaderboard sync, and queued achievement unlocks.
- Fixed the intermittent board blink during chained eliminations by advancing completed animation stages in the same update loop instead of leaving a one-frame idle gap.
- Reworked the board frame so the gold ring renders above the tiles with a larger rounded inner cut that matches the softened board language.
- Captured fresh local and hosted proof on portrait and desktop, and generated new achievement art plus refreshed listing media for the `1.1.0` release.

2026-03-29 13:46 EDT
- Replaced the old Starfold runtime skin with the approved shrine artwork system: square nebula background, trimmed gold frame, and bespoke sigil tile renders across desktop, mobile landscape, and mobile portrait.
- Simplified the HUD so all support UI stays outside the board frame, with a left rail on landscape surfaces and top-bottom stacks on portrait.
- Refreshed the listing family for the live `1.2.1` release with a new AI-generated landscape hero, a minimalist AI-generated icon, and updated real-build screenshots from desktop, mobile landscape, and mobile portrait captures.
- The matching portrait hero could not be completed with Playdrop AI because portrait reference-image generation first returned transient `503` failures and the final retry hit `insufficient_funds`; a controlled sibling portrait was composed locally from the approved square board art and the approved AI landscape title treatment so the listing still shipped as a matched family.
- Sent Playdrop feedback about the unstable portrait AI generation path, removed deprecated `sdk.host.setLoadingState(...)` usage, republished as `1.2.1`, and verified the production play URL with remote captures that completed without console errors.

2026-03-29 14:25 EDT
- Switched Starfold's board from `6x5` to `5x5` so the runtime board now fits the approved trimmed frame geometry cleanly on desktop and portrait.
- Simplified the live HUD further: gameplay now shows only the score value, with no score label and no ash counter.
- Confirmed the actual fail state remains ash pressure only: the run ends when ash reaches `10`; there is still no separate `no moves` loss condition.
- Captured fresh desktop and portrait gameplay plus game-over screenshots and assembled composite proof images for the two distinct user-facing runtime states. Preview mode still reuses the normal gameplay board rather than a separate intro screen.

2026-03-29 14:43 EDT
- Simplified post-run flow again: logged-in runs still auto-submit on `completeRun()`, while unauthenticated or preview runs now discard pending leaderboard/achievement payloads instead of surfacing a redundant `Save Run` CTA later.
- Reworked the game-over UI to use a single primary `Play Again` button and removed the old `Fold Again` / `Save Run` branching.
- Added dead-board detection with `hasPlayableMove(...)`; Starfold now ends not only at `10` ash, but also when no row or column shift can create a clear.
- Added coverage for playable-start generation, dead-board detection, and the new `no_moves` game-over path. `npm run validate` passes after the change.

2026-03-29 14:56 EDT
- Added an idle teaching hint for casual readability: after `4.5s` of inactivity, Starfold now picks a real playable move and softly nudges that row or column by a partial step, then rests before repeating.
- The hint cancels whenever the user interacts or the board is animating, and it reuses the same playable-move enumeration as dead-board detection so it never suggests a fake move.
- Verified with the `develop-web-game` Playwright client and with a local Playdrop shell capture. The shell proof image is `output/idle-hint-shell-desktop.png`.

2026-03-29 15:55 EDT
- Bumped Starfold to `1.2.2` and published successfully to Playdrop prod after the initial upload was rejected because `1.2.1` already existed.
- Live play URL for testing: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/starfold/play`
- Live hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/starfold/v1.2.2/index.html`

2026-03-29 16:55 EDT
- Rebalanced Starfold around staged ash pressure: fresh ash now lands as `ash3`, then weakens through `ash2` and `ash1` before finally clearing on the third neighboring blast.
- Removed the old `10`-ash fail condition entirely; runs now end only when no scoring row or column shift remains after a resolved valid move.
- Invalid shifts are now rejected at the logic layer and in the UI, so drag previews can tease a move but illegal releases spring back without consuming a turn, score change, or ash spawn.
- Added true drag-follow for rows and columns after axis lock, and applied a soft edge fade to moving tiles so entering, exiting, previewed, and collapsing tokens blend through the frame opening instead of hard-clipping.
- Generated and normalized a full three-stage ash tile set in the shrine style with Playdrop AI. The first `ash1` generation path initially failed with transient `503`s, feedback `#35` was filed, and a later retry succeeded; runtime now uses the clean AI-generated `ash3` / `ash2` / `ash1` family.
- Validation passed with `npm test`, `npm run validate`, and `playdrop project validate .`. Local Playwright proof and Playdrop capture proof both completed on desktop and mobile portrait, including invalid-drag snapback, drag-follow, staged ash, and `NO MOVES REMAIN` game over.

2026-03-29 18:31 EDT
- Refreshed the release media from the real `5x5` staged-ash build: recorded a new landscape gameplay clip with the fixed recorder script, trimmed it to a 20-second H.264 listing video, and captured matching current-build landscape and portrait screenshots.
- Updated Starfold listing metadata to point at the new gameplay video plus the refreshed screenshot set, and added `.playdropignore` so generated `output/`, `tmp/`, `mockups/`, and `.playwright-cli/` content do not inflate Playdrop source uploads.
- Hardened the renderer for tiny embedded surfaces after the first `1.3.0` publish exposed a negative-radius canvas path on the listing-page preview. The follow-up `1.3.1` patch clamps frame geometry and rounded-rect radii so small previews stay safe.
- Published `1.3.1` successfully to Playdrop prod and re-verified the live `/play` surface with remote capture and no console errors.
- The canonical listing page still causes `playdrop project capture remote` to fail with Playdrop-side `realtime_initial_disconnect` page errors even though Starfold itself now renders correctly there; filed Playdrop feedback `#36` with repro details.

2026-03-29 20:05 EDT
- Fixed drag commit handoff so a valid release now animates from the dragged release offset into the final shifted slot instead of restarting from center.
- Rebalanced ash cadence to the new schedule: no ash for moves 1-5, one ash every other move through move 10, one ash every move through move 20, two ash per move through move 30, then three ash per move after that.
- Updated Playdrop meta integration from the stale achievement/leaderboard method names to the documented `grant(...)` and `getLeaderboard(...)` runtime APIs, and added a controller test covering logged-in play submission.
- Added an unlock flush guard so achievements cannot be granted twice when an in-run grant and end-of-run flush happen back to back.
- Regenerated the full achievement icon family with Playdrop AI for small-size readability and swapped the shipped listing icons to the new set in `listing/achievements/`.
- Hardened `build.mjs` for watch-mode and capture by clearing `dist/assets` before recopying, and removed the retired single-state ash tile source so `playdrop project capture` no longer targets stale art.
- Verification passed with `npm test`, `npm run validate`, `playdrop project validate .`, fresh Playdrop desktop/mobile captures, and a local Playwright drag-handoff proof sheet in `output/drag-handoff-check/`.
- Promoted the new `r4` achievement family into `listing/achievements/` with standalone icon silhouettes instead of tile-like badges, then prepared the release bump to `1.4.0` for publish.
- Published Starfold `1.4.0` to Playdrop after deleting the oldest stored version (`1.0.0`) to get under the 10-version platform cap.
- Verified the live play surface with `playdrop project capture remote` and saved the production proof to `output/release-v140-play.png` with no console errors.

2026-03-29 21:27 EDT
- Hid the gold frame on mobile portrait only; desktop and mobile landscape still render the trimmed frame above the board.
- Recentered the portrait score label vertically inside the top band so it now sits between the top edge of the screen and the top row of tiles instead of crowding the board.
- Validation for this tweak: `npm run validate`, plus a local Playwright/browser proof pass on desktop and portrait after rebuilding.

2026-03-29 21:41 EDT
- Moved the transient gameplay messaging block off the portrait score area. Combo and achievement text now share the lower free band under the board on mobile portrait.
- On non-portrait layouts, the same message block now sits under the left-aligned score rail instead of floating near the board frame, which avoids overlap with the playfield.
- Re-verified with `npm run validate` and deterministic desktop/portrait captures that trigger the first achievement toast after the opening scored move.

2026-03-29 21:57 EDT
- Investigated the production achievement-unlock failure with direct iframe inspection on the live `v1.4.1` play page using Playwright.
- Root cause was game-side: Starfold was still calling `sdk.achievements.grant(...)` and `sdk.leaderboards.getLeaderboard(...)`, but the live Playdrop `0.5.1` iframe runtime exposes `achievements.unlock(...)` and `leaderboards.get(...)`.
- Updated the runtime adapter and test coverage to use the live SDK surface. This explains why score submission still worked while achievements never unlocked: `submitScore(...)` was correct, but the achievement method name was stale.
- Validation after the adapter fix: `npm run validate` and `playdrop project validate apps/starfold` both pass.

2026-04-21 11:22 EDT
- Reworked the live gameplay HUD into a three-card system in the requested order: `RANK`, `BEST`, `SCORE`.
- Removed the gameplay restart control, kept the board centered on desktop and landscape, and pushed both the board and HUD into safe-area-aware layout bounds.
- Tightened portrait framing so the visible board keeps left and right breathing room instead of running edge-to-edge, then captured fresh portrait, mobile-landscape, and desktop proof images.
- Current proof sheet: `output/playwright/hud-v3-composite.png`.

2026-04-21 11:08 EDT
- Centered the desktop and landscape HUD rail vertically within the safe content area instead of pinning it near the top.
- Moved the desktop and landscape combo and achievement message anchor with that centered rail so the text block still sits just below the metrics.
- Revalidated with `npm test`, `npm run build`, and fresh local gameplay captures at `output/playwright/hud-landscape-v4.png` and `output/playwright/hud-desktop-v4.png`.

2026-04-21 11:30 EDT
- Captured a new 12-panel surface review sheet covering portrait, mobile landscape, and desktop across four current runtime states: preview, gameplay, gameover start, and gameover overlay.
- Used deterministic seed `20260429` so all three surfaces show aligned board progression. Best score was pinned to `402,420` in local storage for stable HUD and result proof.
- Important capture note: preview still matches normal gameplay in the current build, and `gameover start` is only the short `losing` fade with no text yet.
- Composite proof sheet: `output/playwright/surfaces-v1/surfaces-v1-composite.png`.

2026-04-21 11:47 EDT
- Replaced the centered game-over modal with a safe-area-aware bottom bar on every surface.
- The new game-over bar uses the requested copy only: title `Game Over`, subtitle `no move possible`, and a right-aligned `Play Again` button.
- Regenerated the surface review as a 3-state sheet only: preview, gameplay, and game over. New composite: `output/playwright/surfaces-v2/surfaces-v2-composite.png`.

2026-04-21 12:53 EDT
- Delayed the game-over transition until after the final move fully resolves, then added an extra `500ms` quiet pause before any result UI appears.
- The bottom bar now fades in and slides up during a short entrance animation, while the board tiles crossfade to a grayscale version over `1s`.
- Locked the `Play Again` button so it is not interactive until the full transition completes and the runtime reaches the final `gameover` state.
- Verified locally with `npm test`, `npm run build`, and transition proof captures in `output/playwright/gameover-transition-check/`.

2026-04-21 13:02 EDT
- Kept the HUD visible during the final game-over state so `BEST` and `SCORE` remain readable while the result bar is on screen.
- Added the same grayscale crossfade to the non-portrait frame image, leaving the background untouched and portrait unchanged.
- Constrained and centered the bottom game-over bar with a max width on wide surfaces, and rebalanced the title and subtitle placement vertically inside the bar.
- Regenerated the 3-state surface review composite at `output/playwright/surfaces-v3/surfaces-v3-composite.png`.

2026-04-21 14:03 EDT
- Tightened the bottom game-over bar width so its cap is the board width plus one extra tile span on each side, instead of a generic wide-screen max.
- Recentered `Game Over` and `no move possible` using measured glyph bounds so the text block sits correctly within the bar across portrait, landscape, and desktop.
- Revalidated with `npm test`, `npm run build`, and a fresh deterministic 3-surface proof sheet at `output/playwright/surfaces-v4/surfaces-v4-composite.png`.

2026-04-21 14:45 EDT
- Replaced the HUD's local best-score path with a frozen per-run leaderboard snapshot, so `RANK` and `BEST` now come from the PlayDrop leaderboard and stay stable for the whole run while only `SCORE` changes live.
- Added login hit targets on empty `RANK` and `BEST`, score-only highlight styling when the live run exceeds the frozen best, and three synced game-over result modes: `normal`, `new_best`, and `first_recorded`.
- Changed game-over sync timing so only eligible logged-in runs block on leaderboard submission and refresh before the final reveal; logged-out runs no longer wait and can still submit from the result screen after a HUD-triggered login.
- Added result-classification coverage plus expanded controller tests for frozen leaderboard state, logged-out run retention, mid-run login, and post-run login submission. `npm test` and `npm run build` pass. `npx tsc --noEmit` still fails only on the existing `playdrop-sdk-types` mismatch in `src/platform.ts`.
- Initial logged-in proof capture was invalid because the live remote `playdrop.js` overrode the browser mock. Recaptured the full sheet with the SDK script intercepted at the network layer. Final proof sheet: `output/playwright/leaderboard-hud-v2/leaderboard-hud-v2-composite.png`.

2026-04-21 15:15 EDT
- Refreshed `vendor/playdrop-sdk-types.tgz` from the current PlayDrop SDK artifact and moved Starfold's `playdrop.platformVersion` plus `playdrop.sdkTypesVersion` to `0.7.13`, then regenerated `package-lock.json` with a clean install so the local type surface matches the current CLI.
- Tightened the runtime adapter to the hosted contract: removed the `playdrop.init()` timeout fallback, gated SDK bootstrap on an actual `playdrop_channel`, dropped deprecated `setLoadingState(...)` usage, and stopped suppressing leaderboard or achievement flows in `/dev`.
- Switched the optional-auth path to `sdk.me.promptLogin()` only, kept `sdk.host.ready()` as the sole readiness signal, and added a regression test for the non-host local boot path.
- Validation now passes cleanly with `npm test`, `npx tsc --noEmit`, `npm run build`, and `playdrop project validate .`.
- Fresh proof sheet after the SDK cleanup: `output/playwright/sdk-alignment-v1/sdk-alignment-v1-composite.png`.

2026-04-21 15:25 EDT
- Shortened the `new_best` game-over subtitle to `new high score` so it stays on one line across portrait, landscape, and desktop.
- Added a direct formatter test to keep that single-line copy locked in.
- Revalidated with `npm test`, `npx tsc --noEmit`, and `npm run build`.
- Fresh proof sheet for the copy change: `output/playwright/sdk-alignment-v2/sdk-alignment-v2-composite.png`.

2026-04-21 16:35 EDT
- Removed all loading copy from the local fallback renderer and from the asset and audio boot paths, so Starfold no longer emits in-game or PlayDrop loading text during startup.
- Removed the game-side achievement toast system while keeping achievement registration intact through the PlayDrop SDK queue and end-of-run sync.
- Left combo feedback unchanged, so `STAR CHAIN` and `STARFOLD` remain the only non-HUD, non-game-over gameplay text.
- Revalidated with `npm test`, `npx tsc --noEmit`, and `npm run build`.
- Fresh proof sheet after the text cleanup: `output/playwright/text-cleanup-v1/text-cleanup-v1-composite.png`.

2026-04-21 17:20 EDT
- Reworked combo rewards into an explicit score system: clear stages now score from base match and ash-cleanse values, then the finished move gets a combo bonus multiplier of `x1.25` for `x2`, `x1.6` for `x3`, `x2.0` for `x4`, and `x2.5` for `x5+`.
- Replaced the old flavor-only combo copy with a two-line reward block: `CHAIN x2`, `CHAIN x3`, or capped `CHAIN x4+`, plus the exact combo bonus points underneath.
- Kept the combo reward visible until the move fully resolves, and made the `SCORE` card intensify more as combo depth rises so bigger chains read as more valuable.
- Added deterministic combo tests for the multiplier curve plus exact `x2`, `x3`, and `x4+` seed-1 cases. Revalidated with `npm test`, `npx tsc --noEmit`, and `npm run build`.
- Fresh proof sheet for combo rewards: `output/playwright/combo-rewards-v1/combo-rewards-v1-composite.png`.

2026-04-21 17:55 EDT
- Reworked the combo presentation with portrait-first tuning: the combo block now sits in the top gap between the HUD and the board on mobile portrait, while landscape and desktop keep the side message area.
- Combo text now inherits the dominant sigil color from the focus match, scales up harder with deeper chains, and renders after the HUD so it always stays above the board and cards.
- Added sigil-tile particle bursts around the combo title using the real tile art at small scale, with particle count tied to the matched group size and a fast-out, slow-down fade.
- Kept the combo fade paused until the move fully resolves so long chains do not lose their label before the player can read it.
- Revalidated with `npm test`, `npx tsc --noEmit`, and `npm run build`.
- Fresh proof sheet for the portrait-focused combo pass: `output/playwright/combo-rewards-v2/combo-rewards-v2-composite.png`.

2026-04-21 18:45 EDT
- Added per-group big-match ash resolution in the core logic: `4 MATCH` now fully purges any orthogonally touched ash, `5 MATCH` keeps that local purge and also applies one hit to every other ash on the board, and `6+ MATCH` wipes all ash immediately.
- Added deterministic coverage for all three new match tiers in `tests/logic.test.ts`, using custom boards that isolate the local purge, global chip damage, and full-board wipe cases.
- Added a `?board=` runtime query for deterministic capture boards plus richer debug stage output in `window.__starfoldDebug.activeStage`, so proof captures can target exact clear states without guessing timing from seed-only runs.
- Revalidated with `npm test`, `npx tsc --noEmit`, and `npm run build`.
- Fresh proof sheet for the big-match pass: `output/playwright/big-match-v1/big-match-v1-composite.png`.

2026-04-21 19:15 EDT
- Added a first pulse presentation pass for big matches: clear stages now carry `majorMatchSize`, `pulseKind`, and `pulseTargets`, so the renderer and audio stack can react differently for `5 MATCH` shockwaves versus `6+ MATCH` board wipes.
- Hooked the clear-stage pulse into the runtime with a new `ash-pulse` SFX and a stronger visual overlay that flashes the board, throws a gold ring across the shrine, and highlights pulse-hit ash targets while the effect resolves.
- Generated the new pulse SFX with the PlayDrop CLI AI flow, downloaded it into `assets/runtime/audio/starfold-ash-pulse-r1.mp3`, and wired it into `src/audio.ts`.
- Revalidated with `npm test`, `npx tsc --noEmit`, `npm run build`, and `playdrop project validate .`.
- Fresh proof sheet for the pulse pass: `output/playwright/big-match-v2/big-match-v2-composite.png`.

2026-04-21 20:10 EDT
- Reworked combo messaging to promote live during the move instead of jumping straight to the final chain depth. The label now appears on the second clear as `CHAIN x2`, then upgrades to `x3`, then `x4+` on later clears in the same move.
- Moved combo bonus display to per-clear preview values so the `+score` readout escalates alongside the chain depth instead of showing only the final move total from the start.
- Rebuilt the combo particle burst to animate immediately from the first frame of each promotion, with no static hold before the tiles fly outward.
- Revalidated with `npm test`, `npx tsc --noEmit`, `npm run build`, and `playdrop project validate .`.
- Recorded a deterministic portrait gameplay clip at `60 fps` from Chrome with GPU-oriented flags, exported to `output/playwright/chain-progression-portrait-60fps.webm` and `output/playwright/chain-progression-portrait-60fps.mp4`.

2026-04-21 21:45 EDT
- Fixed the game-over grayscale transition on mobile by replacing the canvas filter path with precomputed grayscale frame and tile canvases in the renderer, so the board and landscape frame now desaturate reliably across all surfaces.
- Replaced Starfold's Web Audio runtime with the same HTML audio plus document-capture unlock pattern used by Tomb Sweeper. Music now unlocks from the first pointer or key interaction, stays synced to `sdk.host.audioEnabled`, and pauses cleanly for host pause or non-play phases.
- Revalidated with `npm test`, `npx tsc --noEmit`, `npm run build`, and `playdrop project validate .`.
- Fresh gameplay proof sheet for the audio pass: `output/playwright/audio-fix-v2/audio-fix-v2-composite.png`.
- Fresh gray-state proof sheet after the grayscale asset fix: `output/playwright/grayscale-audio-fix-v1/grayscale-audio-fix-v1-composite.png`.

2026-04-21 22:05 EDT
- Added an explicit background-audio guard to Starfold's HTML audio runtime. Music and one-shots now stop when the page is hidden or pagehide fires, and music resumes only when the page becomes visible again under the same PlayDrop host policy.
- Revalidated with `npm test`, `npx tsc --noEmit`, `npm run build`, and `playdrop project validate .`.
- Deterministic proof run on portrait, landscape, and desktop now shows `musicStarted: true` in the foreground, `false` after the simulated hidden lifecycle, then `true` again after foreground resume.
- Fresh gameplay proof sheet for the background-audio guard: `output/playwright/audio-background-v1/audio-background-v1-composite.png`.

2026-04-21 22:40 EDT
- Investigated the mobile performance regression and confirmed the root cause was the SFX backend, not the PlayDrop host policy. Starfold was preloading and driving up to `67` `HTMLAudioElement`s for overlapping one-shots, which is a poor fit for rapid game SFX on mobile.
- Replaced the SFX path in `src/audio.ts` with a dedicated Web Audio context that decodes each short effect once, plays them through `AudioBufferSourceNode`s, and caps per-key polyphony while keeping the current HTML-audio music path unchanged for mobile-safe looping.
- Kept the same PlayDrop and page lifecycle contract for audio gating: SFX context now resumes only when the app is visible, unpaused, in `play`, host audio is enabled, and the user has unlocked audio. It suspends and clears active one-shots outside that state.
- Revalidated with `npm test`, `npx tsc --noEmit`, `npm run build`, and a `develop-web-game` smoke pass against the built app. Smoke artifacts: `output/web-game-audio-smoke/shot-0.png` and `output/web-game-audio-smoke/state-0.json`.

2026-04-21 22:52 EDT
- Removed the UI cap on combo labels in `src/main.ts`, so the player now sees the real chain depth like `CHAIN x5` instead of `CHAIN x4+`.
- Revalidated with `npm test`, `npx tsc --noEmit`, `npm run build`, and `playdrop project validate .`.
- Captured a deterministic three-surface proof sheet for the `CHAIN x5` case at `output/playwright/combo-label-v1/combo-label-v1-composite.png`.

2026-04-22 12:28 EDT
- Imported the four new startup art files from Downloads into `assets/runtime/`: `starfold-hero-landscape-v1.png`, `starfold-hero-portrait-v1.png`, `starfold-background-landscape-v1.png`, and `starfold-background-portrait-v1.png`.
- Reworked startup flow so Starfold loads the hero pair first, renders the hero immediately, then waits for the full runtime assets plus audio before running a staged intro: background reveal, hero fade, HUD slide-in, board fade-in, and randomized tile appearance at `50ms` stagger per tile.

2026-04-22 13:10 EDT
- Refreshed the live `generated-v2` normal sigil art with the new muted row-1 tile family from `Desktop/playdrop-image-tools/output/final-muted-row1-bright-row3`, keeping the existing bright match and ash states unchanged.
- Confirmed the replacement runtime normals are still `190x190` and roughly `40KB` to `46KB` each, so the swap stays within a reasonable mobile texture budget as an initial performance guardrail.
- Prepared the `1.4.13` release for publish with the preview-loop work and muted normal tile refresh together.

2026-04-22 16:05 EDT
- Removed the preview-only `Tap to Start` prompt after the live surface showed the CTA placement was visually off. Preview now stays as a pure autoplay board loop with no extra callout text.
- Revalidated the Starfold package after the prompt removal and refreshed the preview capture to confirm the board loop still reads cleanly.

2026-04-22 16:30 EDT
- Added a shared board-reset transition for fresh-run handoffs. Leaving preview for real play now snapshots the visible preview board, clears it with a staggered pop-out animation, then repopulates a brand-new run with the same staggered reveal language.
- Routed `Play Again` and keyboard restart through that same reset path so post-game restarts clearly read as a new board instead of mutating the ashed-out game-over state in place.
- The outgoing board now keeps its current ash treatment during the reset, so game-over restarts visibly clear the fully ashed board before the new live sigils arrive.

2026-04-22 16:42 EDT
- Tightened the segmented HUD metric layout so each label and value pair sits closer together on portrait and the landscape or desktop rail, reducing the perceived gap between `RANK`, `BEST`, `SCORE`, and their values without changing typography or panel size.

2026-04-22 16:55 EDT
- Slowed the core gameplay resolution timings by roughly 50 percent so shifts, clears, collapses, and ash placements read more clearly in motion instead of snapping through too quickly.
- Increased the preview autoplay delay between fake moves to `1s`, keeping the loop readable on listing and host preview surfaces.
- Replaced the stale wide-frame layout geometry with the live square glass-board geometry so portrait surfaces, especially the web preview on iPhone, can use much more of the available space for the actual board.
- Removed the in-game `How to Play` flow and moved the rules explanation into the store description in `catalogue.json`.
- Refreshed the listing icon from `Downloads/starfold-icon.png` and replaced the intro hero plus background art with a new zoomed-out generated set for both portrait and landscape.
- Revalidated with `npm test`, `npx tsc --noEmit`, `npm run build`, `playdrop project validate .`, and a `develop-web-game` smoke capture at `output/web-game-intro-smoke/shot-0.png`.
- Fresh proof sheet for the startup and help-flow pass: `output/playwright/intro-howto-v1/intro-howto-v1-composite.png`.

2026-04-22 18:52 EDT
- Implemented the audio, sync, and mobile-performance remediation pass from the review plan.
- Pending run metadata now survives restart, is owner-bound for logged-in users, and no longer blocks the local loss reveal or game-over SFX while remote sync finishes in the background.
- Reworked SFX loading around lazy Web Audio context creation, byte prefetch plus post-unlock decode, state-change recovery, and a global voice budget keyed off the active render quality tier.
- Replaced the permanent RAF loop with a wakeable render scheduler. Idle gameplay now stops RAF entirely, preview waits use timed wakeups, and the renderer now caches the background, frame layers, HUD shell chrome, and HUD text measurements.
- Added adaptive render quality tiers and simplified reduced and minimal clear-pulse, edge-flash, particle, and shadow work so constrained mobile runs shed effect cost first.
- Added regression coverage for owner-bound pending sync, anonymous pending sync after login, first-recorded subtitle copy, and HUD pointer-up drag cleanup in `tests/platform.test.ts` and `tests/runtime-helpers.test.ts`.
- Added `scripts/benchmark-mobile.ts` and ran it against the built app served locally on `http://127.0.0.1:4174/`. Current results: Chromium `startupReadyMs: 2210`, WebKit `startupReadyMs: 2318`, both `idleLoopStopped: true`, both `musicStarted: true`, both `sfxReadyCount: 11`, and both stayed at `maxGlobalVoices: 2`.
- Final validation for this pass: `npm run validate`.
- Remaining work is manual device acceptance in the PlayDrop host on real iPhone Safari and Android Chrome, especially for WebKit interrupted-audio recovery and the heaviest late-chain visuals.

2026-04-22 13:35 EDT
- Added a real PlayDrop `preview` phase loop in `src/main.ts`. Preview now hides the HUD, combo labels, score pop text, edge flash, idle hint, game-over overlay, and restart CTA, while keeping the board and normal gameplay animations visible.
- Preview gameplay now auto-selects a move by evaluating playable candidates and preferring higher-scoring, deeper-combo, larger-match outcomes. It starts after a short opening hold, plays until the run ends, shows only the gray-tile game-over state briefly, then restarts automatically.
- Kept the normal play path intact: music start, leaderboard queueing, achievements, login HUD actions, and game-over overlay behavior only run in `play`, not in `preview`.
- Revalidated with `npm test`, `npx tsc --noEmit`, `npm run build`, and `playdrop project validate .`.
- Fresh proof sheet for the preview loop: `output/playwright/preview-loop-v1/preview-loop-v1-composite.png`.

2026-04-22 13:52 EDT
- Added a preview-only `Tap to Start` prompt under the board in `src/game/render.ts`, with a slow pulse so the preview surface still advertises the transition into play while autoplay is running.
- The prompt is render-only and does not affect normal `play` UI.
- Revalidated with `npm test`, `npx tsc --noEmit`, `npm run build`, and `playdrop project validate .`.
- Updated proof sheet with the prompt: `output/playwright/preview-loop-v2/preview-loop-v2-composite.png`.
