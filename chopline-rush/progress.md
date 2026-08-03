Original prompt: what would be a plan to make our game chopline rush production ready and better than the competition ? keep the graphics simple but win with better level design, physics, visual effect and juice — followed by: doit

## 2026-08-03 — implementation start

- Working in the existing registered `chopline-rush` app; slug and PlayDrop integration stay unchanged.
- Update phases selected: understand, designing, coding, tweaking, playtesting, release-candidate validation.
- Engine remains the existing Three.js runtime.
- GameBlocks reviewed: no block selected. The game already has a fixed side-on camera, seeded course generation, cleanup, and deterministic test hooks; replacing those with a generic block would add risk without improving the requested mechanics.
- Physics remains the existing fixed-step custom analytic Y-Z simulation. Rapier was reviewed but is not selected: the core needs deterministic blade/handle sweep tests and authored cut rules, not general-purpose 3D rigid-body contacts.
- Product direction approved by the user: authored level progression becomes primary; endless remains a secondary mastery mode.
- First implementation priorities: persistent FTUE, fair visible survival rules, deterministic input behavior, authored course schema, then proportional effects and juice.

## TODO

- Run clean dependency baseline and existing tests.
- Implement the production core milestones above.
- Add PlayDrop surface tapes and refresh product/spec documentation.
- Run deterministic, browser, and visual playtests after the final runtime change.

## Baseline verification

- `npm ci` completed from the app folder. Audit reports one existing moderate dependency advisory; no dependency files changed.
- Pre-change `npm run validate:local` passed: typecheck/build, content audit, endless generator parity, runtime smoke, paced/spam bot, all 41 chunk validations, and visual baselines.
- Pre-change `npm run proof:mechanics` passed and produced `tmp/mechanics-proof/mechanics-composite.png`.
- Baseline bot result: paced score 75 versus spam score 1. Existing anti-spam behavior is already strong and must be preserved.

## Core progression and FTUE vertical slice

- Added 60 finite authored levels across five difficulty acts. Levels use explicit, curated sequences of the already validated 41 course chunks, with authored gaps, score requirements, and finite finish gates.
- Primary boot now starts the player's current level; endless remains available as the secondary mode.
- Level 1 teaches launch, relaunch, the intentional mid-air tap, and blade-first landing through contextual prompts. Failure is suppressed until the player has made three deliberate inputs.
- Endless keeps the existing ten-second score-to-survive rule, but the timer is now visible whenever active.
- Added deterministic `window.render_game_to_text()` and `window.advanceTime(ms)` hooks.
- Compile/build passes after this slice.
- Web-game client verification: after the prescribed three-tap sequence, Level 1 remains active, scores 15 cuts, and records `tutorialStep: complete` without console errors. Screenshot: `tmp/web-game-level1-ftue/shot-0.png`.

## Production-core completion

- All 60 level blueprints build successfully, have unique names, finite start/finish platforms, and never ask for more cuts than the level contains.
- Added finite level completion, next-level persistence, `max_level` submission, clean win/loss copy, single-tap retry/continue, and an uninterrupted result path with no active ad prompt.
- Added a level progress bar, visible endless survival timer, checkered finish gate, landing rings, completion burst, proportional camera/haptic impact, and capped transient score/praise clutter.
- Preserved the custom 1/120 fixed-step physics and the strong anti-spam contract. Latest final bot result: paced 86 versus spam 1.
- Refreshed the vendored PlayDrop SDK types from 0.12.5 to 0.14.6 and reinstalled from the lockfile.
- Final `npm run validate:local` passed: compile/build, content contract, generator parity, browser runtime/FTUE/all-level smoke, bot, all 41 chunks, and visual baselines.
- Final `npm run proof:mechanics` passed; composite remains at `tmp/mechanics-proof/mechanics-composite.png`.
- Current PlayDrop CLI 0.14.6 validated the catalogue with zero warnings.
- Upgraded esbuild to 0.28.1; the final npm audit reports zero vulnerabilities.
- Official PlayDrop tapes passed on `MOBILE_PORTRAIT` and `DESKTOP`, with 3/3 inputs delivered and successful active-play evidence. Final images are under `tmp/release/playdrop-mobile-portrait-release-tape.png` and `tmp/release/playdrop-desktop-release-tape.png`.

## 2026-08-03 — tutorial and finale rejection / rebuild

- User rejected the first production pass as underwhelming, specifically the detached DOM checklist tutorial and the decorative finish gate.
- Source audit confirms the critique: Level 1 reused ordinary endless chunks, FTUE advanced from input state rather than authored spatial beats, and level completion fired when the knife crossed an invisible Z threshold.
- Rebuild direction: a bespoke Level 1 course with world-space signs, animated ghost-knife demonstrations, an air-tap ring, and a marked blade-landing pad. No generic rigid-body engine is being added; deterministic custom physics is retained so these authored beats stay repeatable.
- Every level will now end at a physical final-chop board. Completion requires clearing its marked target stack and planting the blade into the board; simply passing the finish position will no longer win.
- The finale will hold on the planted knife for a closer camera beat, board impact, shockwaves, confetti, and a world-space clear sign before showing results.

## Bespoke FTUE and physical finale implementation

- Level 1 is now a short hand-authored course: launch from a marked pad, cut the first fruit stack, relaunch toward a glowing airborne ring, then stick blade-first into a dedicated landing target.
- Tutorial instructions are rendered as animated world-space signs, concentric course markers, directional arrows, and ghost-knife demonstrations. The old DOM tutorial text is suppressed during FTUE.
- The air tap is deliberately forgiving while the glowing ring is active; the spatial marker teaches timing without punishing a new player for missing a narrow invisible trigger.
- Tutorial completion is now spatially validated: it only records after a blade-first plant on `tutorial_land`, not after any arbitrary landing.
- Every authored level now ends on a chopping board with a marked brick stack. A forceful cut shatters the stack; the run only wins after the blade physically plants in `level_finish` with the score requirement met.
- The old checkered gate and automatic finish-Z completion were removed. Passing the station without completing the final chop now fails rather than awarding a win.
- The planted finale holds for 1.55 seconds with a tighter camera, board compression, multi-ring shockwave, fragments, confetti, haptics, and a world-space `PERFECT CHOP` card.
- Deterministic browser proof for Level 1 now reaches `tutorialStep: complete`, `finaleState: complete`, `finaleTargetsRemaining: 0`, and result only after the final board plant.

## Reference-copy correction

- User rejected the invented ring / ghost-knife / forced-landing tutorial and required direct reference parity.
- Re-read the captured Slice It All Level 1 start, success video/contact sheet, Slice Master opening, and deconstruction spec before changing the implementation.
- At this stage we incorrectly concluded that the minimal prompt meant there was no multi-input lesson. The later clean-install audit below disproved that interpretation.
- Removed the authored airborne ring, ghost-knife tutorial demonstrations, relaunch prompt, forced tutorial landing pad, special tutorial impulse, and pre-three-tap failure suppression.
- Level 1 now copies the captured pedestal + thirteen-slab wall composition, followed by the reference's simple target runway. The one instruction dismisses and persists on the first accepted tap.
- First-frame browser evidence confirms the copied composition and an unobstructed normal HUD at `tmp/web-game-reference-ftue-final/shot-0.png`; first-tap evidence confirms all thirteen slabs are cut, the instruction is gone, and normal play is active at `tmp/web-game-reference-first-tap-final/shot-0.png`.
- Tightened the final stack placement so reference-style tap timing physically cuts the marked stack before the board plant. The runtime playthrough now clears Level 1 coherently with no scripted coordinate win.
- Final local checks pass: typecheck/build, content contract, endless-generator parity, runtime smoke, paced-versus-spam bot evidence, all 41 chunk validations, visual baselines, and mechanics proof.
- Final PlayDrop evidence passes on both declared surfaces with 6/6 inputs. The six-tap tape reaches `Level 1 Clear!` on mobile portrait and desktop; evidence is under `tmp/release/playdrop-reference-mobile-clear-tape.png` and `tmp/release/playdrop-reference-desktop-clear-tape.png`.

## 2026-08-03 — clean-install tutorial audit correction

- Re-ran the actual `com.tummygames.sliceit` production package (`2141.0.4`, versionCode `21375`) on a wiped dedicated Android 15 AVD and cross-checked that identity against the current install on the connected Pixel 8.
- The previous tutorial conclusion was wrong: it inferred onboarding from a successful Level 1 run and a preserved returning-player profile rather than isolating the clean first-input contract.
- Fresh Level 1 evidence shows that one tap launches a low arc but does not clear the opening safely. With no airborne follow-up, the game reaches `REVIVE` in about 1.5 seconds.
- The actual integrated lesson is repeated-tap timing: no follow-up fails, an early cadence around 0.55 seconds can skip the wall and rewards, and a lower cadence around 0.8–0.9 seconds bites through the wall and continues.
- At audit time Chopline Rush failed this parity check because one tap destroyed all thirteen slabs and landed safely. The subsequent implementation section records the runtime correction.
- Canonical correction: `references/android/com.tummygames.sliceit/FRESH-INSTALL-TUTORIAL-AUDIT.md`. Raw clean-install evidence: `output/android/com.tummygames.sliceit/fresh-install-audit/`.

## Corrected integrated FTUE implementation

- Replaced the fake one-tap success with the actual reference contract: the first tap changes the silent tutorial state to `air-tap`; only an accepted airborne follow-up completes and persists the lesson.
- Converted the decorative negative space into a real gap and placed the thirteen-slab wall on the far runway. A launch with no follow-up now contacts the opening base and fails with zero cuts instead of sticking safely.
- Corrected airborne physics from an absolute velocity reset to a capped additive vertical impulse. This preserves the reference cadence spectrum: early taps keep height; later taps make lower cutting arcs; spam cannot escalate vertical speed beyond launch velocity.
- Replaced the wrong first-tap runtime assertions. The deterministic FTUE test now proves: idle ready state, first-tap implicit air-tap state, no-follow-up zero-cut failure, 0.85-second follow-up wall cut/tutorial completion, and continued Level 1 completion.
- `npm run test:runtime` and `npm run test:content` pass. Side-by-side proof: `references/android/com.tummygames.sliceit/tutorial-parity-correction.png`.

## 2026-08-03 — canonical Poki Slice Master tutorial rebuild

- User identified the canonical tutorial as Poki's Slice Master, not the previously audited Android
  package. Replaced the prior conclusions and implementation instead of trying to reconcile the two
  different tutorials.
- Captured the real Poki embed in an iPhone 15 viewport with genuine held pointer input. Archived the
  public PlayCanvas scene, config, runtime, and minified production scripts together with a clean
  video and five key frames.
- Verified the actual sequence: world-space `TAP ANYWHERE TO JUMP AND FLIP!`; first tap crosses a
  narrow gap and lands blade-first before a green apple; second planted tap slices the apple with two
  halves, yellow cube debris, a segmented pale trail, and `+1$`.
- Rebuilt Level 1 to that sequence. Removed the thirteen-slab tutorial wall and forced first-run
  failure, hid the regular HUD during the lesson, moved input acceptance to pointer release, and tied
  persistent FTUE completion to the first green apple's physical slice event.
- Copied the shipped reference values for vertical launch speed (11.7), gravity (-23), rotation
  velocity (560 degrees/s), and input cooldown (0.15 s). Forward motion remains scaled to Chopline's
  existing world units.
- Canonical spec and evidence now live under `references/web/com.poki.slice-master/`; downloaded
  source is under `tmp/references/web/com.poki.slice-master/`; video is under
  `output/playwright/slice-master/`.
- Added the matched four-row proof image at
  `references/web/com.poki.slice-master/tutorial-side-by-side.png`: ready, first flip, safe landing,
  and first slice, with the genuine reference frame on the left and Chopline Rush on the right.
- Final `npm run validate:local` passes end to end: typecheck/build, content audit, endless generator,
  runtime smoke (including the new tutorial contract and all 60 authored levels), paced-versus-spam
  bot (`51` versus `1`), all 41 course chunks, and visual baselines.
- Final `npm run proof:mechanics` passes and regenerated
  `tmp/mechanics-proof/mechanics-composite.png`.
