import { clamp, length, normalize } from "./math";
import type { ControlInput } from "./sim";

interface PointerState {
  pointerId: number;
  startX: number;
  startY: number;
}

export class InputController {
  private readonly root: HTMLElement;
  private readonly joystickZone: HTMLElement;
  private readonly joystickKnob: HTMLElement;
  private readonly dashButton: HTMLButtonElement;
  private readonly legendDesktop: HTMLElement;
  private readonly legendTouch: HTMLElement;
  private keys = new Set<string>();
  private keyboardX = 0;
  private keyboardY = 0;
  private touchMove = { x: 0, y: 0 };
  private dashQueued = false;
  private pointerState: PointerState | null = null;
  private joystickRadius = 58;
  private touchVisible = false;

  constructor(options: {
    root: HTMLElement;
    joystickZone: HTMLElement;
    joystickKnob: HTMLElement;
    dashButton: HTMLButtonElement;
    legendDesktop: HTMLElement;
    legendTouch: HTMLElement;
  }) {
    this.root = options.root;
    this.joystickZone = options.joystickZone;
    this.joystickKnob = options.joystickKnob;
    this.dashButton = options.dashButton;
    this.legendDesktop = options.legendDesktop;
    this.legendTouch = options.legendTouch;

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    this.joystickZone.addEventListener("pointerdown", this.handlePointerDown);
    window.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerup", this.handlePointerUp);
    window.addEventListener("pointercancel", this.handlePointerUp);
    this.dashButton.addEventListener("pointerdown", this.handleDashPointerDown);

    const coarse = window.matchMedia("(pointer: coarse)");
    coarse.addEventListener("change", this.handlePointerModeChange);
    this.handlePointerModeChange();
  }

  dispose(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.joystickZone.removeEventListener("pointerdown", this.handlePointerDown);
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerUp);
    window.removeEventListener("pointercancel", this.handlePointerUp);
    this.dashButton.removeEventListener("pointerdown", this.handleDashPointerDown);
  }

  setTouchVisible(visible: boolean): void {
    this.touchVisible = visible;
    this.root.classList.toggle("show-touch-controls", visible);
    this.legendDesktop.hidden = visible;
    this.legendTouch.hidden = !visible;
  }

  consumeInput(): ControlInput {
    this.recomputeKeyboardAxes();
    const combined = {
      x: clamp(this.keyboardX + this.touchMove.x, -1, 1),
      y: clamp(this.keyboardY + this.touchMove.y, -1, 1),
    };
    const normalized = length(combined) > 1 ? normalize(combined) : combined;
    const dashPressed = this.dashQueued;
    this.dashQueued = false;
    return {
      moveX: normalized.x,
      moveY: normalized.y,
      dashPressed,
    };
  }

  private recomputeKeyboardAxes(): void {
    const left = this.keys.has("KeyA") || this.keys.has("ArrowLeft");
    const right = this.keys.has("KeyD") || this.keys.has("ArrowRight");
    const up = this.keys.has("KeyW") || this.keys.has("ArrowUp");
    const down = this.keys.has("KeyS") || this.keys.has("ArrowDown");

    this.keyboardX = (left ? -1 : 0) + (right ? 1 : 0);
    this.keyboardY = (up ? -1 : 0) + (down ? 1 : 0);
  }

  private handlePointerModeChange = (): void => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    this.setTouchVisible(coarse);
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (
      event.code === "Space" ||
      event.code === "Enter" ||
      event.code === "NumpadEnter"
    ) {
      this.dashQueued = true;
      event.preventDefault();
      return;
    }

    if (event.code.startsWith("Arrow") || event.code.startsWith("Key")) {
      this.keys.add(event.code);
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private handlePointerDown = (event: PointerEvent): void => {
    if (!this.touchVisible) {
      return;
    }
    this.pointerState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
    this.updateTouchVector(event.clientX, event.clientY);
    this.joystickZone.setPointerCapture(event.pointerId);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.pointerState || event.pointerId !== this.pointerState.pointerId) {
      return;
    }
    this.updateTouchVector(event.clientX, event.clientY);
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (!this.pointerState || event.pointerId !== this.pointerState.pointerId) {
      return;
    }
    this.pointerState = null;
    this.touchMove = { x: 0, y: 0 };
    this.joystickKnob.style.transform = "translate(-50%, -50%)";
  };

  private handleDashPointerDown = (): void => {
    this.dashQueued = true;
  };

  private updateTouchVector(clientX: number, clientY: number): void {
    if (!this.pointerState) {
      return;
    }

    const delta = {
      x: clientX - this.pointerState.startX,
      y: clientY - this.pointerState.startY,
    };

    const magnitude = length(delta);
    const normalized = magnitude > this.joystickRadius ? normalize(delta) : { x: delta.x / this.joystickRadius, y: delta.y / this.joystickRadius };
    this.touchMove = normalized;
    this.joystickKnob.style.transform = `translate(calc(-50% + ${normalized.x * this.joystickRadius}px), calc(-50% + ${normalized.y * this.joystickRadius}px))`;
  }
}
