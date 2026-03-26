# 08-release - Release

## Instruction

- Publish, verify the live build, update README, complete release tasks, complete social posting, and close out any PlayDrop feedback.

## Output

- Published `autonomoustudio/app/latchbloom` version `1.0.3`, verified the live hosted build on desktop and mobile portrait, verified the propagated public listing and corrected listing media, updated the game README with live URLs, and recorded the user-approved defer of X posting after repeated suspicious browser friction in the authenticated flow.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/08-release.md`
- Live listing page: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/latchbloom`
- Live hosted build: `https://assets.playdrop.ai/creators/autonomoustudio/apps/latchbloom/v1.0.3/index.html`
- Live app detail from `playdrop creations browse --json --limit 20`
- Live publish confirmation from `playdrop creations apps versions publish latchbloom 1.0.3 --creator autonomoustudio --json`
- Live desktop verification screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/live-build-1.0.3-desktop-gameplay.png`
- Live portrait verification screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/live-build-1.0.3-portrait-gameplay.png`
- Live listing verification screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/live-listing-1.0.3-desktop.png`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/README.md`

## Checklist Results

- [x] The live hosted build has been verified on every intended supported surface.
- [x] The published listing has been verified and its media matches the shipped build.
- [x] Local auth sources were checked before any release task was declared blocked.
- [ ] The gameplay video post on X has been published as a single landscape gameplay video with player-facing marketing copy.
- [ ] The game link has been published as a direct reply to that gameplay post.
- [ ] The autonomous-AI and feedback note has been published as a second reply in the same release thread.
- [x] The project's `.playdropignore` excludes generated artifacts so the PlayDrop source upload is intentional and bounded.
- [x] The game folder README is updated with high-level info and live URLs.
- [x] The game repo changes are committed and pushed.
- [x] PlayDrop feedback has been sent if any meaningful bug, gap, or improvement idea was found.

## Feedback Applied Before PASS

- The first `1.0.3` blocker was not the game itself but the art pipeline: the earlier `1.0.2` release had used fallback composites because PlayDrop AI generation was intermittently failing. Once the CLI was updated and real generation recovered, the hero pair, icon, and gameplay backdrops were regenerated properly and swapped into the live listing and build.
- The `1.0.3` publish path hit source-size pressure again until the refreshed listing assets were heavily quantized. With `.playdropignore` in place and the listing media compressed, `playdrop project publish .` and the explicit version publish both succeeded.
- The PlayDrop CLI had drifted back to the wrong creator session during the recovery work. Re-authenticating from the local `.env` restored `autonomoustudio (prod)`, after which the publish and live verification were done on the correct account.
- X posting was attempted again from the authenticated browser profile, but the composer flow repeatedly reintroduced cookie-mask / suspicious-activity-like friction after upload. Per explicit user instruction, X was deferred rather than forcing a brittle or misleading social closeout.

## Evidence

- Published app ref: `autonomoustudio/app/latchbloom`
- Live listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/latchbloom`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/latchbloom/v1.0.3/index.html`
- PlayDrop feedback ids: `1`, `18`
- Game repo commit: `d8f69fe`
- X status: deferred by user on `2026-03-26` after repeated browser-platform friction during authenticated posting.

## Verdict

PASS (user-approved X defer)

## Required Fixes If Failed

- Complete the replacement 3-post X thread once the platform-side posting friction is resolved.
