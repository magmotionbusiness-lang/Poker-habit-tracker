"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import {
  SHARE_SIZE,
  type ShareContent,
  type ShareFormat,
  type ShareSubject,
  shareContent,
} from "@/lib/share/cards";

/** Resolved font stack for a utility class (CSS vars inside font stacks don't work in canvas). */
function fontOf(className: string, fallback: string) {
  const el = document.createElement("span");
  el.className = className;
  el.style.position = "absolute";
  el.style.visibility = "hidden";
  document.body.appendChild(el);
  const f = getComputedStyle(el).fontFamily;
  el.remove();
  return f || fallback;
}

/** Draw a share card. Brand look: deep night background, violet glow, serif numerals. */
export async function drawShareCard(
  canvas: HTMLCanvasElement,
  c: ShareContent,
  format: ShareFormat,
) {
  const { w, h } = SHARE_SIZE[format];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  await document.fonts?.ready;
  const display = fontOf("font-display", "Georgia, serif");
  const sans = fontOf("font-sans", "system-ui, sans-serif");

  ctx.fillStyle = "#0b0a1a";
  ctx.fillRect(0, 0, w, h);
  const glow = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(11,10,26,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  };
  glow(w * 0.2, h * 0.18, w * 0.9, "rgba(124,92,255,0.45)");
  glow(w * 0.95, h * 0.85, w * 0.7, "rgba(104,71,240,0.30)");

  // Subtle grid of dots
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let y = 40; y < h; y += 54) for (let x = 40; x < w; x += 54) ctx.fillRect(x, y, 3, 3);

  const cx = w / 2;
  const mid = h * (format === "story" ? 0.46 : 0.47);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#c5b6ff";
  ctx.font = `600 34px ${sans}`;
  ctx.fillText(c.eyebrow.toUpperCase().split("").join(" "), cx, mid - 300);

  const bigSize = c.big.length <= 3 ? 340 : c.big.length <= 5 ? 240 : 170;
  const grad = ctx.createLinearGradient(0, mid - bigSize, 0, mid);
  grad.addColorStop(0, "#ffffff");
  grad.addColorStop(1, "#b9a8ff");
  ctx.fillStyle = grad;
  ctx.shadowColor = "rgba(124,92,255,0.65)";
  ctx.shadowBlur = 60;
  ctx.font = `600 ${bigSize}px ${display}`;
  ctx.fillText(c.big, cx, mid);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#ffffff";
  ctx.font = `600 64px ${display}`;
  wrap(ctx, c.unit, cx, mid + 110, w - 160, 74);

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = `500 40px ${sans}`;
  c.lines.forEach((l, i) => ctx.fillText(l, cx, mid + 260 + i * 60));

  // Footer mark
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  roundRect(ctx, cx - 400, h - 190, 800, 92, 46);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 32px ${sans}`;
  ctx.fillText(c.mark, cx, h - 132);
}

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  max: number,
  lh: number,
) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > max && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lh;
    } else line = test;
  }
  ctx.fillText(line, x, yy);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Preview + share/download a milestone card in story or post size. */
export function ShareSheet({
  subject,
  open,
  onClose,
}: {
  subject: ShareSubject;
  open: boolean;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [format, setFormat] = useState<ShareFormat>("story");
  const [hide, setHide] = useState(subject.kind !== "streak");
  const [url, setUrl] = useState<string | null>(null);
  const hasAmounts = subject.kind !== "streak";

  useEffect(() => {
    if (!open) return;
    let live = true;
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;
    void drawShareCard(canvas, shareContent(subject, hide), format).then(() => {
      if (live) setUrl(canvas.toDataURL("image/png"));
    });
    return () => {
      live = false;
    };
  }, [open, subject, hide, format]);

  async function blob(): Promise<Blob | null> {
    const c = canvasRef.current;
    return c ? new Promise((r) => c.toBlob(r, "image/png")) : null;
  }

  async function share() {
    const b = await blob();
    if (!b) return;
    const file = new File([b], `stakers-${subject.kind}-${format}.png`, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Stakers" });
      } catch {
        /* cancelled */
      }
    } else download(b, file.name);
  }

  function download(b: Blob, name: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast.success("Image saved");
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Share"
      description="Post it. Accountability compounds."
    >
      <div className="space-y-4">
        <Segmented
          ariaLabel="Format"
          value={format}
          onValueChange={setFormat}
          options={[
            { value: "story", label: "Story 9:16" },
            { value: "post", label: "Post 4:5" },
          ]}
          className="w-full [&>*]:flex-1"
        />
        <div className="grid place-items-center rounded-lg bg-field p-3">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt="Share card preview"
              className={
                format === "story"
                  ? "h-[52vh] max-h-[460px] rounded-md"
                  : "h-[42vh] max-h-[380px] rounded-md"
              }
            />
          ) : (
            <div className="h-[42vh] w-full animate-pulse rounded-md bg-surface" />
          )}
        </div>
        {hasAmounts && (
          <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3">
            <span className="text-sm font-medium">Hide amounts</span>
            <Switch checked={hide} onCheckedChange={setHide} aria-label="Hide amounts" />
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              const b = await blob();
              if (b) download(b, `stakers-${subject.kind}-${format}.png`);
            }}
          >
            <Download aria-hidden /> Save
          </Button>
          <Button onClick={share}>
            <Share2 aria-hidden /> Share
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
