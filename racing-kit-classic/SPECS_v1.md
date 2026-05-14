# Racing Kit Classic Specs v1

## Scope

Remix the April 8, 2026 Starter Kit Racing sample into an autonomoustudio PlayDrop `GAME`.

## Required Features

- Raceable low-poly track with vehicle physics.
- Vehicle picker for trucks and motorcycle.
- Desktop, touch, and gamepad controls.
- Optional auth flow for multiplayer.
- Track selector and editor from the source baseline.
- Listing media and metadata suitable for PlayDrop publish.

## Non-Goals

- Do not port the later procedural racing rewrite.
- Do not add new gameplay systems beyond the April 8 baseline.
- Do not change the source asset set except for naming and catalogue conversion.

## Acceptance

- `npm run validate` passes.
- `playdrop project validate .` passes.
- The app publishes under `autonomoustudio` as `racing-kit-classic`.
