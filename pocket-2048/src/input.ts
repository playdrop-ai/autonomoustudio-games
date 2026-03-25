import type { Direction } from "./board";

interface InputOptions {
  board: HTMLElement;
  onMove: (direction: Direction) => void;
}

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  W: "up",
  a: "left",
  A: "left",
  s: "down",
  S: "down",
  d: "right",
  D: "right",
};

export function attachInput(options: InputOptions): () => void {
  const { board, onMove } = options;
  const threshold = 24;
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;

  const resetPointer = () => {
    pointerId = null;
    startX = 0;
    startY = 0;
  };

  const finishSwipe = (clientX: number, clientY: number) => {
    const deltaX = clientX - startX;
    const deltaY = clientY - startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (Math.max(absX, absY) < threshold) {
      return;
    }

    if (absX > absY) {
      onMove(deltaX > 0 ? "right" : "left");
      return;
    }

    onMove(deltaY > 0 ? "down" : "up");
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    board.setPointerCapture(event.pointerId);
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) {
      return;
    }
    finishSwipe(event.clientX, event.clientY);
    resetPointer();
  };

  const handlePointerCancel = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) {
      return;
    }
    resetPointer();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const direction = KEY_TO_DIRECTION[event.key];
    if (!direction) return;

    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.tagName === "BUTTON" || target.tagName === "INPUT" || target.tagName === "TEXTAREA")
    ) {
      return;
    }

    event.preventDefault();
    onMove(direction);
  };

  board.addEventListener("pointerdown", handlePointerDown);
  board.addEventListener("pointerup", handlePointerUp);
  board.addEventListener("pointercancel", handlePointerCancel);
  window.addEventListener("keydown", handleKeyDown);

  return () => {
    board.removeEventListener("pointerdown", handlePointerDown);
    board.removeEventListener("pointerup", handlePointerUp);
    board.removeEventListener("pointercancel", handlePointerCancel);
    window.removeEventListener("keydown", handleKeyDown);
  };
}
