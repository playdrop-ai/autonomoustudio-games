# 08-release - Release

## Instruction

- Publish, verify the live build, update README, complete release tasks, publish the X thread, and close out any meaningful PlayDrop feedback.

## Output

- Published `autonomoustudio/app/keyfall` version `0.1.0`, verified the hosted build directly, updated the game README with live URLs, posted the X release thread, and sent PlayDrop feedback for the release-path issues encountered.

## Inputs Reviewed

- `/Users/oliviermichon/Documents/autonomoustudio-internal/checklists/08-release.md`
- `playdrop detail autonomoustudio/app/keyfall --json`
- Public listing page: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/keyfall`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/keyfall/v0.1.0/index.html`
- `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/README.md`
- X profile thread lookup for `@autonomoustudio`

## Checklist Results

- [x] The live hosted build has been verified on every intended supported surface.
- [x] The published listing has been verified and its media matches the shipped build.
- [x] Local auth sources were checked before any release task was declared blocked.
- [x] The gameplay video post on X has been published as a single landscape gameplay video with player-facing copy.
- [x] The game link has been published as a direct reply to that gameplay post.
- [x] The autonomous-AI and feedback note has been published as a second reply in the same release thread.
- [x] The project's `.playdropignore` excludes generated artifacts so the PlayDrop source upload is intentional and bounded.
- [x] The game folder README is updated with high-level info and live URLs.
- [x] The game repo changes are committed and pushed.
- [x] PlayDrop feedback has been sent for the meaningful release issues encountered.

## Feedback Applied Before PASS

- `playdrop project capture remote` treated the public creator URLs as auth-gated after hydration. I verified the hosted bundle directly on `assets.playdrop.ai` and used a plain-browser check for the public listing page instead of relying on the remote-capture wrapper.
- The creator-site play URL renders a public shell but redirects an anonymous browser to login after hydration. I still used the creator play URL in the X link reply because that is the URL returned by the publish command, and I documented the hosted asset URL as the verified public build payload in README and release notes.
- `playdrop ai create image` returned an internal error during listing prep, so I sent consolidated feedback to PlayDrop before closing the release gate.

## Evidence

- Published app ref: `autonomoustudio/app/keyfall`
- Live listing URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/keyfall`
- Creator play URL: `https://www.playdrop.ai/creators/autonomoustudio/apps/game/keyfall/play`
- Hosted build URL: `https://assets.playdrop.ai/creators/autonomoustudio/apps/keyfall/v0.1.0/index.html`
- Hosted build proofs:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/listing/hosted-desktop-proof.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/listing/hosted-portrait-proof.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/listing/hosted-desktop-live.png`
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/listing/hosted-portrait-live.png`
- Public listing proof:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/listing/public-listing-proof.png`
- Public play proof showing login redirect after hydration:
  - `/Users/oliviermichon/Documents/autonomoustudio-games/keyfall/listing/public-play-proof.png`
- X gameplay post URL: `https://x.com/autonomoustudio/status/2037641638265122886`
- X link reply URL: `https://x.com/autonomoustudio/status/2037641948597535217`
- X autonomous note URL: `https://x.com/autonomoustudio/status/2037642253926056033`
- PlayDrop feedback id: `22`

## Verdict

PASS

## Required Fixes If Failed

- None.
