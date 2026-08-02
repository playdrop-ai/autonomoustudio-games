# Block Burst Specs

Block Burst is a PlayDrop puzzle game built as a clean TypeScript Phaser project.

Players drag three chunky pieces onto an 8 by 8 grid. Full rows and columns burst away, combo clears create special blocks, and the run ends when none of the current pieces fit. The v1 focus is a readable solo score chase with optional PlayDrop login, one highest-score leaderboard, rewarded ads for revive and hammer help, and interstitial ads between replay attempts.

Rewarded ads must remain player-initiated and economically capped: allow one
rewarded revive per run, offer a rewarded hammer only when the balance is zero,
and grant exactly one hammer after a completed ad. Never allow overlapping ad
requests. Do not attempt an interstitial until the player has been in the current
app session for at least 30 seconds, or within 30 seconds of any rewarded or
interstitial ad the player completed or dismissed. A skipped or failed
interstitial must never prevent `PLAY AGAIN` from restarting the game.
After a completed rewarded revive, including the device-proven active-overlay
SDK timeout case, close the result overlay and resume the same round exactly once.

At the first no-moves state of each run, offer exactly one rewarded revive. Use
the concise `REVIVE` action with an inline rewarded-video icon. There is no free
revive. Once used, only `PLAY AGAIN` remains. The result panel uses the framed,
score-forward approved mockup without the decorative five-block strip. `REVIVE`
and `PLAY AGAIN` must always use identical button dimensions.

On the result panel, show `BEST {score}` when the run did not beat the score that
was current when the run began. Otherwise show `NEW BEST {score}` in gold. Center
`{N} LINES` and `TOP COMBO x{N}` in equal stat columns using one consistent text
style. Result buttons use one solid rounded fill, one thin border, and plain bold
labels without shadows.

Use `TOP COMBO x{N}` for the combo stat. Both result stats use the same font size,
reduced by 10 percent from the prior result-panel style. Keep the revive button in
place but visibly disabled when its one use has already been consumed or PlayDrop
reports that no rewarded ad is ready.

The game should use the Block Burst name, original runtime code, generated visuals, PlayDrop listing art, and no copied third-party assets or external game naming.

The selected runtime background uses a dark Cinder Plum material on portrait and
landscape surfaces. Its square motifs must be rendered in Phaser and breathe with
slow, low-opacity fades. Subtle coral and cyan light packets should travel along
the diagonal seams so the screen feels gently active without competing with the
board, score, tray, or clear effects.

The PlayDrop identity art uses the same Cinder Plum world and beveled jewel-block
materials. Its icon must communicate one straight line bursting at thumbnail
size without text or UI. Both hero compositions use the exact `BLOCK BURST` title
and a crossed row-and-column clear as the main fantasy, with the hammer kept as a
secondary supporting tool.

Mobile portrait keeps its centered board with a horizontal three-piece tray below.
Desktop and landscape use the earlier split composition: the board sits on the left
and the three available pieces stack vertically in a tray to its right. Keep the
desktop board and tray lower to leave a clear score-and-best band, and align the
hammer to the tray's vertical centerline. The full-bleed background plate and
animated seam paths still adapt to the aspect ratio.

The runtime must render at up to 2x device pixel density. The measured grid seam
color is `#0A0E1A`, the empty-cell face is `#181C2F`, and the subtle empty-cell top
edge is `#181F33`. Grid gaps and frame widths scale with cell size so these colors
retain the same visible proportions as the selected art direction.

Show the saved best score beneath the current score whenever one is available.
Keep all three tray pieces large and tactile. On the first local play session,
show exactly four occupied cells in one row and one four-block piece in the middle
tray slot. Loop the approved hand cue from that piece to the row's four-cell gap.
Accept only that demonstrated placement, burst the completed row so the board is
immediately empty, then deal the normal three-piece set, persist tutorial
completion locally, and continue the same run without an overlay. Keep the hammer
out of this opening lesson; its existing contextual instruction appears when the
player selects it later.

Only combo streaks may show transient gameplay text (`COMBO xN`, for `N >= 2`).
Do not show generic praise, score-gain, new-best, or availability toasts.

Every cleared block emits small beveled fragments in that block's own color.
Fragments use Phaser Arcade Physics: they launch outward with varied size,
rotation, and velocity, fall under gravity, collide with one another and the
screen bounds, then fade after a short lifetime. Use 2-4 fragments per block at
combo x1, 2-5 at x2, 2-6 at x3, 3-6 at x4, and 4-6 at x5 or above. Apply a
bounded per-clear safety ceiling only for unusually large clears so the effect
does not overwhelm the board or mobile frame time.

PlayDrop preview mode is a deterministic, self-playing presentation of real game
actions. Hide the score, best, hammer controls, hints, result overlays, and all
other HUD while it runs. Show the approved studio hand with its fingertip anchored
to the real contact point, plus a restrained touch ring. Each move must visibly
press, lift, drag, release, and then commit through the normal placement and clear
logic. Cycle through authored line-clear and combo moments with a quiet transition,
without accepting player input, showing ads, or writing preview progress to local
or PlayDrop persistence. Static named QA capture states may keep their HUD.
