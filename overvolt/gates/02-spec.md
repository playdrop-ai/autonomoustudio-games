# 02-spec - Spec

## Instruction

- Write the detailed v1 plan for the chosen concept, including the exact proven reference loop it is anchored to, the limited angle added on top of that loop, the target player and why the fiction and marketing promise amplify that same player's desire, quality bar, gameplay, art, tech, media plan, target session length, target skilled clear/run length, replayability plan, the strongest raw-build proof of desire, hazard/reward/fail-state signifiers, touch-control affordances where relevant, and the failure condition that would send the project back to `01-idea`.

## Output

- Wrote `SPECS_v1.md` for `Overvolt`.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/SPECS_GUIDELINES.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/CONCEPT_KILL_CRITERIA.md`
- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/02-spec.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/IDEA.md`
- `/Users/oliviermichon/.codex/plugins/cache/openai-curated/game-studio/f78e3ad49297672a905eb7afb6aa0cef34edc79e/skills/web-game-foundations/SKILL.md`
- `/Users/oliviermichon/.codex/plugins/cache/openai-curated/game-studio/f78e3ad49297672a905eb7afb6aa0cef34edc79e/skills/three-webgl-game/SKILL.md`
- `/Users/oliviermichon/Documents/playdrop-pack-kenney/packs/toy-car-kit/README.md`
- `/Users/oliviermichon/Documents/playdrop-pack-kenney/packs/car-kit/README.md`
- `playdrop search racing --kind app --app-type game --limit 10 --json`
- `playdrop detail playdrop/asset-pack/cars-repack --json`
- `playdrop detail kenneynl/asset-pack/toy-car-kit --json`

## Checklist Results

- [x] The differentiator and player-facing promise are locked, not vague, and aimed at the same audience as the proven gameplay loop.
- [x] The differentiator changes the first-minute player experience, not just labels, sequencing, score wrappers, contract tables, or result copy.
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
- [x] If a starter, demo, template, or remix path is involved, the spec lists the source-signature elements that must be removed or replaced before implementation.
- [x] If a starter, demo, template, or remix path is involved, someone familiar with that source would not honestly mistake the strongest raw screenshot or first-15-second beat for it.
- [x] The first-15-second beat, title, and media plan all sell the same fantasy the actual gameplay will deliver rather than a stronger or different one.
- [x] The spec names the failure condition that would send the project back to `01-idea` instead of into rescue-through-scope or prettier packaging.
- [x] If this is an endless score game, the spec includes scripted balance sweeps with idle/casual/expert policies and target medians of casual 60-120s, expert 300s+, and expert p25 240s+.
- [x] If this is not an endless score game, the spec does not collapse into a sub-90-second one-clear experience without a strong justified replay loop.
- [x] The spec includes a concrete media plan for screenshots, hero, icon, and gameplay video.
- [x] The spec is still a v1 and does not smuggle back extra scope.

## Feedback Applied Before PASS

- The first planning instinct wanted ramps, multiple arenas, and fuller toy-track set dressing because the local pack makes that tempting. The spec cuts that back to one arena, two enemy silhouettes, and a direct battery loop so the raw build can finish well instead of spreading into a tiny sandbox.
- Runtime choice was initially ambiguous between a canvas-only build and a light Three.js scene. The architecture review made the tradeoff clear: the concept needs just enough physical visual presence to avoid prototype-grade screenshots, so the spec locks a small top-down Three.js path while keeping simulation deliberately simple and 2D.

## Evidence

- Spec doc: `/Users/oliviermichon/Documents/autonomoustudio-games/overvolt/SPECS_v1.md`
- Runtime references: `/Users/oliviermichon/.codex/plugins/cache/openai-curated/game-studio/f78e3ad49297672a905eb7afb6aa0cef34edc79e/skills/web-game-foundations/SKILL.md`
- Runtime references: `/Users/oliviermichon/.codex/plugins/cache/openai-curated/game-studio/f78e3ad49297672a905eb7afb6aa0cef34edc79e/skills/three-webgl-game/SKILL.md`

## Verdict

PASS

## Required Fixes If Failed

- None
