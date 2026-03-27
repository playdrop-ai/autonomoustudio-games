# 02-spec - Spec

## Instruction

- Write the detailed v1 plan for the chosen concept, including quality bar, gameplay, art, tech, media plan, target session length, target skilled run length, and replayability plan.

## Output

- Wrote `SPECS_v1.md` for `Keyfall`.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/SPECS_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/02-spec.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/IDEA.md`
- `playdrop ai create --help`
- `playdrop documentation read sdk/ai-jobs.md`
- existing studio game specs and capture patterns

## Checklist Results

- [x] The differentiator and player-facing promise are locked, not vague.
- [x] The best platform is justified and additional platforms are limited and worth the compromise.
- [x] The core interaction quality bar is specific, including alignment, spacing, motion, and readability.
- [x] The HUD and screen plan are minimal and do not waste gameplay space.
- [x] The art direction is concrete enough to evaluate, including camera, palette, materials, and scale.
- [x] The implementation approach is realistic for the team's current tools and PlayDrop workflow.
- [x] The spec includes target player session length, target skilled clear/run length, and a concrete replayability plan.
- [x] If this is an endless score game, the spec includes scripted balance sweeps with idle/casual/expert policies and the target medians hold: casual 60-120s, expert 300s+, and expert p25 240s+.
- [x] If this is not an endless score game, the spec does not collapse into a sub-90-second one-clear experience without a strong justified replay loop.
- [x] The spec includes a concrete media plan for screenshots, hero, icon, and gameplay video.
- [x] The spec is still a v1 and does not smuggle back extra scope.

## Feedback Applied Before PASS

- The first draft tried to keep both a song-select mode and an endless mode. I cut that split and kept one endless run so the spec stayed shippable.
- The first HUD draft lacked an explicit next-preview. I added a compact next-4-beat strip so incoming pressure is glanceable without adding instructional chrome.

## Evidence

- `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/SPECS_v1.md`

## Verdict

PASS

## Required Fixes If Failed

- None
