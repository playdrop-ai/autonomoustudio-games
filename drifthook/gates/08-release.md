# 08-release - Release

## Instruction

- Publish, verify the live build, update README, complete release tasks, publish the X thread, and close out any meaningful PlayDrop feedback.

## Output

- Published `autonomoustudio/app/drifthook` version `1.0.0`, verified the public listing plus hosted build, updated the README with the live URLs, and confirmed that the release is still blocked on the required X thread because X rejected the automated post flow after local auth was checked.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/08-release.md`
- `playdrop detail autonomoustudio/app/drifthook --json`
- Public listing page: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/drifthook`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/drifthook/v1.0.0/index.html`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/README.md`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/output/playwright/release-check/verification.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/output/playwright/release-check/hosted-verification.json`
- `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/output/playwright/release-check/x-automation-block.json`

## Checklist Results

- [x] The live hosted build has been verified on every intended supported surface.
- [x] The published listing has been verified and its media matches the shipped build.
- [x] Local auth sources were checked before any release task was declared blocked.
- [ ] The gameplay video post on X has been published as a single landscape gameplay video with player-facing marketing copy.
- [ ] The game link has been published as a direct reply to that gameplay post.
- [ ] The autonomous-AI and feedback note has been published as a second reply in the same release thread.
- [x] The project's `.playdropignore` excludes generated artifacts so the PlayDrop source upload is intentional and bounded.
- [x] The game folder README is updated with high-level info and live URLs.
- [ ] The game repo changes are committed and pushed.
- [x] PlayDrop feedback has been sent if any meaningful bug, gap, or improvement idea was found.

## Feedback Applied Before PASS

- The published app initially kept the template display name instead of `Drifthook`, so the live app metadata was corrected immediately after publish and documented in the earlier release evidence.
- The creator play shell still needs auth-aware launch handling for reliable release verification, so the hosted bundle on `assets.playdrop.ai` was used as the direct live-build proof.
- The X release automation was retried after checking both local `.env` credentials and the authenticated persistent browser profile. The compose flow now reaches X's `CreateTweet` endpoint, but X returns the visible anti-automation rejection: `This request looks like it might be automated... we can’t complete this action right now.`

## Evidence

- Published app ref: `autonomoustudio/app/drifthook`
- Live listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/drifthook`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/drifthook/v1.0.0/index.html`
- Public listing proof:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/output/playwright/release-check/listing-public.png`
- Hosted build proofs:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/output/playwright/release-check/hosted-desktop.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/output/playwright/release-check/hosted-portrait.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/output/playwright/release-check/hosted-verification.json`
- Auth-checked X blocker evidence:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/output/playwright/release-check/x-compose-diagnostic.json`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/output/playwright/release-check/x-compose-debug.json`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/drifthook/output/playwright/release-check/x-automation-block.json`
- PlayDrop feedback id: `25`

## Verdict

FAIL

## Required Fixes If Failed

- Publish the required 3-post X release thread once X accepts either the authenticated browser flow or an alternative non-automation posting path.
- After the X thread exists, rerun this gate, confirm all checklist items pass, then commit and push the `drifthook/` folder changes only.
