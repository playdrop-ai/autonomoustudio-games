import type { Vec2 } from './config';

export interface InputState {
  keys: Set<string>;
  pointerActive: boolean;
  pointer: Vec2;
}

export interface InputBindings {
  state: InputState;
  destroy(): void;
}

const MOVE_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D']);

export function attachInput(target: HTMLElement): InputBindings {
  const state: InputState = {
    keys: new Set<string>(),
    pointerActive: false,
    pointer: { x: 0, y: 0 },
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!MOVE_KEYS.has(event.key)) {
      return;
    }
    state.keys.add(event.key);
    event.preventDefault();
  };
  const onKeyUp = (event: KeyboardEvent) => {
    if (!MOVE_KEYS.has(event.key)) {
      return;
    }
    state.keys.delete(event.key);
    event.preventDefault();
  };
  const onPointerDown = (event: PointerEvent) => {
    state.pointerActive = true;
    state.pointer = { x: event.clientX, y: event.clientY };
    target.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    state.pointer = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent) => {
    state.pointerActive = false;
    target.releasePointerCapture(event.pointerId);
  };
  const onPointerCancel = (event: PointerEvent) => {
    state.pointerActive = false;
    target.releasePointerCapture(event.pointerId);
  };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  target.addEventListener('pointerdown', onPointerDown);
  target.addEventListener('pointermove', onPointerMove);
  target.addEventListener('pointerup', onPointerUp);
  target.addEventListener('pointercancel', onPointerCancel);

  return {
    state,
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      target.removeEventListener('pointerdown', onPointerDown);
      target.removeEventListener('pointermove', onPointerMove);
      target.removeEventListener('pointerup', onPointerUp);
      target.removeEventListener('pointercancel', onPointerCancel);
    },
  };
}

export function resolveMovement(input: InputState, playerScreenPosition: Vec2): Vec2 {
  let x = 0;
  let y = 0;

  if (input.keys.has('ArrowLeft') || input.keys.has('a') || input.keys.has('A')) {
    x -= 1;
  }
  if (input.keys.has('ArrowRight') || input.keys.has('d') || input.keys.has('D')) {
    x += 1;
  }
  if (input.keys.has('ArrowUp') || input.keys.has('w') || input.keys.has('W')) {
    y -= 1;
  }
  if (input.keys.has('ArrowDown') || input.keys.has('s') || input.keys.has('S')) {
    y += 1;
  }
  if (x !== 0 || y !== 0) {
    return { x, y };
  }
  if (!input.pointerActive) {
    return { x: 0, y: 0 };
  }
  return {
    x: input.pointer.x - playerScreenPosition.x,
    y: input.pointer.y - playerScreenPosition.y,
  };
}
