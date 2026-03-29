# 02-spec - Spec

## Instruction

- Write the detailed v1 plan for the chosen concept, including quality bar, gameplay, art, tech, media plan, target session length, target skilled clear/run length, and replayability plan.

## Output

- Wrote `SPECS_v1.md` for `Wickstreet`, locking the route-planning courier loop, storm ramp, quality bar, tech plan, and media plan.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/SPECS_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/02-spec.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/IDEA.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/tmp/avatar-topdown/source/src/main.ts`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/tmp/avatar-topdown/source/src/movement.ts`
- `playdrop detail playdrop/app/avatar-topdown-controller --json`
- `playdrop detail playdrop/app/starter-kit-match-3 --json`
- `playdrop detail playdrop/app/pool-game --json`

## Checklist Results

- [x] The differentiator and player-facing promise are locked, not vague.
- [x] The best platform is justified and additional platforms are limited and worth the compromise.
- [x] The core interaction quality bar is specific, including alignment, spacing, motion, and readability.
- [x] The HUD and screen plan are minimal and do not waste gameplay space.
- [x] The art direction is concrete enough to evaluate, including camera, palette, materials, and scale.
- [x] The implementation approach is realistic for the team's current tools and PlayDrop workflow.
- [x] The spec includes target player session length, target skilled clear/run length, and a concrete replayability plan.
- [x] If this is an endless score game, the spec includes scripted balance sweeps with idle/casual/expert policies and target medians of casual `60-120s`, expert `300s+`, and expert p25 `240s+`.
- [x] If this is not an endless score game, the spec does not collapse into a sub-90-second one-clear experience without a strong justified replay loop.
- [x] The spec includes a concrete media plan for screenshots, hero, icon, and gameplay video.
- [x] The spec is still a v1 and does not smuggle back extra scope.

## Feedback Applied Before PASS

- The first pass at the spec tried to leave room for multiple neighborhoods and more than one moving hazard family. That was too loose for a v1. I reduced the plan to one fixed map, one closure family, and one storm ramp so the scope can actually clear the implementation and release gates.
- An earlier rules draft only showed the active request, which made the loop too reactive. I kept a compact next-request preview because it strengthens the differentiator without materially bloating the build.

## Evidence

- Spec doc: `/Users/oliviermichon/Documents/autonomoustudio-games/wickstreet/SPECS_v1.md`
- Top-down movement reference reviewed before locking feasibility
- Endless-score balance targets and scripted policy requirement explicitly written into the spec

## Verdict

PASS

## Required Fixes If Failed

- None
