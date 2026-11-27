/**
 * Haptic tick. Android/Chrome: Vibration API. iPhone (iOS 18+): Safari has no Vibration
 * API, but toggling an `<input type="checkbox" switch>` plays the system haptic — so we
 * keep one hidden switch and click its label. Must run inside (or just after) a tap.
 */
let label: HTMLLabelElement | null = null;

function iosSwitch(): HTMLLabelElement | null {
  if (typeof document === "undefined") return null;
  if (label?.isConnected) return label;
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.tabIndex = -1;
  input.setAttribute("aria-hidden", "true");
  label = document.createElement("label");
  label.setAttribute("aria-hidden", "true");
  label.style.cssText =
    "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
  label.appendChild(input);
  document.body.appendChild(label);
  return label;
}

export function haptic(pattern: number | number[] = 8): void {
  try {
    if (typeof navigator === "undefined") return;
    if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
      navigator.vibrate(pattern);
      return;
    }
    const l = iosSwitch();
    if (!l) return;
    const pulses = Array.isArray(pattern) ? Math.ceil(pattern.length / 2) : 1;
    l.click();
    for (let i = 1; i < Math.min(pulses, 3); i++) setTimeout(() => l.click(), i * 110);
  } catch {
    /* unsupported */
  }
}
