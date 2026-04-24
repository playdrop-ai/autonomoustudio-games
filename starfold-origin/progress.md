Original prompt: Restore the old Starfold version as a new PlayDrop game named Starfold Origin.

2026-04-24 10:25 EDT
- Restored the March 29 Starfold `1.4.4` source from `autonomoustudio-internal` commit `d37b81a765153a58a642511c8642bca4416eb589` into `/Users/olivier/Documents/autonomoustudio-games/starfold-origin`.
- Renamed the package and PlayDrop app to `starfold-origin`, set the first Origin release version to `1.0.0`, and pinned ownership to `autonomoustudio`.
- Updated the SDK vendor artifacts and package metadata to the current PlayDrop `0.7.13` SDK line used by the live Starfold package.
- Removed the achievement catalogue entries, achievement art, and runtime achievement queueing while keeping the `highest_score` leaderboard.
- Verification passed with `npm run validate`, the develop-web-game Playwright client on the built `dist/`, and a local Playwright drag smoke test that moved score from `0` to `540` with no browser errors.
- Updated the repo PlayDrop auth pin to `playdrop` prod so the admin CLI account can publish entries whose catalogue owner is `autonomoustudio`.
- PlayDrop validation passed through the hosted `/dev` launch check after leaderboard refresh was limited to logged-in hosted play sessions.
- Published `autonomoustudio/starfold-origin` version `1.0.0` to prod. Live play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/starfold-origin/play`.
- Live remote capture completed for the published play URL with no console errors; proof image is `output/live-starfold-origin-play.png`.

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
