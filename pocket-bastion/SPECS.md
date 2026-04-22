# Pocket Bastion v1

## Goal
Ship a super simple top-down tower defense game in one pass using the Playdrop-discovered Kenney `tower-defense-top-down` asset pack.

## Scope
- One fixed zigzag lane on a 12x8 tile board
- Three buildable tower types on fixed pads
- Six authored waves with fast escalation
- Desktop and mobile-landscape friendly HUD
- Win and loss states
- Pure simulation module covered by tests
- Playdrop validation, capture, and publish

## Towers
- `Pulse`: cheap rapid-fire single-target turret
- `Frost`: medium-cost slow turret with lower damage
- `Rocket`: expensive splash turret for clustered enemies

## Enemies
- `Scout`: fast and fragile
- `Bruiser`: slower and tougher
- `Crawler`: heavy target with high leak damage

## Quality bar
- Playable in under five seconds
- Canvas reserved for the playfield, DOM reserved for the HUD
- Clear click targets for build pads
- Readable state at a glance: wave, scrap, core health, next action
- No extra systems beyond the core loop
