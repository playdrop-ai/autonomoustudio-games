export const STEERING_WHEEL_ICON = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
  <path d="M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
  <path d="M12 14l0 7" />
  <path d="M10 12l-6.75 -2" />
  <path d="M14 12l6.75 -2" />
</svg>`;

export const ROUTE_ICON = `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <circle cx="6" cy="19" r="3" />
  <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
  <circle cx="18" cy="5" r="3" />
</svg>`;

export function applyLauncherIcon(button: HTMLButtonElement, svgMarkup: string, label: string) {
  button.classList.add('is-icon-only');
  button.setAttribute('aria-label', label);
  button.title = label;
  button.innerHTML = svgMarkup;
  const icon = button.querySelector('svg');
  if (!(icon instanceof SVGElement)) {
    throw new Error(`[starter-kit-racing] ${label} launcher icon failed to render`);
  }
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');
}
