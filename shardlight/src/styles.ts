export const styles = `
  :root {
    color-scheme: dark;
    font-family: "Avenir Next", "Nunito Sans", "Trebuchet MS", sans-serif;
    --bg-0: #16171c;
    --bg-1: #241f1b;
    --bg-2: #4f3a28;
    --sand-0: #d0a46a;
    --sand-1: #8a6036;
    --sand-2: #533723;
    --sand-3: #2d1d13;
    --ink: #fff1d2;
    --muted: rgba(255, 241, 210, 0.66);
    --amber: #ffca68;
    --amber-strong: #ffb347;
    --danger: #ff6d3f;
    --obsidian: #17120f;
    --line: rgba(255, 244, 220, 0.1);
    --tile-gap: 0.38rem;
    --safe-top: env(safe-area-inset-top, 0px);
    --safe-bottom: env(safe-area-inset-bottom, 0px);
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    min-height: 100%;
    background:
      radial-gradient(circle at 16% 18%, rgba(247, 180, 90, 0.16), transparent 24%),
      radial-gradient(circle at 84% 24%, rgba(171, 107, 60, 0.2), transparent 22%),
      radial-gradient(circle at 62% 86%, rgba(61, 36, 20, 0.42), transparent 28%),
      linear-gradient(160deg, var(--bg-0) 0%, var(--bg-1) 48%, var(--bg-2) 100%);
    color: var(--ink);
    overscroll-behavior: none;
    touch-action: manipulation;
  }

  body {
    min-height: 100vh;
  }

  button,
  input {
    font: inherit;
  }

  .app {
    position: relative;
    min-height: 100vh;
    padding:
      calc(var(--safe-top) + 1rem)
      1rem
      calc(var(--safe-bottom) + 1rem);
    display: grid;
    place-items: center;
    overflow: hidden;
    user-select: none;
  }

  .ambience {
    position: absolute;
    pointer-events: none;
    border-radius: 999px;
    opacity: 0.9;
    filter: blur(8px);
  }

  .ambience--a {
    inset: 6% auto auto -8%;
    width: 14rem;
    height: 14rem;
    background: rgba(247, 180, 90, 0.09);
  }

  .ambience--b {
    inset: auto -10% 18% auto;
    width: 18rem;
    height: 18rem;
    background: rgba(120, 77, 46, 0.16);
  }

  .dune {
    position: absolute;
    inset: auto -10% -10% -10%;
    height: 26%;
    background: radial-gradient(circle at 50% 0%, rgba(20, 15, 12, 0.94), rgba(20, 15, 12, 0.88));
    border-radius: 50% 50% 0 0 / 40% 40% 0 0;
    pointer-events: none;
  }

  .board-shell {
    position: relative;
    width: min(92vw, 42rem);
    min-height: min(80vh, 54rem);
    border-radius: 2rem;
    background: linear-gradient(160deg, var(--sand-2), var(--sand-3));
    box-shadow:
      0 0.35rem 0 rgba(18, 13, 11, 0.56),
      0 1.4rem 3rem rgba(0, 0, 0, 0.32);
    padding: 0.82rem;
    transition: transform 180ms ease, box-shadow 220ms ease;
    z-index: 2;
  }

  .board-shell.is-clearing {
    transform: scale(1.012);
    box-shadow:
      0 0.35rem 0 rgba(18, 13, 11, 0.56),
      0 0 0 0.14rem rgba(255, 202, 104, 0.18),
      0 1.6rem 3.2rem rgba(255, 179, 71, 0.18);
  }

  .board-inner {
    position: relative;
    min-height: calc(min(80vh, 54rem) - 1.64rem);
    border-radius: 1.6rem;
    background: linear-gradient(180deg, #cfa365 0%, #784f2f 100%);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1rem;
    padding: 1rem 1.15rem 0.8rem;
  }

  .hud-block {
    display: grid;
    gap: 0.14rem;
  }

  .hud-block:last-child {
    text-align: right;
  }

  .hud-label {
    font-size: 0.72rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .hud-value {
    font-size: clamp(1.75rem, 4vw, 2rem);
    line-height: 1;
    font-weight: 800;
    color: var(--ink);
  }

  .board-stage {
    position: relative;
    flex: 1;
    margin: 0 0.65rem 0.75rem;
    padding: 0.7rem;
    border-radius: 1.35rem;
    background:
      linear-gradient(180deg, rgba(91, 64, 37, 0.78), rgba(70, 46, 28, 0.78)),
      linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 28%);
    overflow: hidden;
  }

  .board {
    position: relative;
    z-index: 2;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    grid-template-rows: repeat(10, minmax(0, 1fr));
    gap: var(--tile-gap);
  }

  .mural-layer {
    position: absolute;
    inset: 0.7rem;
    z-index: 1;
    pointer-events: none;
    overflow: hidden;
  }

  .mural-core,
  .mural-halo,
  .mural-trace,
  .mural-gem {
    position: absolute;
    border-radius: 999px;
    filter: blur(2px);
    opacity: 0.28;
  }

  .mural-core {
    background: radial-gradient(circle, rgba(255, 211, 122, 0.6), rgba(255, 179, 71, 0.08) 72%);
  }

  .mural-halo {
    background: radial-gradient(circle, rgba(255, 211, 122, 0.22), rgba(255, 179, 71, 0));
  }

  .mural-trace {
    height: 1rem;
    transform-origin: left center;
    background: linear-gradient(90deg, rgba(255, 211, 122, 0.35), rgba(255, 179, 71, 0.12));
  }

  .mural-gem {
    width: 1.35rem;
    height: 1.35rem;
    background: linear-gradient(135deg, rgba(255, 241, 210, 0.92), rgba(255, 179, 71, 0.28));
    transform: rotate(45deg);
    border-radius: 0.28rem;
  }

  .cell {
    position: relative;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 0.92rem;
    padding: 0;
    line-height: 1;
    cursor: pointer;
    transition:
      transform 120ms ease,
      box-shadow 180ms ease,
      background 180ms ease,
      opacity 180ms ease;
    -webkit-tap-highlight-color: transparent;
  }

  .cell:focus-visible {
    outline: 0.16rem solid rgba(255, 202, 104, 0.72);
    outline-offset: 0.08rem;
  }

  .cell--covered {
    background: linear-gradient(145deg, #d7b181, #8b613a);
    box-shadow:
      inset 0 0.12rem 0 rgba(255, 241, 210, 0.22),
      inset 0 -0.16rem 0 rgba(88, 55, 30, 0.38);
  }

  .cell--covered::before {
    content: "";
    position: absolute;
    inset: 12% 10% auto;
    height: 18%;
    border-radius: 999px;
    background: rgba(255, 241, 210, 0.2);
  }

  .cell--covered:active {
    transform: scale(0.97);
  }

  .cell--revealed {
    background: linear-gradient(145deg, rgba(232, 215, 183, 0.56), rgba(180, 138, 89, 0.24));
    box-shadow: inset 0 0 0 0.08rem rgba(255, 241, 210, 0.08);
    cursor: default;
  }

  .cell--flagged {
    color: var(--amber-strong);
    text-shadow: 0 0 0.35rem rgba(255, 179, 71, 0.18);
  }

  .cell--mine {
    color: var(--ink);
  }

  .cell--exploded {
    background: linear-gradient(145deg, rgba(255, 125, 86, 0.78), rgba(124, 39, 19, 0.62));
    color: #2f130c;
  }

  .cell__content {
    position: relative;
    z-index: 1;
    font-weight: 800;
    font-size: clamp(1rem, 2.8vw, 1.45rem);
  }

  .cell--digit-1 { color: #67c9ff; }
  .cell--digit-2 { color: #6be18c; }
  .cell--digit-3 { color: #ffbe59; }
  .cell--digit-4 { color: #ff7460; }
  .cell--digit-5 { color: #e4c8ff; }
  .cell--digit-6 { color: #8ce5ff; }
  .cell--digit-7 { color: #ffd7ce; }
  .cell--digit-8 { color: #fff1d2; }

  .cell--pulse {
    animation: reveal-pop 220ms ease;
  }

  @keyframes reveal-pop {
    0% { transform: scale(0.9); }
    70% { transform: scale(1.02); }
    100% { transform: scale(1); }
  }

  .sheet {
    position: absolute;
    left: 50%;
    bottom: calc(var(--safe-bottom) + 1rem);
    transform: translateX(-50%);
    width: min(92vw, 35rem);
    padding: 0.9rem;
    border-radius: 1.65rem;
    background: rgba(20, 15, 12, 0.76);
    box-shadow:
      0 0.28rem 0 rgba(18, 13, 11, 0.52),
      0 1.3rem 2.6rem rgba(0, 0, 0, 0.3);
    z-index: 3;
    transition: opacity 180ms ease, transform 180ms ease;
  }

  .sheet--hidden {
    opacity: 0;
    pointer-events: none;
    transform: translateX(-50%) translateY(1.2rem);
  }

  .sheet__inner {
    display: grid;
    gap: 0.45rem;
    padding: 1rem 1rem 1.15rem;
    border-radius: 1.3rem;
    background: rgba(47, 34, 25, 0.96);
    text-align: center;
  }

  .sheet__eyebrow {
    font-size: 0.74rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .sheet__title {
    margin: 0;
    font-size: clamp(2rem, 5vw, 2.75rem);
    line-height: 1.04;
    font-weight: 800;
    color: var(--ink);
  }

  .sheet__copy {
    margin: 0;
    font-size: 1.08rem;
    color: rgba(255, 241, 210, 0.82);
  }

  .sheet__score {
    font-size: clamp(2.4rem, 7vw, 3.2rem);
    font-weight: 800;
    line-height: 1;
    color: var(--ink);
  }

  .button {
    justify-self: center;
    min-width: 11.5rem;
    border: 0;
    border-radius: 999px;
    padding: 0.9rem 1.4rem;
    font-size: 1.25rem;
    font-weight: 800;
    color: #482b15;
    background: linear-gradient(135deg, #ffd88a, #ffad43);
    box-shadow: 0 0.22rem 0 rgba(137, 82, 26, 0.45);
    cursor: pointer;
  }

  .button:active {
    transform: translateY(0.08rem);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (min-aspect-ratio: 4 / 3) {
    .board-shell {
      width: min(42vw, 39rem);
      min-height: min(84vh, 52rem);
    }

    .sheet {
      width: min(42vw, 32rem);
    }
  }

  @media (max-width: 520px) {
    .board-shell {
      width: min(88vw, 24rem);
      min-height: min(74vh, 48rem);
    }

    .board-inner {
      min-height: calc(min(74vh, 48rem) - 1.64rem);
    }

    .topbar {
      padding: 0.82rem 0.92rem 0.72rem;
    }

    .sheet {
      bottom: calc(var(--safe-bottom) + 0.6rem);
      width: min(88vw, 22rem);
      padding: 0.72rem;
      border-radius: 1.4rem;
    }

    .sheet__inner {
      gap: 0.35rem;
      padding: 0.82rem 0.86rem 0.96rem;
    }

    .sheet__title {
      font-size: clamp(1.78rem, 8vw, 2.3rem);
    }

    .sheet__copy {
      font-size: 0.98rem;
    }

    .button {
      min-width: 10rem;
      padding: 0.78rem 1.2rem;
      font-size: 1.1rem;
    }
  }
`;
