import {
  GAMEPAD_DEADZONE,
  GAMEPAD_MENU_DEADZONE,
  STEERING_DRAG_RANGE,
  STEERING_KNOB_TRAVEL,
} from './constants';
import type {
  ControlsSnapshot,
  DesktopControlHintsElements,
  OverlayNavigationSource,
  TouchControlsElements,
} from './shared';
import { clamp } from './utils';

type ControlsControllerOptions = {
  touchControls: TouchControlsElements;
  desktopControlHints: DesktopControlHintsElements;
  onOverlayActionRequested: (source: OverlayNavigationSource) => void;
  onSelectVehicleRelative: (delta: number) => void;
  onActivationGesture: (source: 'keyboard' | 'pointer') => void;
};

type TouchButtonBinding = {
  element: HTMLElement;
  setActive: (active: boolean) => void;
};

function readButtonPressed(button: GamepadButton | undefined) {
  return Boolean(button && (button.pressed || button.value > 0.5));
}

function readButtonValue(button: GamepadButton | undefined) {
  return button ? (button.pressed ? Math.max(button.value, 1) : button.value) : 0;
}

function applyDeadzone(value: number, deadzone: number) {
  if (Math.abs(value) <= deadzone) {
    return 0;
  }
  return clamp(value, -1, 1);
}

export class ControlsController {
  readonly isTouchDevice =
    window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

  private readonly touchControls: TouchControlsElements;
  private readonly desktopControlHints: DesktopControlHintsElements;
  private readonly onOverlayActionRequested: (source: OverlayNavigationSource) => void;
  private readonly onSelectVehicleRelative: (delta: number) => void;
  private readonly onActivationGesture: (source: 'keyboard' | 'pointer') => void;
  private readonly keyState = new Set<string>();

  private steeringPointerId: number | null = null;
  private gasPointerId: number | null = null;
  private brakePointerId: number | null = null;
  private steeringStartX = 0;
  private touchSteering = 0;
  private touchThrottle = false;
  private touchBrake = false;
  private overlayActive = false;
  private overlayVehicleSelectionVisible = false;
  private menuLeftHeld = false;
  private menuRightHeld = false;
  private menuStartHeld = false;
  private menuVehicleLeftHeld = false;
  private menuVehicleRightHeld = false;

  constructor(options: ControlsControllerOptions) {
    this.touchControls = options.touchControls;
    this.desktopControlHints = options.desktopControlHints;
    this.onOverlayActionRequested = options.onOverlayActionRequested;
    this.onSelectVehicleRelative = options.onSelectVehicleRelative;
    this.onActivationGesture = options.onActivationGesture;

    this.installKeyboardHandlers();
    this.installPointerHandlers();
    this.syncDesktopControlHints();
  }

  resetTouch() {
    this.steeringPointerId = null;
    this.gasPointerId = null;
    this.brakePointerId = null;
    this.steeringStartX = 0;
    this.touchSteering = 0;
    this.touchThrottle = false;
    this.touchBrake = false;
    this.touchControls.steeringKnob.style.transform = 'translate3d(0px, 0px, 0px)';
    this.touchControls.gasButton.classList.remove('is-active');
    this.touchControls.brakeButton.classList.remove('is-active');
  }

  setOverlayState(options: { active: boolean; vehicleSelectionVisible: boolean }) {
    this.overlayActive = options.active;
    this.overlayVehicleSelectionVisible = options.vehicleSelectionVisible;
    if (!this.overlayActive) {
      this.menuLeftHeld = false;
      this.menuRightHeld = false;
      this.menuStartHeld = false;
      this.menuVehicleLeftHeld = false;
      this.menuVehicleRightHeld = false;
    }
  }

  updateMenuNavigation() {
    const gamepad = this.getActiveGamepad();
    const axisX = applyDeadzone(gamepad?.axes[0] ?? 0, GAMEPAD_MENU_DEADZONE);
    const leftActive = (axisX < 0 && Math.abs(axisX) > 0) || readButtonPressed(gamepad?.buttons[14]);
    const rightActive = (axisX > 0 && Math.abs(axisX) > 0) || readButtonPressed(gamepad?.buttons[15]);
    const startActive = readButtonPressed(gamepad?.buttons[0]) || readButtonPressed(gamepad?.buttons[9]);
    const vehicleLeftActive = readButtonPressed(gamepad?.buttons[4]);
    const vehicleRightActive = readButtonPressed(gamepad?.buttons[5]);

    if (this.overlayActive) {
      if (startActive && !this.menuStartHeld) {
        this.onOverlayActionRequested('gamepad');
      }
      if (this.overlayVehicleSelectionVisible) {
        if (leftActive && !this.menuLeftHeld) {
          this.onSelectVehicleRelative(-1);
        }
        if (rightActive && !this.menuRightHeld) {
          this.onSelectVehicleRelative(1);
        }
        if (vehicleLeftActive && !this.menuVehicleLeftHeld) {
          this.onSelectVehicleRelative(-1);
        }
        if (vehicleRightActive && !this.menuVehicleRightHeld) {
          this.onSelectVehicleRelative(1);
        }
      }
    }

    this.menuLeftHeld = leftActive;
    this.menuRightHeld = rightActive;
    this.menuStartHeld = startActive;
    this.menuVehicleLeftHeld = vehicleLeftActive;
    this.menuVehicleRightHeld = vehicleRightActive;
  }

  readGameplayInput(): ControlsSnapshot {
    const keyboard = this.readKeyboardInput();
    if (Math.abs(keyboard.x) > 0.001 || Math.abs(keyboard.z) > 0.001) {
      return { ...keyboard, source: 'keyboard' };
    }

    const gamepad = this.readGamepadInput();
    if (Math.abs(gamepad.x) > 0.001 || Math.abs(gamepad.z) > 0.001) {
      return { ...gamepad, source: 'gamepad' };
    }

    const touch = this.readTouchInput();
    if (Math.abs(touch.x) > 0.001 || Math.abs(touch.z) > 0.001) {
      return { ...touch, source: 'touch' };
    }

    return { x: 0, z: 0, source: 'none' };
  }

  private installKeyboardHandlers() {
    window.addEventListener('keydown', (event) => {
      this.keyState.add(event.code);
      this.syncDesktopControlHints();
      this.onActivationGesture('keyboard');

      if (!this.overlayActive) {
        return;
      }
      if (event.repeat) {
        return;
      }

      if (this.isOverlayPreviousInput(event)) {
        event.preventDefault();
        this.onSelectVehicleRelative(-1);
        return;
      }
      if (this.isOverlayNextInput(event)) {
        event.preventDefault();
        this.onSelectVehicleRelative(1);
        return;
      }
      if (this.overlayVehicleSelectionVisible && this.isVehiclePreviousInput(event.code)) {
        event.preventDefault();
        this.onSelectVehicleRelative(-1);
        return;
      }
      if (this.overlayVehicleSelectionVisible && this.isVehicleNextInput(event.code)) {
        event.preventDefault();
        this.onSelectVehicleRelative(1);
        return;
      }
      if (this.isOverlayActivateInput(event.code)) {
        event.preventDefault();
        this.onOverlayActionRequested('keyboard');
      }
    });

    window.addEventListener('keyup', (event) => {
      this.keyState.delete(event.code);
      this.syncDesktopControlHints();
    });

    window.addEventListener('blur', () => {
      this.keyState.clear();
      this.syncDesktopControlHints();
    });
  }

  private installPointerHandlers() {
    window.addEventListener(
      'pointerdown',
      () => {
        this.onActivationGesture('pointer');
      },
      { passive: true },
    );

    this.touchControls.steeringZone.addEventListener('pointerdown', this.handleSteeringPointerDown);
    this.touchControls.steeringZone.addEventListener('pointermove', this.handleSteeringPointerMove);
    this.touchControls.steeringZone.addEventListener('pointerup', this.handleSteeringPointerEnd);
    this.touchControls.steeringZone.addEventListener('pointercancel', this.handleSteeringPointerEnd);
    this.touchControls.steeringZone.addEventListener('lostpointercapture', this.handleSteeringPointerEnd);

    this.installTouchButton({
      element: this.touchControls.gasButton,
      setActive: (active) => {
        this.touchThrottle = active;
      },
    });
    this.installTouchButton({
      element: this.touchControls.brakeButton,
      setActive: (active) => {
        this.touchBrake = active;
      },
    });
  }

  private installTouchButton(binding: TouchButtonBinding) {
    const handlePointerDown = (event: PointerEvent) => {
      event.preventDefault();
      this.onActivationGesture('pointer');
      binding.element.setPointerCapture(event.pointerId);
      binding.element.classList.add('is-active');
      binding.setActive(true);
      if (binding.element === this.touchControls.gasButton) {
        this.gasPointerId = event.pointerId;
      }
      if (binding.element === this.touchControls.brakeButton) {
        this.brakePointerId = event.pointerId;
      }
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const isGas = binding.element === this.touchControls.gasButton;
      const trackedPointerId = isGas ? this.gasPointerId : this.brakePointerId;
      if (trackedPointerId !== event.pointerId) {
        return;
      }

      binding.element.classList.remove('is-active');
      binding.setActive(false);
      if (isGas) {
        this.gasPointerId = null;
      } else {
        this.brakePointerId = null;
      }
      if (binding.element.hasPointerCapture(event.pointerId)) {
        binding.element.releasePointerCapture(event.pointerId);
      }
    };

    binding.element.addEventListener('pointerdown', handlePointerDown);
    binding.element.addEventListener('pointerup', handlePointerEnd);
    binding.element.addEventListener('pointercancel', handlePointerEnd);
    binding.element.addEventListener('lostpointercapture', handlePointerEnd);
  }

  private readonly handleSteeringPointerDown = (event: PointerEvent) => {
    event.preventDefault();
    if (this.steeringPointerId !== null && this.steeringPointerId !== event.pointerId) {
      return;
    }
    this.onActivationGesture('pointer');
    this.steeringPointerId = event.pointerId;
    this.steeringStartX = event.clientX;
    this.touchSteering = 0;
    this.touchControls.steeringZone.setPointerCapture(event.pointerId);
    this.touchControls.steeringKnob.style.transform = 'translate3d(0px, 0px, 0px)';
  };

  private readonly handleSteeringPointerMove = (event: PointerEvent) => {
    if (this.steeringPointerId !== event.pointerId) {
      return;
    }
    this.updateSteering(event.clientX);
  };

  private readonly handleSteeringPointerEnd = (event: PointerEvent) => {
    if (this.steeringPointerId !== event.pointerId) {
      return;
    }
    if (this.touchControls.steeringZone.hasPointerCapture(event.pointerId)) {
      this.touchControls.steeringZone.releasePointerCapture(event.pointerId);
    }
    this.steeringPointerId = null;
    this.steeringStartX = 0;
    this.touchSteering = 0;
    this.touchControls.steeringKnob.style.transform = 'translate3d(0px, 0px, 0px)';
  };

  private updateSteering(clientX: number) {
    const delta = clamp(clientX - this.steeringStartX, -STEERING_DRAG_RANGE, STEERING_DRAG_RANGE);
    this.touchSteering = clamp(delta / STEERING_DRAG_RANGE, -1, 1);
    const knobOffset = clamp(this.touchSteering * STEERING_KNOB_TRAVEL, -STEERING_KNOB_TRAVEL, STEERING_KNOB_TRAVEL);
    this.touchControls.steeringKnob.style.transform = `translate3d(${knobOffset}px, 0px, 0px)`;
  }

  private isOverlayPreviousInput(event: KeyboardEvent) {
    return event.code === 'KeyA' || event.code === 'ArrowLeft' || (event.code === 'Tab' && event.shiftKey);
  }

  private isOverlayNextInput(event: KeyboardEvent) {
    return event.code === 'KeyD' || event.code === 'ArrowRight' || (event.code === 'Tab' && !event.shiftKey);
  }

  private isVehiclePreviousInput(code: string) {
    return code === 'KeyQ' || code === 'BracketLeft';
  }

  private isVehicleNextInput(code: string) {
    return code === 'KeyE' || code === 'BracketRight';
  }

  private isOverlayActivateInput(code: string) {
    return code === 'Enter' || code === 'Space' || code === 'NumpadEnter';
  }

  private readKeyboardInput() {
    const x = this.getAxis('KeyA', 'KeyD');
    const z = this.getAxis('KeyS', 'KeyW');
    return { x, z };
  }

  getDesktopControlHintState() {
    return {
      w: this.desktopControlHints.keyW.dataset.pressed === 'true',
      a: this.desktopControlHints.keyA.dataset.pressed === 'true',
      s: this.desktopControlHints.keyS.dataset.pressed === 'true',
      d: this.desktopControlHints.keyD.dataset.pressed === 'true',
    };
  }

  private syncDesktopControlHints() {
    this.desktopControlHints.keyW.dataset.pressed = String(this.keyState.has('KeyW'));
    this.desktopControlHints.keyA.dataset.pressed = String(this.keyState.has('KeyA'));
    this.desktopControlHints.keyS.dataset.pressed = String(this.keyState.has('KeyS'));
    this.desktopControlHints.keyD.dataset.pressed = String(this.keyState.has('KeyD'));
  }

  private readGamepadInput() {
    const gamepad = this.getActiveGamepad();
    if (!gamepad) {
      return { x: 0, z: 0 };
    }

    let x = applyDeadzone(gamepad.axes[0] ?? 0, GAMEPAD_DEADZONE);
    if (Math.abs(x) <= 0.001) {
      if (readButtonPressed(gamepad.buttons[14])) {
        x = -1;
      } else if (readButtonPressed(gamepad.buttons[15])) {
        x = 1;
      }
    }

    const throttle = readButtonValue(gamepad.buttons[7]);
    const brake = readButtonValue(gamepad.buttons[6]);
    return {
      x,
      z: throttle - brake,
    };
  }

  private readTouchInput() {
    return {
      x: this.touchSteering,
      z: Number(this.touchThrottle) - Number(this.touchBrake),
    };
  }

  private getAxis(negativeKey: string, positiveKey: string) {
    const negative = this.keyState.has(negativeKey) ? 1 : 0;
    const positive = this.keyState.has(positiveKey) ? 1 : 0;
    return positive - negative;
  }

  private getActiveGamepad() {
    const gamepads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
    for (const gamepad of gamepads) {
      if (gamepad) {
        return gamepad;
      }
    }
    return null;
  }
}
