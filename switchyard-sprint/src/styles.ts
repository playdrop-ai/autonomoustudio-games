export const SWITCHYARD_CSS = `
  .switchyard-app {
    position: fixed;
    inset: 0;
    display: flex;
    min-height: 100dvh;
    padding: 18px;
  }

  .switchyard-shell {
    position: relative;
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .switchyard-stage {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    border: 1px solid rgba(181, 224, 244, 0.12);
    border-radius: 28px;
    background:
      linear-gradient(180deg, rgba(6, 20, 30, 0.44), rgba(8, 26, 36, 0.76)),
      radial-gradient(circle at 20% 20%, rgba(88, 182, 255, 0.08), transparent 24%),
      radial-gradient(circle at 80% 0%, rgba(255, 209, 102, 0.1), transparent 20%);
    box-shadow:
      0 26px 80px rgba(0, 0, 0, 0.32),
      inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .switchyard-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
  }

  .switchyard-hud {
    position: absolute;
    inset: 16px 16px auto 16px;
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(240px, 0.9fr);
    gap: 12px;
    pointer-events: none;
  }

  .switchyard-card {
    display: grid;
    gap: 10px;
    padding: 14px 16px;
    border: 1px solid rgba(181, 224, 244, 0.14);
    border-radius: 18px;
    background: rgba(7, 24, 34, 0.76);
    backdrop-filter: blur(14px);
    box-shadow: 0 16px 28px rgba(0, 0, 0, 0.18);
  }

  .switchyard-card__eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: rgba(237, 247, 251, 0.58);
  }

  .switchyard-card__title {
    font-size: clamp(20px, 2vw, 28px);
    font-weight: 700;
    line-height: 1;
  }

  .switchyard-card__copy {
    font-size: 14px;
    line-height: 1.4;
    color: rgba(237, 247, 251, 0.78);
  }

  .switchyard-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .switchyard-stat {
    display: grid;
    gap: 6px;
    padding: 12px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.04);
  }

  .switchyard-stat__label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(237, 247, 251, 0.56);
  }

  .switchyard-stat__value {
    font-size: clamp(22px, 2vw, 30px);
    font-weight: 700;
    line-height: 1;
  }

  .switchyard-queue {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
  }

  .switchyard-queue-item {
    display: grid;
    place-items: center;
    gap: 8px;
    min-height: 82px;
    padding: 10px 6px;
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(255, 255, 255, 0.04);
  }

  .switchyard-queue-item__dot {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    box-shadow:
      0 0 0 4px rgba(255, 255, 255, 0.08),
      0 10px 22px rgba(0, 0, 0, 0.28);
  }

  .switchyard-queue-item__label {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(237, 247, 251, 0.74);
  }

  .switchyard-controls {
    position: absolute;
    inset: auto 16px 16px 16px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .switchyard-switch {
    position: relative;
    display: grid;
    gap: 8px;
    padding: 16px 18px;
    border: 1px solid rgba(181, 224, 244, 0.14);
    border-radius: 20px;
    background:
      linear-gradient(180deg, rgba(11, 32, 44, 0.94), rgba(8, 24, 34, 0.9));
    color: inherit;
    text-align: left;
    cursor: pointer;
    box-shadow:
      0 18px 40px rgba(0, 0, 0, 0.24),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    transition:
      transform 120ms ease,
      border-color 120ms ease,
      box-shadow 120ms ease;
  }

  .switchyard-switch:hover {
    transform: translateY(-1px);
    border-color: rgba(237, 247, 251, 0.24);
  }

  .switchyard-switch:active {
    transform: translateY(1px);
  }

  .switchyard-switch__index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(237, 247, 251, 0.82);
    font-size: 13px;
    font-weight: 700;
  }

  .switchyard-switch__title {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(237, 247, 251, 0.58);
  }

  .switchyard-switch__route {
    font-size: clamp(18px, 1.6vw, 24px);
    font-weight: 700;
    line-height: 1.1;
  }

  .switchyard-switch__hint {
    font-size: 13px;
    color: rgba(237, 247, 251, 0.66);
  }

  .switchyard-switch[data-accent="blue"] {
    border-color: rgba(88, 182, 255, 0.28);
    box-shadow:
      0 18px 40px rgba(0, 0, 0, 0.24),
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      0 0 0 1px rgba(88, 182, 255, 0.08);
  }

  .switchyard-switch[data-accent="red"] {
    border-color: rgba(255, 108, 99, 0.3);
    box-shadow:
      0 18px 40px rgba(0, 0, 0, 0.24),
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      0 0 0 1px rgba(255, 108, 99, 0.08);
  }

  .switchyard-switch[data-accent="green"] {
    border-color: rgba(103, 219, 148, 0.28);
    box-shadow:
      0 18px 40px rgba(0, 0, 0, 0.24),
      inset 0 1px 0 rgba(255, 255, 255, 0.05),
      0 0 0 1px rgba(103, 219, 148, 0.08);
  }

  .switchyard-overlay {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 18px;
    background: linear-gradient(180deg, rgba(6, 20, 30, 0.2), rgba(6, 20, 30, 0.5));
  }

  .switchyard-overlay[hidden] {
    display: none;
  }

  .switchyard-panel {
    display: grid;
    gap: 14px;
    max-width: min(540px, 100%);
    padding: 24px;
    border: 1px solid rgba(181, 224, 244, 0.16);
    border-radius: 26px;
    background: rgba(7, 24, 34, 0.82);
    backdrop-filter: blur(16px);
    box-shadow: 0 26px 60px rgba(0, 0, 0, 0.3);
  }

  .switchyard-panel__eyebrow {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(237, 247, 251, 0.58);
  }

  .switchyard-panel__title {
    font-size: clamp(34px, 4vw, 52px);
    font-weight: 700;
    line-height: 0.94;
  }

  .switchyard-panel__copy {
    font-size: 15px;
    line-height: 1.55;
    color: rgba(237, 247, 251, 0.8);
  }

  .switchyard-panel__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    color: rgba(237, 247, 251, 0.74);
    font-size: 13px;
  }

  .switchyard-chip {
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
  }

  .switchyard-primary {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    min-height: 54px;
    padding: 0 22px;
    border: 0;
    border-radius: 18px;
    background:
      linear-gradient(135deg, rgba(88, 182, 255, 1), rgba(255, 209, 102, 0.95));
    color: #05121b;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 0.03em;
    cursor: pointer;
    box-shadow: 0 20px 32px rgba(0, 0, 0, 0.2);
  }

  .switchyard-primary:hover {
    transform: translateY(-1px);
  }

  .switchyard-primary:active {
    transform: translateY(1px);
  }

  .switchyard-results {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .switchyard-result {
    padding: 14px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.04);
  }

  .switchyard-result__label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(237, 247, 251, 0.56);
  }

  .switchyard-result__value {
    margin-top: 8px;
    font-size: 26px;
    font-weight: 700;
  }

  .switchyard-desktop-hint {
    font-size: 13px;
    color: rgba(237, 247, 251, 0.62);
  }

  @media (max-width: 1100px) {
    .switchyard-hud {
      grid-template-columns: 1fr;
    }

    .switchyard-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (orientation: portrait) {
    .switchyard-app {
      padding: 12px;
    }

    .switchyard-stage {
      border-radius: 22px;
    }

    .switchyard-hud {
      inset: 12px 12px auto 12px;
    }

    .switchyard-app[data-phase="ready"] .switchyard-hud,
    .switchyard-app[data-phase="ready"] .switchyard-controls,
    .switchyard-app[data-phase="gameover"] .switchyard-hud,
    .switchyard-app[data-phase="gameover"] .switchyard-controls {
      display: none;
    }

    .switchyard-app[data-phase="playing"] .switchyard-hud > :first-child {
      display: none;
    }

    .switchyard-controls {
      inset: auto 12px 12px 12px;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .switchyard-switch {
      gap: 6px;
      padding: 10px 12px;
      border-radius: 18px;
    }

    .switchyard-switch__title {
      font-size: 10px;
    }

    .switchyard-switch__route {
      font-size: 15px;
    }

    .switchyard-switch__hint {
      display: none;
    }

    .switchyard-card__title {
      font-size: 18px;
    }

    .switchyard-queue-item {
      min-height: 68px;
    }

    .switchyard-panel {
      padding: 18px;
      gap: 12px;
    }

    .switchyard-panel__title {
      font-size: 28px;
      line-height: 0.98;
    }

    .switchyard-panel__copy {
      font-size: 14px;
      line-height: 1.45;
    }

    .switchyard-panel__meta {
      gap: 8px;
    }

    .switchyard-app[data-phase="playing"] .switchyard-card {
      gap: 8px;
      padding: 10px 12px;
    }

    .switchyard-app[data-phase="playing"] .switchyard-stats {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 8px;
    }

    .switchyard-app[data-phase="playing"] .switchyard-stat {
      gap: 4px;
      padding: 8px 6px;
    }

    .switchyard-app[data-phase="playing"] .switchyard-stat__label {
      font-size: 9px;
      letter-spacing: 0.12em;
    }

    .switchyard-app[data-phase="playing"] .switchyard-stat__value {
      font-size: 18px;
    }

    .switchyard-app[data-phase="playing"] .switchyard-queue-item {
      min-height: 56px;
      padding: 6px 4px;
      gap: 6px;
    }

    .switchyard-app[data-phase="playing"] .switchyard-queue-item__dot {
      width: 18px;
      height: 18px;
    }

    .switchyard-app[data-phase="playing"] .switchyard-queue-item__label {
      font-size: 10px;
    }

    .switchyard-results {
      grid-template-columns: 1fr;
    }

    .switchyard-desktop-hint {
      display: none;
    }
  }
`;
