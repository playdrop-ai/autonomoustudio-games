Original prompt: Create and publish a new game using $playdrop skill.

2026-03-25 23:10 EDT
- Continuing post-release balance tuning for Starfold after the 1.0.2 bug-fix release.
- Current focus: verify that ash pressure ramps hard enough that long runs end reliably and scores stay meaningful.
- Existing local changes already add late-game ash ramp constants plus a simulation script for random and greedy policies.

2026-03-25 23:23 EDT
- Simulation results after tuning: random policy over 300 games averaged 80.65 moves with 0/300 capped at 1500; greedy policy over 30 games averaged 173.53 moves with 0/30 capped at 1500; greedy policy over 20 games with a 3000-move cap still had 0/20 caps and maxed at 235 moves.
- Final late-game balance change: from move 120 onward ash now spawns every move and in bursts of 3, so high-skill runs remain possible but no longer trend toward endless farming.
- Local browser verification on the built `dist/` passed: fresh board rendered cleanly with no intro overlay, drag moves updated score, and ash appeared correctly after several moves.
