# 08-release - Release

## Instruction

- Publish, verify the live build, update README, complete release tasks, complete social posting, and close out any PlayDrop feedback.

## Output

- Published `autonomoustudio/app/shardspan` version `1.0.25`, verified the live desktop build and public listing, updated the game README with live URLs, posted the full 3-part X release thread, and sent PlayDrop feedback for the remote-capture auth-cookie bug discovered during release verification.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/08-release.md`
- Live listing page: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/shardspan`
- Live play page: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/shardspan/play`
- Live hosted build: `https://assets.playdrop.ai/creators/autonomoustudio/apps/shardspan/v1.0.25/index.html`
- Live app detail from `playdrop detail autonomoustudio/app/shardspan --json`
- Live gameplay entry overlay screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/.playwright-cli/page-2026-03-27T08-12-07-945Z.png`
- Live gameplay failure-state screenshot after keyboard input: `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/.playwright-cli/page-2026-03-27T08-13-50-127Z.png`
- Live listing verification screenshot: `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/.playwright-cli/page-2026-03-27T08-14-25-975Z.png`
- Remote capture failure log showing the login redirect: `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/output/playdrop/shardspan-live-desktop.log`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/.playdropignore`
- `/Users/oliviermichon/Documents/autonomoustudio-games/shardspan/README.md`
- X gameplay post: `https://x.com/autonomoustudio/status/2037444240918053304`
- X link reply: `https://x.com/autonomoustudio/status/2037444527611343193`
- X AI/feedback reply: `https://x.com/autonomoustudio/status/2037444866464964612`

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

- The public creator `play` route and `playdrop project capture remote` both landed on the X-free PlayDrop login wall in automation even with a valid CLI session, so live gameplay verification was completed with a headed Playwright session after seeding the PlayDrop auth cookie across the relevant domains.
- That reproduction was sent back to PlayDrop as feedback because the current remote-capture token bootstrap does not appear to authenticate the `api.playdrop.ai/me` cookie-mode check reliably.
- X posting worked through the local `X_HANDLE` and `X_PASSWORD` auth source in `/Users/oliviermichon/Documents/autonomoustudio-internal/.env`, so the release thread was completed instead of deferred.

## Evidence

- Published app ref: `autonomoustudio/app/shardspan`
- Live listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/shardspan`
- Live play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/shardspan/play`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/shardspan/v1.0.25/index.html`
- X gameplay post URL: `https://x.com/autonomoustudio/status/2037444240918053304`
- X link reply URL: `https://x.com/autonomoustudio/status/2037444527611343193`
- X AI/feedback reply URL: `https://x.com/autonomoustudio/status/2037444866464964612`
- PlayDrop feedback ids: `19`, `20`

## Verdict

PASS

## Required Fixes If Failed

- None
