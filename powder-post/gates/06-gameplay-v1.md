# 06-gameplay-v1 - Gameplay Review

## Instruction

- Run the pre-publish gameplay review and reject the build if the loop, fantasy, readability, supported-surface quality, or plain-build desirability are not strong enough for listing work.

## Output

- Reviewed the real current build on its best platform and additional supported surface through the local PlayDrop dev router plus Playwright.
- Confirmed the endless-run balance sweep still hits the required casual and expert targets.
- Captured supported-surface evidence for start, active gameplay, manual carving, and game-over states before starting listing work.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/CONCEPT_KILL_CRITERIA.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/V1_GATE_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/06-gameplay-v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/balance-report.txt`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/impl-desktop-start-v3.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/impl-desktop-autoplay-v3.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/impl-mobile-autoplay-v2.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/impl-mobile-manual-carve-v1.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/impl-desktop-gameover-v2.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/impl-mobile-gameover-v1.png`
- `playdrop project dev .`
- Local Playwright playtest against `http://127.0.0.1:8888/apps/dev/autonomoustudio/game/powder-post/index.html`

## Review Verdict

- PASS. The shipped build reads as a downhill courier slalom with immediate left-right gate-choice pressure and visible avalanche chase, not as a bare ski clone with renamed labels.
- The differentiator is lived in the first minute: matching the parcel crest to the correct gate changes the line the player wants immediately, while the storm bar punishes hesitation and misses.
- The strongest current screenshots already look like a deliberate game frame rather than a generic webpage shell or a prototype waiting for marketing rescue.

## Blocking Issues

- None.

## Polish Issues

- Keep the final hero and icon family visually close to the in-engine minimal winter palette so listing art does not oversell the live build.

## Next Step Recommendation

- Proceed to `07-listing-media` using real-build captures first, then generate hero and icon assets from those captures.

## Checklist Results

- [x] The core loop is readable, immediately understandable, clearly fun, and still recognizable as a proven lane rather than a novel grammar experiment.
- [x] The honest plain-English description of the shipped build is not just "famous game X with this skin."
- [x] A player familiar with any starter, demo, template, or remix source would not honestly call the shipped build "that source plus a wrapper."
- [x] The first 15 seconds create desire, not just understanding.
- [x] The first 15 seconds, title, and wrapper all point at the same audience that actually enjoys the underlying loop.
- [x] The build does not rely on teaching a new core interaction language before the player can feel the hook.
- [x] The chosen best platform clearly feels best.
- [x] Additional supported surfaces do not compromise the best platform experience.
- [x] Performance is good enough on every supported surface.
- [x] Gameplay presentation is edge to edge and does not look like a webpage card.
- [x] Active gameplay is free of nonessential UI clutter.
- [x] HUD elements stay in safe, intentional positions on every supported surface and do not overlap the frame or active gameplay.
- [x] Covered, revealed, flagged, hazardous, and rewarding states are immediately distinguishable on the smallest supported surface.
- [x] Start and game-over screens do not occlude critical playfield.
- [x] Start and game-over layouts keep stats, supporting copy, and CTA separated without overlap.
- [x] Hazard, reward, and fail-state signifiers are intuitive; the thing that kills the run does not read like the thing the player wants.
- [x] The player's lived fantasy and main verb feel desirable in motion, not perverse, joyless, or contrary to the promise that got the click.
- [x] On touch surfaces, frequent secondary actions have explicit affordances and high-stakes actions are not hidden behind ambiguous long-press or accidental taps.
- [x] Loss proximity is glanceable and next-preview clearly communicates what, where, and when.
- [x] The game quality matches `SIMPLIFY_v1.md`, not the pre-simplify wish list.
- [x] If this is an endless score game, the balance has been swept with idle/casual/expert policies and the target medians hold: casual `60-120s`, expert `300s+`, and expert p25 `240s+`.
- [x] If this is not an endless score game, the build has enough session depth or replayability to feel like a real game rather than a sub-minute demo.
- [x] A competent player cannot fully exhaust the shipped build in under `90` seconds unless the replay loop is already clearly strong and explicitly justified by the concept.
- [x] The strongest plain-build screenshot or raw gameplay clip already looks worth clicking before bespoke listing art.
- [x] The strongest screenshot or opening clip stays distinct even without relying on title text, menu copy, or listing art to explain why it is not the source template/demo.
- [x] The build would still sound appealing if marketed honestly in one sentence, without relying on a misleading wrapper.
- [x] If the concept still feels weaker than the best-known game in the same lane with no real angle of its own, the build fails even if technically coherent.
- [x] The live game presentation is strong enough that the shipped marketing art does not materially oversell it.
- [x] There are no obvious gameplay, UX, art, or polish failures left for the release gate to catch.

## Feedback Applied Before PASS

- I added a real manual-carve playtest pass on mobile-landscape instead of relying only on autoplay captures so the best-platform input judgment is grounded in exercised input, not just simulation.
- I added a true mobile-landscape game-over capture before passing the gate so the overlay and stat-card review covered both supported surfaces.
- The hosted `playdrop project capture` dev URL still returns `404`, so the evidence for this gate comes from the working local PlayDrop dev router plus Playwright screenshots and debug state reads.

## Evidence

- Balance sweep: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/balance-report.txt`
- Desktop start review: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/impl-desktop-start-v3.png`
- Desktop gameplay review: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/impl-desktop-autoplay-v3.png`
- Mobile gameplay review: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/impl-mobile-autoplay-v2.png`
- Mobile manual input review: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/impl-mobile-manual-carve-v1.png`
- Desktop game-over review: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/impl-desktop-gameover-v2.png`
- Mobile game-over review: `/Users/oliviermichon/Documents/autonomoustudio-games/powder-post/output/playwright/impl-mobile-gameover-v1.png`

## Verdict

PASS

## Required Fixes If Failed

- None
