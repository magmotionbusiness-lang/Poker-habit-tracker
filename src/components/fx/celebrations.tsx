"use client";

import { useGentle } from "@/lib/motion/motion";
import { useEffect, useRef } from "react";
import { useCelebrations, type CelebrationKind } from "@/lib/store/celebrate";

const COLORS = ["#7c5cff", "#a892ff", "#c5b6ff", "#f6f6fa", "#6847f0", "#34d399"];
const MILESTONE_COLORS = ["#fbbf24", "#c5b6ff", "#7c5cff", "#f6f6fa", "#a892ff"];

type P = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  vr: number;
  c: string;
  life: number;
  shape: 0 | 1 | 2;
  still?: boolean;
};

const CONFIG: Record<CelebrationKind, { count: number; speed: number; life: number }> = {
  small: { count: 26, speed: 5, life: 46 },
  day: { count: 90, speed: 9, life: 80 },
  milestone: { count: 160, speed: 12, life: 110 },
};

/** Confetti overlay. One shared canvas; gentle mode twinkles in place instead of flying. */
export function Celebrations() {
  const bursts = useCelebrations((s) => s.bursts);
  const done = useCelebrations((s) => s.done);
  const canvas = useRef<HTMLCanvasElement>(null);
  const particles = useRef<P[]>([]);
  const raf = useRef<number | null>(null);
  const reduce = useGentle();

  useEffect(() => {
    if (!bursts.length) return;
    const el = canvas.current;
    if (!el) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = window.innerWidth * dpr;
    el.height = window.innerHeight * dpr;
    const ctx = el.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (const b of bursts) {
      done(b.id);
      const cfg = CONFIG[b.kind];
      const palette = b.kind === "milestone" ? MILESTONE_COLORS : COLORS;
      for (let i = 0; i < cfg.count; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = cfg.speed * (0.4 + Math.random() * 0.8) * (reduce ? 0.12 : 1);
        particles.current.push({
          x: b.x * window.innerWidth,
          y: b.y * window.innerHeight,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s - (reduce ? 0 : cfg.speed * 0.6),
          still: reduce,
          r: 3 + Math.random() * 4,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          c: palette[i % palette.length]!,
          life: cfg.life * (0.7 + Math.random() * 0.6),
          shape: (i % 3) as 0 | 1 | 2,
        });
      }
    }
    if (raf.current !== null || !particles.current.length) return;
    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      particles.current = particles.current.filter((p) => p.life > 0);
      for (const p of particles.current) {
        if (!p.still) p.vy += 0.28;
        p.vx *= 0.985;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        p.life -= 1;
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life / 20);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        if (p.shape === 0) ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
        else if (p.shape === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, p.r / 1.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // tiny spade-ish diamond
          ctx.beginPath();
          ctx.moveTo(0, -p.r);
          ctx.lineTo(p.r * 0.7, 0);
          ctx.lineTo(0, p.r);
          ctx.lineTo(-p.r * 0.7, 0);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      }
      if (particles.current.length) raf.current = requestAnimationFrame(tick);
      else {
        raf.current = null;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };
    raf.current = requestAnimationFrame(tick);
  }, [bursts, done, reduce]);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100] h-full w-full"
    />
  );
}
