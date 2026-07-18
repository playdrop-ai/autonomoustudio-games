# Chopline Rush

Mobile-first 3D knife-flip arcade game for PlayDrop. One endless run: tap to flip the knife
forward, slice everything the blade reaches, plant the blade to keep going, and chase the
leaderboard best.

## Product Scope

- Portrait is primary; desktop is compatibility mode.
- One mode only: endless. No levels, revives, ads, or paid currency.
- Every successful cut awards one point and one coin.
- Coins unlock five additional knife models and two extra world themes.
- Best score submits to the PlayDrop `endless_score` leaderboard.

## Code Layout

- `src/main.ts` is the whole game. The gameplay feel lives in one tuning table near the top
  (`TUNING` section); everything else is scene building, collision, effects, UI, and PlayDrop
  glue, in clearly-marked sections. `SPECS.md` describes the motion model the code implements.
- `template.html` holds all markup and CSS; the build inlines the bundled script into it.
- `assets/` holds the licensed PlayDrop knife models, audio, and marketing sources.

## Local Workflow

- `npm install`
- `npm run validate:local` (typecheck, build, content audit, generator audit, runtime smoke)
- `npm run proof:mechanics` (deterministic gameplay-mechanics proof with captures)
- `playdrop project check .`
- `playdrop project dev .`

Use the official PlayDrop portrait capture flow for release evidence.
