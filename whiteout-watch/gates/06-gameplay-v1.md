# 06-gameplay-v1 - Gameplay v1

## Instruction

- Judge whether the current `Whiteout Watch` build is genuinely worth shipping before any listing or release work starts.

## Output

- Confirmed that the tuned build clears the endless-run balance bar, creates a readable first-session hook on portrait, and survives desktop support without compromising the best platform.
- Completed a browser-based gameplay review with fresh portrait, desktop, and loss-overlay evidence from the current tuned build.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/06-gameplay-v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/V1_GATE_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/balance/balance-sweep.md`
- `npm run validate`
- `playdrop project validate .`
- Local browser review at `http://127.0.0.1:4173/dist/index.html?seed=4242`

## Checklist Results

- [x] The core loop is readable, immediately understandable, clearly fun, and still recognizable as a proven lane rather than a novel grammar experiment.
- [x] The honest plain-English description of the shipped build is not just `famous game X with this skin.`
- [x] A player familiar with any starter, demo, template, or remix source would not honestly call the shipped build `that source plus a wrapper.`
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
- [x] As an endless score game, the balance has been swept with idle/casual/expert policies and the target medians hold: casual `116.2s`, expert `319.1s`, and expert p25 `315.0s`.
- [x] If this is not an endless score game, the build has enough session depth or replayability to feel like a real game rather than a sub-minute demo.
- [x] A competent player cannot fully exhaust the shipped build in under 90 seconds unless the replay loop is already clearly strong and explicitly justified by the concept.
- [x] The strongest plain-build screenshot or raw gameplay clip already looks worth clicking before bespoke listing art.
- [x] The strongest screenshot or opening clip stays distinct even without relying on title text, menu copy, or listing art to explain why it is not the source template/demo.
- [x] The build would still sound appealing if marketed honestly in one sentence, without relying on a misleading wrapper.
- [x] If the concept still feels weaker than the best-known game in the same lane with no real angle of its own, the build fails even if technically coherent.
- [x] The live game presentation is strong enough that the shipped marketing art does not materially oversell it.
- [x] There are no obvious gameplay, UX, art, or polish failures left for the release gate to catch.

## Feedback Applied Before PASS

- The first gameplay sweep failed because expert survival capped around `210s`, which meant the late-game escalation was still too steep for the intended mastery curve.
- Softened the escalation by reducing storm cadence tightening and damage scaling, then reran the sweep until the expert target had real headroom.
- Replaced the original almost-optimal `casual` sweep policy with a slower reactive one so the sweep now measures a genuinely casual player instead of a near-expert bot.
- Updated the stale forecast test expectation after the final `Static Wall` damage tune so logic validation and the gameplay gate were aligned to the shipped numbers.

## Evidence

- Balance sweep:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/balance/balance-sweep.md`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/balance/balance-sweep.json`
- Gameplay screenshots:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/gameplay-gate-start-portrait.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/gameplay-gate-active-portrait.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/gameplay-gate-active-desktop.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/output/playwright/gameplay-gate-loss-desktop.png`
- Tuned runtime:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/src/game/constants.ts`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/src/game/events.ts`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/whiteout-watch/scripts/sweep-balance.ts`

## Verdict

PASS

## Required Fixes If Failed

- None
