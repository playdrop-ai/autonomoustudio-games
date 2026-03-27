export function readGamepadButtonPressed(button: GamepadButton | undefined): boolean {
  return Boolean(button && (button.pressed || button.value > 0.5));
}

export function readGamepadButtonValue(button: GamepadButton | undefined): number {
  if (!button) {
    return 0;
  }
  return button.pressed ? Math.max(button.value, 1) : button.value;
}

export function applyGamepadDeadzone(value: number, deadzone: number): number {
  return Math.abs(value) > deadzone ? Math.max(-1, Math.min(1, value)) : 0;
}

export function getActiveGamepad(): Gamepad | null {
  const gamepads = typeof navigator.getGamepads === 'function' ? navigator.getGamepads() : [];
  for (const gamepad of gamepads) {
    if (gamepad?.connected) {
      return gamepad;
    }
  }
  return null;
}

export function readGamepadAxis(
  gamepad: Gamepad,
  axisIndex: number,
  negativeButtonIndex: number,
  positiveButtonIndex: number,
  deadzone: number,
): number {
  let value = applyGamepadDeadzone(gamepad.axes[axisIndex] ?? 0, deadzone);
  if (Math.abs(value) > 0.001) {
    return value;
  }
  if (readGamepadButtonPressed(gamepad.buttons[negativeButtonIndex])) {
    value = -1;
  } else if (readGamepadButtonPressed(gamepad.buttons[positiveButtonIndex])) {
    value = 1;
  }
  return value;
}
