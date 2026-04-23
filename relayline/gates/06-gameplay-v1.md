# 06-gameplay-v1 - Gameplay Review

## Instruction

- Run the pre-publish gameplay gate on the shipped v1 build and decide whether the raw game already deserves listing work.

## Output

- Reviewed the live implementation on its best platform first, then on the declared desktop support surface.
- Collected raw gameplay evidence from real browser sessions before any bespoke listing art or capture polish.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/V1_GATE_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/06-gameplay-v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/SIMPLIFY_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/gates/05-implementation.md`
- Raw browser evidence:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/portrait-start-seed4242.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/portrait-live-seed4242.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/portrait-win-seed4242.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/desktop-1280x720.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/portrait-320x568-start.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/portrait-320x568-live.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/portrait-320x568-flagmode.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/relayline/output/playwright/portrait-win-state.json`

## Gameplay Review Verdict

- Verdict: PASS
- Blocking issues: none
- Polish issues: none that should stop listing work
- Next step recommendation: move to `07-listing-media` and keep the media faithful to the raw build quality instead of trying to sell a different game.

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
- [x] If this is an endless score game, the balance has been swept with idle/casual/expert policies and the target medians hold: casual 60-120s, expert 300s+, and expert p25 240s+.
- [x] If this is not an endless score game, the build has enough session depth or replayability to feel like a real game rather than a sub-minute demo.
- [x] A competent player cannot fully exhaust the shipped build in under 90 seconds unless the replay loop is already clearly strong and explicitly justified by the concept.
- [x] The strongest plain-build screenshot or raw gameplay clip already looks worth clicking before bespoke listing art.
- [x] The strongest screenshot or opening clip stays distinct even without relying on title text, menu copy, or listing art to explain why it is not the source template/demo.
- [x] The build would still sound appealing if marketed honestly in one sentence, without relying on a misleading wrapper.
- [x] If the concept still feels weaker than the best-known game in the same lane with no real angle of its own, the build fails even if technically coherent.
- [x] The live game presentation is strong enough that the shipped marketing art does not materially oversell it.
- [x] There are no obvious gameplay, UX, art, or polish failures left for the release gate to catch.

## Notes Behind The PASS

- The proven hook is still plainly Minesweeper-readable, but the shipped objective is route completion rather than sterile full-board cleanup. That is enough angle to stop the game from reading like a pure clone while staying inside a legible lane.
- The first actionable screen sells the exact fantasy the build delivers: a compact, touch-first circuit puzzle with immediate source, relay, and overload signifiers.
- Portrait is clearly the strongest surface. Desktop keeps the same stage without introducing clutter or browser-card framing, so the extra support surface does not dilute the main experience.
- The touch secondary action is explicit through the persistent flag chip. There is no hidden long-press dependency or accidental high-stakes tap path.
- Loss proximity is handled by the three surge pips. There is no spawn-preview mechanic in this lane, so there is no missing future-state preview to explain.
- The random-board replay loop and three board sizes keep the build from feeling like a one-solve toy even though an expert can clear a warm board quickly.

## Evidence

- Best-platform browser QA: portrait Playwright session at `390x844`
- Smallest supported sanity pass: portrait Playwright session at `320x568`
- Additional supported surface QA: desktop Playwright session at `1280x720`
- Deterministic review seed: `4242`

## Verdict

PASS

## Required Fixes If Failed

- None
