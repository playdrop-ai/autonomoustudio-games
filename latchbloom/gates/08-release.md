# 08-release - Release

## Instruction

- Publish, verify the live build, update README, complete release tasks, complete social posting, and close out any PlayDrop feedback.

## Output

- Published `autonomoustudio/app/latchbloom` version `1.0.0`, verified the live listing and hosted build on supported surfaces, updated the game README with release URLs, published both X posts, and sent PlayDrop feedback for the reproduced template-scaffold bug.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/08-release.md`
- Live listing page: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/latchbloom`
- Live hosted build: `https://assets.playdrop.ai/creators/autonomoustudio/apps/latchbloom/v1.0.0/index.html`
- Live app detail from `playdrop detail autonomoustudio/app/latchbloom --json`
- Live desktop verification screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/live-desktop.png`
- Live portrait verification screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/live-portrait.png`
- Live listing verification screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/live-listing.png`
- X release screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/x-with-replies.png`
- X gameplay post: `https://x.com/autonomoustudio/status/2037131460713279686`
- X link post: `https://x.com/autonomoustudio/status/2037131960246571058`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/README.md`

## Checklist Results

- [x] The live hosted build has been verified on every intended supported surface.
- [x] The published listing has been verified and its media matches the shipped build.
- [x] Local auth sources were checked before any release task was declared blocked.
- [x] The gameplay video post on X has been published as a single landscape gameplay video.
- [x] The game link has been published as a reply to that gameplay post.
- [x] The game folder README is updated with high-level info and live URLs.
- [x] The game repo changes are committed and pushed.
- [x] PlayDrop feedback has been sent if any meaningful bug, gap, or improvement idea was found.

## Feedback Applied Before PASS

- The hosted asset URL was verified directly in addition to the creator listing so the release gate reflects the real public gameplay entrypoint on desktop and mobile portrait.
- X release posting used a headed persistent browser session. The login flow completed cleanly there, and the gameplay post plus link reply were both published in the same authenticated session.

## Evidence

- Published app ref: `autonomoustudio/app/latchbloom`
- Live listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/latchbloom`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/latchbloom/v1.0.0/index.html`
- X gameplay post URL: `https://x.com/autonomoustudio/status/2037131460713279686`
- X link post URL: `https://x.com/autonomoustudio/status/2037131960246571058`
- PlayDrop feedback id: `16`

## Verdict

PASS

## Required Fixes If Failed

- None
