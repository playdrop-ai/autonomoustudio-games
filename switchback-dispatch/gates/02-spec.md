# 02-spec - Spec

## Instruction

- Write the detailed v1 plan for the chosen concept, including the exact proven reference loop, the differentiator, platform, gameplay, art, tech, first-15-second hook, session structure, media plan, and the failure condition that would send the project back to `01-idea`.

## Output

- Wrote `SPECS_v1.md` locking `Switchback Dispatch` as a three-contract desktop courier racer on one compact alpine loop.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/SPECS_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/CONCEPT_KILL_CRITERIA.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/02-spec.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/IDEA.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/SPECS_v1.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/tmp/starter-kit-racing-src/src/main.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/tmp/starter-kit-racing-src/src/data/track-layout.ts`

## Checklist Results

- [x] The differentiator and player-facing promise are locked, not vague, and aimed at the same audience as the proven gameplay loop.
- [x] The spec defines the target player and explains why the fiction, story wrapper, and marketing promise increase desire for that same player.
- [x] The best platform is justified and additional platforms are limited and worth the compromise.
- [x] The core interaction quality bar is specific, including alignment, spacing, motion, and readability.
- [x] The HUD and screen plan are minimal and do not waste gameplay space.
- [x] The art direction is concrete enough to evaluate, including camera, palette, materials, and scale.
- [x] The implementation approach is realistic for the team's current tools and PlayDrop workflow.
- [x] Hazard, reward, and fail-state signifiers are locked so players will instantly read what is safe, valuable, and dangerous.
- [x] If touch is a primary surface, the input plan exposes frequent secondary actions explicitly and avoids accidental high-stakes taps.
- [x] The spec includes target player session length, target skilled clear/run length, and a concrete replayability plan.
- [x] The spec defines the strongest raw screenshot, clip, or first-15-second beat that should make the game feel worth clicking before marketing treatment.
- [x] The first-15-second beat, title, and media plan all sell the same fantasy the actual gameplay will deliver rather than a stronger or different one.
- [x] The spec names the failure condition that would send the project back to `01-idea` instead of into rescue-through-scope or prettier packaging.
- [x] If this is an endless score game, the spec includes scripted balance sweeps with idle/casual/expert policies and target medians of casual 60-120s, expert 300s+, and expert p25 240s+.
- [x] If this is not an endless score game, the spec does not collapse into a sub-90-second one-clear experience without a strong justified replay loop.
- [x] The spec includes a concrete media plan for screenshots, hero, icon, and gameplay video.
- [x] The spec is still a v1 and does not smuggle back extra scope.

## Feedback Applied Before PASS

- I initially kept mobile landscape alive because the starter supports it, but that weakened the best-platform story and would have forced extra HUD and control work. I cut it in the spec instead of letting it linger into simplify.
- I also rejected an endless courier mode for v1. It made balance verification harder and weakened the "small but real game" session story, so the spec now uses three medal-based contracts with clear completion states.
- The first draft kept too much starter-kit baggage, including vehicle choice and broader demo affordances. The locked spec narrows the build to one truck, one loop, one camera, and three contracts.

## Evidence

- Spec doc: `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch/SPECS_v1.md`
- Starter feasibility references inspected in `/Users/oliviermichon/Documents/autonomoustudio-internal/tmp/starter-kit-racing-src`

## Verdict

PASS

## Required Fixes If Failed

- None
