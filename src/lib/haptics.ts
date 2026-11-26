/**
 * Light haptic tick where supported (Android/Chrome). iOS Safari has no Vibration API;
 * native haptics arrive if/when the app is wrapped with Capacitor.
 */
export function haptic(pattern: number | number[] = 8): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* unsupported */
  }
}
