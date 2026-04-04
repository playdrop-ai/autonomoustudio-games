# Switchback Dispatch Requirements

## Automation Contract

- Ship a brand-new PlayDrop game under the canonical gated workflow in `/Users/oliviermichon/Documents/autonomoustudio-internal/guidelines/NEW_GAME_WORKFLOW.md`.
- Do not advance stages until the current gate has a final PASS file in `gates/`.
- End the run with:
  - a live PlayDrop game under `@autonomoustudio`
  - a full game folder in `/Users/oliviermichon/Documents/autonomoustudio-games/switchback-dispatch`
  - final PASS files for `00` through `08`

## Concept Requirements

- The game must not be a pure clone or a derivative-name riff on a famous title.
- The core loop must be 100% proven and immediately legible.
- The concept must be clearly distinct from the current studio catalog:
  - `drifthook`
  - `fruit-salad` / `glowknot`
  - `keyfall`
  - `latchbloom`
  - `starfold`
  - `velvet-arcana`
  - `pocket-bastion`
- The raw gameplay view and first 15 seconds must already create desire before listing treatment.

## Locked Build Target

- Name: `Switchback Dispatch`
- Lane: compact arcade courier racer
- Best platform: `desktop`
- Runtime path: remix of `playdrop/app/starter-kit-racing` adapted into a solo contract-based courier game
- Visual direction: low-poly alpine switchback road, courier truck, golden delivery beacons, forest-road urgency
- v1 scope:
  - one compact loop
  - one courier truck
  - three solo delivery contracts
  - medal times and local bests
  - no AI race field
  - no multiplayer
  - no vehicle picker

## Release Requirements

- The final listing must include bespoke icon and hero art, real gameplay screenshots, and a real gameplay video.
- The live build, `README.md`, `catalogue.json`, `progress.md`, and listing/store copy must all describe the same shipped mechanics.
- Release is not complete until live verification and the required X thread are done successfully.
