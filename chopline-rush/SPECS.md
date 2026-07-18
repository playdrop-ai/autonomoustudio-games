# Chopline Rush - SPECS

`catalogue.json.design` is the canonical product definition. This file records the user-facing acceptance criteria for the current build.

## Product

- Mobile portrait is the primary surface; desktop is compatibility mode.
- One mode only: an endless run for the best score.
- Submit the best score to the PlayDrop `endless_score` leaderboard.
- Every successful target cut awards one score point and one soft coin.
- Coins unlock knife upgrades and world themes. There are no levels, quests, revives, ad rewards, paid coin packs, or other metagame systems in the player-facing flow.

## Gameplay Target

- Use `Slice It All!` by VOODOO as the behavioral, visual-composition, animation, and polish quality reference.
- Reproduce observed behavior with original code and licensed PlayDrop assets; do not redistribute extracted proprietary code or assets.
- Taps launch the planted knife and remain responsive while it is airborne.
- Each airborne tap adds bounded lift and rotation while preserving forward momentum.
- Contact order determines the result: blade-first target contact cuts, while handle-first contact never scores or splits a target and produces a readable upward/backward bounce.
- The knife and target course share the same centerline. A normal opening strike must keep its forward momentum and controlled rotation while the blade cuts each course it physically reaches.
- Tip-first platform contact plants the blade with a short impact squash, sound, haptic pulse, shadow response, and restrained camera kick.
- Successful cuts replace the intact target with two persistent physical halves with visible interior caps; chips are secondary feedback only.
- Untouched target courses remain intact. Each accepted course shows its own +1 and two exposed halves with a bright target-specific interior cap.
- Cut halves separate clearly in the portrait side view, tumble, fall forward, contact the ground, and settle without colliding explosively with other fresh fragments.
- The authored endless opening is pedestal, thirteen-course wall, orange stacks, yellow face target, camera props, then reviewed reusable chunks.

## Visual Target

- Bright cyan sky, green ground, white and gray course blocks, low-poly mountain bands, and pine silhouettes.
- Side-on perspective camera that keeps the knife large and previews the next target.
- The starter uses the specified broad PlayDrop chopping-knife GLB with its source texture preserved, explicit semantic anchors, and collision geometry derived from the real tip, hilt, and handle end.
- HUD contains only score, best, coins, pause, gear, and the initial tap prompt.
- Target cuts show `+1`, occasional praise, audio, haptics, a brief impact hold, flash, and restrained camera feedback.

## Release Bar

- Typecheck, build, content checks, runtime checks, and PlayDrop project validation pass.
- Portrait playtest proves startup, repeated airborne taps, a successful cut, a tip landing, failure, restart, knife selection, theme selection, and leaderboard submission path.
- Portrait listing screenshots show the real endless run and visible split geometry.
- Keep a validated local PlayDrop dev URL running for user review before release.
