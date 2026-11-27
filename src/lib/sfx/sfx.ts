/**
 * Progress sounds, synthesised with the Web Audio API (no files, ~0 KB).
 *
 * Sound is reserved for progress — ticking a habit, finishing the day, a milestone,
 * moving up the ladder, logging a result — so it stays meaningful (no click ticks).
 *
 * iOS rules this handles:
 *  - Audio may only start inside a real user activation (touchend / click / keydown —
 *    NOT pointerdown on touch). `unlockAudio()` runs on the first one.
 *  - iOS suspends or "interrupts" the context when the app is backgrounded; we resume.
 *  - The silent switch mutes Web Audio unless the page's audio session is "playback"
 *    (`setIgnoreSilentSwitch`, a user setting, since "playback" also pauses music).
 */
export type Sfx =
  | "tick" // habit +1 (pitch rises with progress)
  | "check" // a habit completed
  | "complete" // the day counts
  | "milestone" // streak milestone, goal reached
  | "levelup" // moved up the stake ladder
  | "save" // a session / hand / review logged
  | "correct"; // Daily Hand right

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let wet: GainNode | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

type AudioSessionNav = Navigator & { audioSession?: { type: string } };

/** "playback" plays with the silent switch on (and pauses other audio); "auto" respects it. */
export function setIgnoreSilentSwitch(on: boolean) {
  try {
    const nav = navigator as AudioSessionNav;
    if (nav.audioSession) nav.audioSession.type = on ? "playback" : "auto";
  } catch {
    /* not supported */
  }
}

function build(): AudioContext | null {
  if (ctx) return ctx;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  // A short feedback delay gives the chimes a little "room" — feels richer, not tinny.
  const delay = ctx.createDelay(0.5);
  delay.delayTime.value = 0.11;
  const fb = ctx.createGain();
  fb.gain.value = 0.28;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3200;
  wet = ctx.createGain();
  wet.gain.value = 0.35;
  wet.connect(delay);
  delay.connect(lp).connect(fb).connect(delay);
  lp.connect(master);
  master.connect(ctx.destination);
  return ctx;
}

/** Call from a user-activation event (touchend / click / keydown). Safe to call repeatedly. */
export function unlockAudio() {
  if (typeof window === "undefined") return;
  try {
    const c = build();
    if (!c) return;
    if (c.state !== "running") void c.resume();
    // Play one silent sample: iOS only fully unlocks after something actually plays.
    const b = c.createBuffer(1, 1, 22050);
    const s = c.createBufferSource();
    s.buffer = b;
    s.connect(c.destination);
    s.start(0);
  } catch {
    /* ignore */
  }
}

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !enabled) return null;
  const c = build();
  if (c && c.state !== "running") void c.resume();
  return c;
}

type Tone = {
  freq: number;
  to?: number;
  type?: OscillatorType;
  start?: number;
  dur: number;
  gain?: number;
  attack?: number;
  /** Send to the room delay. */
  room?: boolean;
};

function tone(c: AudioContext, t: Tone) {
  const at = c.currentTime + 0.01 + (t.start ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = t.type ?? "sine";
  osc.frequency.setValueAtTime(t.freq, at);
  if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, at + t.dur);
  const peak = t.gain ?? 0.25;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + (t.attack ?? 0.006));
  g.gain.exponentialRampToValueAtTime(0.0001, at + t.dur);
  osc.connect(g);
  g.connect(master!);
  if (t.room !== false && wet) g.connect(wet);
  osc.start(at);
  osc.stop(at + t.dur + 0.05);
}

/** Bell-ish note: sine + a quiet octave + a soft inharmonic partial. */
function bell(c: AudioContext, freq: number, start = 0, dur = 0.6, gain = 0.22) {
  tone(c, { freq, start, dur, gain, type: "sine" });
  tone(c, { freq: freq * 2, start, dur: dur * 0.6, gain: gain * 0.28, type: "sine" });
  tone(c, { freq: freq * 2.76, start, dur: dur * 0.3, gain: gain * 0.1, type: "sine" });
}

const NOTE = (semitonesFromA4: number) => 440 * 2 ** (semitonesFromA4 / 12);
// C major pentatonic from C5 upward: rising progress sounds always sound "right".
const PENTA = [3, 5, 7, 10, 12, 15, 17, 19, 22, 24].map(NOTE);

export function play(name: Sfx, opts: { progress?: number } = {}) {
  const c = audio();
  if (!c || !master) return;
  switch (name) {
    case "tick": {
      // Pitch climbs as the ring fills: 1/4 → 2/4 → 3/4 sound like steps up.
      const i = Math.round(Math.min(1, Math.max(0, opts.progress ?? 0)) * 5);
      bell(c, PENTA[i]!, 0, 0.35, 0.2);
      break;
    }
    case "check":
      bell(c, NOTE(7), 0, 0.4, 0.2); // E5
      bell(c, NOTE(15), 0.08, 0.7, 0.22); // C6
      break;
    case "correct":
      bell(c, NOTE(10), 0, 0.35, 0.18); // G5
      bell(c, NOTE(17), 0.07, 0.6, 0.2); // E6
      break;
    case "save":
      bell(c, NOTE(10), 0, 0.3, 0.16); // G5
      bell(c, NOTE(15), 0.06, 0.5, 0.18); // C6
      tone(c, { freq: 4200, to: 2400, start: 0.05, dur: 0.12, gain: 0.03 }); // sparkle
      break;
    case "complete": // the day counts: rising arpeggio that lands on a bright chord
      [3, 7, 10, 15].forEach((n, i) => bell(c, NOTE(n), i * 0.085, 0.7, 0.17));
      [15, 19, 22].forEach((n) =>
        tone(c, { freq: NOTE(n), start: 0.34, dur: 1.1, gain: 0.06, attack: 0.04 }),
      );
      break;
    case "levelup": // stepping up: fast run up the scale + a held fifth
      PENTA.slice(0, 8).forEach((f, i) => bell(c, f, i * 0.05, 0.35, 0.12));
      tone(c, { freq: NOTE(15), start: 0.4, dur: 1.4, gain: 0.08, attack: 0.05 });
      tone(c, { freq: NOTE(22), start: 0.4, dur: 1.4, gain: 0.06, attack: 0.05 });
      break;
    case "milestone": // warm chord swell + shimmer cascade
      [3, 7, 10, 15].forEach((n) =>
        tone(c, { freq: NOTE(n), dur: 1.8, type: "triangle", gain: 0.07, attack: 0.15 }),
      );
      for (let i = 0; i < 8; i++) bell(c, NOTE(27 + (i % 4) * 3), 0.25 + i * 0.07, 0.3, 0.06);
      break;
  }
}
