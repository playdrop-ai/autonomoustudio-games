# Starfold - SPECS

## Current Release Target

- App: `starfold`
- Version: `1.2.2`
- Platform target: Playdrop `0.5.0`

## Release Goal

Ship a polished Playdrop v0.5 update that keeps Starfold fast and readable while adding light live-service hooks that fit the score-chase loop.

## Must-Have Product Outcomes

- The game must boot cleanly in Playdrop v0.5 and call the SDK init flow correctly.
- Account use must be optional so the game is playable immediately without login friction.
- The app must support preview mode with a ready-to-play board already visible.
- Runs should submit to a live leaderboard when the player is authenticated.
- A small achievement set should reward first clear, ash cleanse, combo play, score progress, major match mastery, and lifetime goals.
- The board presentation should feel cleaner and more premium than v1.0.x.

## Core Gameplay Promise

- Swipe one whole row or column by one cell to set off cascading sigil clears while staged ash spreads across the shrine.
- Fresh ash lands as `ash3`, then takes three neighboring clears to purge: `ash3 -> ash2 -> ash1 -> gone`.
- Runs end when no legal scoring move remains.

## Supported Platforms

- `mobile portrait`: primary
- `mobile landscape`: supported
- `desktop`: supported

## v1.2.2 Feature Scope

- Optional auth with a post-run login prompt instead of a hard gate
- Previewable board state in Playdrop surfaces
- One leaderboard for highest score
- Eleven achievements:
- `first_constellation`
- `ash_purified`
- `triple_chain`
- `shrine_sentinel`
- `cinder_reclaimed`
- `shockwave_rite`
- `sanctum_reset`
- `starfold_legend`
- `ashbreaker_hundred`
- `constellation_mason`
- `three_hundred_guardians`
- Image-based runtime board presentation using the approved shrine background, trimmed gold frame, and bespoke sigil tiles
- Minimal HUD that stays outside the frame on portrait, mobile landscape, and desktop
- Updated listing media, hero art, icon, screenshots, and gameplay recordings
- Remove deprecated Playdrop loading-state calls so hosted play boots without console warnings

## Gameplay Polish Targets

- Elimination chains must resolve smoothly without a visible blink or board-state flash between stages.
- The golden board frame must sit above the tiles, not behind them.
- The inner frame radius must visibly match the softer rounded tile language.
- Portrait play must remain one-handed and legible with minimal HUD weight.
- Mobile landscape and desktop must keep all supporting UI outside the board frame.
- Invalid swipes must snap back without consuming a turn.
- Dragging must pull the chosen row or column with the pointer directly.
- Moving tiles should fade softly as they cross the inner frame edge.

## Visual Direction

- Deep indigo shrine backdrop with faint nebula glow
- Warm gold framing and typography
- Soft enamel-like sigils with strong contrast
- Premium fantasy puzzle presentation for listing art and achievements
- Runtime UI should feel like the listing art instead of a separate overlay skin

## Validation Bar

- `npm run validate`
- `playdrop project validate .`
- Local browser verification on portrait and desktop
- Hosted Playdrop capture on the v0.5 shell
- Fresh listing assets generated or captured for the release
