# Flighty Saucer AppLovin interstitial package

This package contains the reviewed portrait paid-ad pair for Flighty Saucer:

- `portrait/video.mp4`: focused 9:16 mechanic-to-crash video.
- `portrait/end-card.png`: separate clean branded end card.
- `portrait/poster.png`: representative video poster.
- `project/`: locked brief, edit manifest, and reproducible render script.
- `review/`: complete-motion and key-moment review evidence.

The video uses real HUD-free gameplay from the approved continuous preview run.
The separate end card is a byte-for-byte copy of the approved protected 9:16
hero. It intentionally contains no fake install button, store badge, rating, or
duplicate AppLovin metadata.

Run the renderer from the game root:

```sh
node assets/marketing/applovin-interstitial/project/render-video.mjs
```

Rendering does not upload, register, fund, or launch an AppLovin campaign.
