# Ratio-native ImageGen production log

Built-in ImageGen was used for every 2:3 and 3:4 static adaptation. The approved portrait and landscape masters were supplied together for each card, with strict instructions to preserve the existing concept, exact headline, character identity, UFO, palette, materials, and truthful game promise.

## Shared constraints

- Use case: `ads-marketing`.
- Match the approved polished low-poly 3D mobile game illustration.
- Recompose natively for the requested ratio.
- Render the approved headline verbatim and exactly once.
- Preserve generous safe margins.
- No mechanical crop, stretched artwork, borders, filler, badges, watermarks, extra UI, or invented mechanics.

## 01 Hero

References:

- `assets/marketing/playdrop/hero-portrait-9x16-v3.png`
- `assets/marketing/playdrop/hero-landscape-16x9-v3.png`

Text:

> FLIGHTY
> SAUCER

Composition:

- low-poly sunrise sky and mountains;
- monolith gates framing the scene;
- cute turquoise alien in the purple UFO;
- cyan lift beam;
- title upper-middle and UFO below it.

## 02 Tap to Fly

References:

- `assets/marketing/playdrop/screenshots/portrait/01-tap-to-fly-9x16.png`
- `assets/marketing/playdrop/screenshots/landscape/01-tap-to-fly-16x9.png`

Text:

> TAP TO
> FLY

Composition:

- bright alpine sunrise;
- monolith gates establish the obstacle;
- UFO in the middle;
- one white cartoon hand and one glowing tap ring in the lower third.

## 03 Dodge the Unexpected

References:

- `assets/marketing/playdrop/screenshots/portrait/02-dodge-the-unexpected-9x16.png`
- `assets/marketing/playdrop/screenshots/landscape/02-dodge-the-unexpected-16x9.png`

Text:

> DODGE
> THE
> UNEXPECTED

Composition:

- deep blue aurora night;
- UFO near the center-left;
- distinct black crystal hazards with orange-red cores;
- bright cyan weaving escape path.

## 04 Five Worlds. One Flight.

References:

- `assets/marketing/playdrop/screenshots/portrait/03-five-worlds-one-flight-9x16.png`
- `assets/marketing/playdrop/screenshots/landscape/03-five-worlds-one-flight-16x9.png`

Text:

> FIVE WORLDS.
> ONE FLIGHT.

Composition:

- exactly five distinct environments: alpine sunrise, tropical islands, desert canyon, moonlit forest, and icy aurora mountains;
- one continuous cyan flight path;
- one small UFO.

## 05 Beat Your Best

References:

- `assets/marketing/playdrop/screenshots/portrait/04-beat-your-best-9x16.png`
- `assets/marketing/playdrop/screenshots/landscape/04-beat-your-best-16x9.png`

Text:

> BEAT YOUR
> BEST
> 888

Composition:

- blue hyperspeed sky and aurora streaks;
- crown and 888 large in the upper-middle;
- UFO racing through the lower half;
- no gate tubes.

## Final output mapping

Each 2:3 ImageGen output was uniformly resized from 1024x1536 to 1000x1500 for `pinterest/static/`.

Each 3:4 ImageGen output was uniformly resized from 1086x1448 to 1080x1440 for `instagram/feed/carousel/`.

The 420x654 Reels cover uses the 2:3 hero derivative, with a narrow symmetric trim confined to its mask-safe framing columns.
