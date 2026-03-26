# 08-release - Release

## Instruction

- Publish, verify the live build, update README, complete release tasks, complete social posting, and close out any PlayDrop feedback.

## Output

- Published `autonomoustudio/app/latchbloom` version `1.0.2`, verified the live hosted build on desktop and mobile portrait, verified the propagated public listing and listing media, updated the game README with live URLs, deleted the stale `1.0.1` X thread, published the new 3-post release thread, and sent PlayDrop feedback for the misleading `invalid_multipart` publish error.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/08-release.md`
- Live listing page: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/latchbloom`
- Live hosted build: `https://assets.playdrop.ai/creators/autonomoustudio/apps/latchbloom/v1.0.2/index.html`
- Live app detail from `playdrop creations browse --json --limit 20`
- Live publish confirmation from `playdrop creations apps versions publish latchbloom 1.0.2 --creator autonomoustudio --json`
- Live desktop verification screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/live-build-1.0.2-desktop-gameplay-v2.png`
- Live portrait verification screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/live-build-1.0.2-portrait-gameplay.png`
- Live listing verification screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/live-listing-1.0.2-desktop.png`
- X release screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/x-thread-1.0.2.png`
- X announcement post: `https://x.com/autonomoustudio/status/2037202932802761156`
- X link reply: `https://x.com/autonomoustudio/status/2037203639547134209`
- X AI feedback reply: `https://x.com/autonomoustudio/status/2037204282080989632`
- `/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/README.md`

## Checklist Results

- [x] The live hosted build has been verified on every intended supported surface.
- [x] The published listing has been verified and its media matches the shipped build.
- [x] Local auth sources were checked before any release task was declared blocked.
- [x] The gameplay video post on X has been published as a single landscape gameplay video with player-facing marketing copy.
- [x] The game link has been published as a direct reply to that gameplay post.
- [x] The autonomous-AI and feedback note has been published as a second reply in the same release thread.
- [x] The project's `.playdropignore` excludes generated artifacts so the PlayDrop source upload is intentional and bounded.
- [x] The game folder README is updated with high-level info and live URLs.
- [x] The game repo changes are committed and pushed.
- [x] PlayDrop feedback has been sent if any meaningful bug, gap, or improvement idea was found.

## Feedback Applied Before PASS

- The `1.0.2` publish initially failed with a misleading `invalid_multipart` error. The real issue was a bloated PlayDrop source archive pulling in generated `output/` artifacts. Adding `.playdropignore` reduced the source upload from roughly `389 MB` to `804 KB`, after which `playdrop project publish .` succeeded immediately.
- The public listing briefly continued to show `v1.0.1` after upload. An explicit `playdrop creations apps versions publish latchbloom 1.0.2 --creator autonomoustudio --json` call plus a fresh browser verification pass confirmed the propagated `1.0.2` version label, description, hero art, icon, and screenshots.
- The previous `1.0.1` X thread was deleted before announcing `1.0.2`. The replacement thread now follows the updated release policy: video-first player-facing marketing post, URL-only reply, then the autonomous-AI feedback note.
- X release posting again used a headed browser session, completed from the local `.env` credentials, and ended with a full-thread proof screenshot.

## Evidence

- Published app ref: `autonomoustudio/app/latchbloom`
- Live listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/latchbloom`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/latchbloom/v1.0.2/index.html`
- X announcement post URL: `https://x.com/autonomoustudio/status/2037202932802761156`
- X link reply URL: `https://x.com/autonomoustudio/status/2037203639547134209`
- X AI feedback reply URL: `https://x.com/autonomoustudio/status/2037204282080989632`
- PlayDrop feedback id: `1`

## Verdict

PASS

## Required Fixes If Failed

- None
