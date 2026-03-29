# Wickstreet

## Original Game Name

Wickstreet

## One-line Player-facing Value Proposition

Race a tiny lamplighter through a rain-soaked block grid, carry matching glow cores to darkened homes, and keep the blackout from swallowing the neighborhood.

## Best Platform

`mobile landscape`

## Additional Supported Platforms

- `desktop`

## Gameplay Family

Top-down courier route arcade.

## Game Meta

Endless score chase built around chained light deliveries, next-request planning, and rising street-closure pressure.

## Input

- Mobile landscape: drag anywhere on the playfield to steer the courier toward your finger.
- Desktop: move with `WASD` or arrow keys, with mouse-hold steering as a secondary option.

## Game Category And Subcategory

- Category: Arcade
- Subcategory: Blackout courier chase

## Reference Games

- `Paperboy` for the delivery fantasy only, not for lane structure, violence, or suburban satire.
- `Pac-Man Championship Edition` for compressed route pressure and reroute mastery only.
- `Mini Motorways` for readable street-grid planning and color-coded destination clarity only.
- `playdrop/app/avatar-topdown-controller` for realistic PlayDrop movement scope and landscape support.
- `playdrop/app/pool-game` for honest low-chrome landscape presentation quality.

## Art Direction

Blue-hour toy town seen from a high top-down camera: charcoal roads glazed with rain reflections, warm amber windows, saturated mailbox sigils, soft puddle bloom, a tiny courier in a bright yellow slicker, and just enough neon edge light to make every active route readable in one glance.

## Why The Art Direction Is Achievable

The shipped look can be built from simple 2D tiles, gradients, puddle reflections, and a handful of reusable building, curb, cone, and courier shapes. It does not require character rigging, physics-heavy vehicles, or a large asset pipeline. Kenney town and UI packs are available as fallback references, but the v1 can stand on bespoke vector-like art and lighting alone.

## Why This Concept Supports A Real Player Session

The run is not just "deliver one package." Every successful light drop rerolls the next request, advances the storm phase, and changes which streets stay open. The player is constantly reading both the active home and the next-request preview while deciding whether to cut through risky alleys or take a safer outer block. That creates a real 2-to-5-minute mastery target instead of a one-clear novelty.

## What Keeps Players Engaged After The First Good Run

- route mastery across a small but changing street grid
- a next-request preview that rewards planning instead of pure reaction
- tightening timers that turn clean movement into a score multiplier
- rerolled flood barriers that keep the same map from feeling solved
- streak bonuses that make one more clean delivery feel materially valuable

## Why The Game Is Distinct From The Studio's Existing Catalog

`Starfold`, `Latchbloom`, `Keyfall`, and `Drifthook` are all portrait-first, system-facing score chases. `Pocket Bastion` is landscape, but it is a lane defense game. `Wickstreet` is a landscape-first, avatar-driven route game about moving through a living town under storm pressure. Its fantasy, camera, and interaction model are all different from the existing catalog.

## Why This Concept Deserves To Exist

The hook is not "our version of a delivery game." The player fantasy is keeping a whole block alive one perfect route at a time, watching warm windows blink back on while the storm closes streets behind them. The combination of landscape movement, blackout relighting, and next-route planning gives the game a clear player-facing identity beyond theme swap or presentation polish.
