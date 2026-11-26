/**
 * Sound effects, synthesised with the Web Audio API — no audio files to download,
 * no licensing, ~0 KB. Subtle by design: short, soft, never casino-loud.
 * Muted when the user turns sounds off (More → Display) and before the first tap
 * (iOS only allows audio after a user gesture).
 */
export type Sfx =
  | "tap"
  | "toggle"
  | "chip"
  | "deal"
  | "fold"
  | "check"
  | "complete"
  | "milestone"
  | "save"
  | "error";

let ctx: AudioContext | null = null;
let enabled = true;
let master: GainNode | null = null;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !enabled) return null;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

type Tone = {
  freq: number;
  to?: number;
  type?: OscillatorType;
  start?: number;
  dur: number;
  gain?: number;
  attack?: number;
};

function tone(c: AudioContext, t: Tone) {
  const at = c.currentTime + (t.start ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = t.type ?? "sine";
  osc.frequency.setValueAtTime(t.freq, at);
  if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, at + t.dur);
  const peak = t.gain ?? 0.25;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + (t.attack ?? 0.008));
  g.gain.exponentialRampToValueAtTime(0.0001, at + t.dur);
  osc.connect(g).connect(master!);
  osc.start(at);
  osc.stop(at + t.dur + 0.02);
}

let noiseBuf: AudioBuffer | null = null;
function noise(
  c: AudioContext,
  {
    start = 0,
    dur,
    freq,
    q = 1,
    gain = 0.3,
    sweepTo,
  }: { start?: number; dur: number; freq: number; q?: number; gain?: number; sweepTo?: number },
) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const at = c.currentTime + start;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.setValueAtTime(freq, at);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, at + dur);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(at);
  src.stop(at + dur + 0.02);
}

const C5 = 523.25;
const E5 = 659.25;
const G5 = 783.99;
const C6 = 1046.5;

export function play(name: Sfx) {
  const c = audio();
  if (!c || !master) return;
  switch (name) {
    case "tap":
      tone(c, { freq: 1800, type: "sine", dur: 0.03, gain: 0.08 });
      break;
    case "toggle":
      tone(c, { freq: 900, to: 1300, dur: 0.06, gain: 0.1 });
      break;
    case "chip": // two clay chips clacking
      noise(c, { dur: 0.05, freq: 3200, q: 6, gain: 0.5 });
      noise(c, { start: 0.045, dur: 0.05, freq: 2700, q: 6, gain: 0.35 });
      break;
    case "deal": // card sliding across felt
      noise(c, { dur: 0.16, freq: 1200, sweepTo: 4000, q: 0.8, gain: 0.22 });
      break;
    case "fold":
      noise(c, { dur: 0.18, freq: 900, sweepTo: 300, q: 0.7, gain: 0.15 });
      break;
    case "check": // habit ticked: bright two-note chime
      tone(c, { freq: E5, dur: 0.18, type: "triangle", gain: 0.2 });
      tone(c, { freq: C6, start: 0.07, dur: 0.32, type: "triangle", gain: 0.2 });
      break;
    case "save":
      tone(c, { freq: G5, dur: 0.12, type: "sine", gain: 0.16 });
      tone(c, { freq: C6, start: 0.06, dur: 0.22, type: "sine", gain: 0.16 });
      break;
    case "complete": // the day counts: rising arpeggio
      [C5, E5, G5, C6].forEach((f, i) =>
        tone(c, { freq: f, start: i * 0.075, dur: 0.45, type: "triangle", gain: 0.18 }),
      );
      tone(c, { freq: C6 * 2, start: 0.3, dur: 0.6, type: "sine", gain: 0.06 });
      break;
    case "milestone": // streak/goal milestone: warm chord swell + shimmer
      [C5, E5, G5, C6].forEach((f) =>
        tone(c, { freq: f, dur: 1.2, type: "sine", gain: 0.1, attack: 0.12 }),
      );
      for (let i = 0; i < 6; i++)
        tone(c, { freq: 2093 + i * 260, start: 0.25 + i * 0.06, dur: 0.25, gain: 0.04 });
      break;
    case "error":
      tone(c, { freq: 220, to: 160, dur: 0.18, type: "triangle", gain: 0.15 });
      break;
  }
}
