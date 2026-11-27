"use client";

import { useEffect, useRef } from "react";
import { useGentle } from "@/lib/motion/motion";
import { useCelebrations, type CelebrationKind } from "@/lib/store/celebrate";

/**
 * Confetti, physically: paper pieces flutter (they flip and darken on their back side), sway,
 * feel air drag and settle into a slow fall. Time-based, so it looks the same at 60 and 120 Hz.
 * Bursts fire upward in a cone from the thing you completed; milestones add two side cannons.
 * Gentle motion: a soft glow bloom with sparkles that twinkle in place.
 */
const VIOLET = ["#7c5cff", "#a892ff", "#c5b6ff", "#ffffff", "#6847f0", "#34d399"];
const GOLD = ["#fbbf24", "#fde68a", "#c5b6ff", "#ffffff", "#7c5cff", "#a892ff"];

type Piece = {
  kind: "paper" | "dot" | "star";
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vrot: number;
  flip: number;
  vflip: number;
  sway: number;
  swayAmp: number;
  color: string;
  age: number;
  life: number;
  /** Gentle sparkles don't travel. */
  still?: boolean;
};

type Glow = { x: number; y: number; age: number; life: number; r: number };

const BURST: Record<
  CelebrationKind,
  { n: number; speed: [number, number]; spread: number; life: [number, number] }
> = {
  small: { n: 34, speed: [380, 720], spread: 0.75, life: [1.3, 1.9] },
  day: { n: 110, speed: [620, 1150], spread: 0.95, life: [2.2, 3.2] },
  milestone: { n: 150, speed: [700, 1300], spread: 1.05, life: [2.6, 3.8] },
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]!;

function piece(
  x: number,
  y: number,
  angle: number,
  speed: number,
  palette: readonly string[],
  life: number,
): Piece {
  const r = Math.random();
  const kind = r < 0.72 ? "paper" : r < 0.9 ? "dot" : "star";
  const size = kind === "paper" ? rand(9, 14) : kind === "dot" ? rand(4, 6.5) : rand(6, 9);
  return {
    kind,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    w: size,
    h: kind === "paper" ? size * rand(0.45, 0.6) : size,
    rot: rand(0, Math.PI * 2),
    vrot: rand(-6, 6),
    flip: rand(0, Math.PI * 2),
    vflip: rand(5, 11),
    sway: rand(0, Math.PI * 2),
    swayAmp: rand(18, 46),
    color: pick(palette),
    age: 0,
    life,
  };
}

function star(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? r : r * 0.38;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

export function Celebrations() {
  const bursts = useCelebrations((s) => s.bursts);
  const done = useCelebrations((s) => s.done);
  const gentle = useGentle();
  const canvas = useRef<HTMLCanvasElement>(null);
  const pieces = useRef<Piece[]>([]);
  const glows = useRef<Glow[]>([]);
  const raf = useRef<number | null>(null);
  const last = useRef(0);

  useEffect(() => {
    if (!bursts.length) return;
    const el = canvas.current;
    if (!el) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (el.width !== Math.round(W * dpr) || el.height !== Math.round(H * dpr)) {
      el.width = Math.round(W * dpr);
      el.height = Math.round(H * dpr);
    }
    const ctx = el.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (const b of bursts) {
      done(b.id);
      const cfg = BURST[b.kind];
      const palette = b.kind === "milestone" ? GOLD : VIOLET;
      const ox = b.x * W;
      const oy = b.y * H;
      glows.current.push({
        x: ox,
        y: oy,
        age: 0,
        life: gentle ? 1.1 : 0.7,
        r: b.kind === "small" ? 90 : 170,
      });
      if (gentle) {
        const n = b.kind === "small" ? 10 : 22;
        for (let i = 0; i < n; i++) {
          const p = piece(ox + rand(-90, 90), oy + rand(-70, 50), 0, 0, palette, rand(0.8, 1.5));
          p.kind = "star";
          p.w = p.h = rand(4, 8);
          p.still = true;
          p.age = -i * 0.04;
          pieces.current.push(p);
        }
        continue;
      }
      for (let i = 0; i < cfg.n; i++) {
        // Upward cone around straight up (−90°).
        const angle = -Math.PI / 2 + rand(-cfg.spread, cfg.spread) * (0.6 + Math.random() * 0.4);
        pieces.current.push(piece(ox, oy, angle, rand(...cfg.speed), palette, rand(...cfg.life)));
      }
      if (b.kind === "milestone") {
        // Two cannons from the bottom corners, aimed up and inward.
        for (const side of [-1, 1]) {
          const cx = side < 0 ? -10 : W + 10;
          for (let i = 0; i < 70; i++) {
            // Straight up is −90°; tilt 20–45° toward the middle of the screen.
            const a = -Math.PI / 2 - side * rand(0.35, 0.78);
            pieces.current.push(piece(cx, H + 10, a, rand(1100, 1700), palette, rand(2.6, 3.8)));
          }
        }
      }
    }

    if (raf.current !== null) return;
    last.current = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last.current) / 1000);
      last.current = now;
      ctx.clearRect(0, 0, W, H);

      // Soft bloom behind the burst.
      glows.current = glows.current.filter((g) => (g.age += dt) < g.life);
      for (const g of glows.current) {
        const t = g.age / g.life;
        const r = g.r * (0.4 + t * 0.9);
        const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, r);
        grad.addColorStop(0, `rgba(168,146,255,${0.45 * (1 - t)})`);
        grad.addColorStop(1, "rgba(124,92,255,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(g.x - r, g.y - r, r * 2, r * 2);
      }

      pieces.current = pieces.current.filter((p) => p.age < p.life && p.y < H + 40);
      for (const p of pieces.current) {
        p.age += dt;
        if (p.age < 0) continue;
        if (!p.still) {
          // Air drag (stronger for paper) + gravity, capped at a fluttery terminal speed.
          const drag = p.kind === "paper" ? 2.6 : 1.6;
          p.vx -= p.vx * drag * dt;
          p.vy -= p.vy * drag * dt;
          p.vy += 1500 * dt;
          const terminal = p.kind === "paper" ? 230 : 380;
          if (p.vy > terminal) p.vy = terminal;
          p.sway += dt * 3.2;
          p.x += (p.vx + Math.sin(p.sway) * p.swayAmp) * dt;
          p.y += p.vy * dt;
          p.rot += p.vrot * dt;
          p.flip += p.vflip * dt;
        }
        const t = p.age / p.life;
        const alpha = p.still ? Math.sin(Math.PI * Math.min(1, t)) : t > 0.75 ? (1 - t) / 0.25 : 1;
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.kind === "paper") {
          const s = Math.cos(p.flip); // flipping paper: thin when edge-on, darker on the back
          ctx.scale(1, Math.max(0.08, Math.abs(s)));
          ctx.fillStyle = s >= 0 ? p.color : shade(p.color, 0.62);
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        } else if (p.kind === "dot") {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const sc = p.still ? 0.5 + Math.sin(Math.PI * Math.min(1, t)) * 0.7 : 1;
          ctx.scale(sc, sc);
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.fillStyle = p.color;
          star(ctx, p.w);
        }
        ctx.restore();
      }

      if (pieces.current.length || glows.current.length) raf.current = requestAnimationFrame(tick);
      else {
        raf.current = null;
        ctx.clearRect(0, 0, W, H);
      }
    };
    raf.current = requestAnimationFrame(tick);
  }, [bursts, done, gentle]);

  useEffect(
    () => () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    },
    [],
  );

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100] h-full w-full"
    />
  );
}
