# Chopline Rush

Mobile-first 3D knife-flip game for PlayDrop. The product is one endless run: tap to add a bounded jump and rotation, cut targets for score and coins, and plant the blade to continue.

## Product Scope

- Portrait is primary; desktop is compatibility mode.
- The opening uses authored wall, orange, face-target, and camera beats observed in the gameplay reference.
- The wall awards seven points once, then becomes non-scoring rigidbody rubble.
- Cut targets create separated geometry with visible caps and Rapier-driven motion.
- Coins unlock the six licensed knife models and three world themes.
- Best score submits to the PlayDrop `endless_score` leaderboard.

Reference APKs, extracted proprietary assets, and decompiler output are internal evidence only and are not distributed with this app.

## Local Workflow

- `npm install`
- `npm run validate:local`
- `npm run proof:mechanics`
- `playdrop project check .`
- `playdrop project dev .`

Use the official PlayDrop portrait capture flow for release evidence. Test hooks and staged proof scenes are supplemental diagnostics only.
