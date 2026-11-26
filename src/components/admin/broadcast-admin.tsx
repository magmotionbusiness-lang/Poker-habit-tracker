"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { toast } from "@/components/ui/toaster";

/** Push a short message to players who allowed "Up The Stakes news". Audited. */
export function BroadcastAdmin() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/more/up-the-stakes");
  const [audience, setAudience] = useState("everyone");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!confirm(`Send this push to ${audience.replace("_", " ")} now?`)) return;
    setBusy(true);
    const res = await fetch("/api/admin/broadcast", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, body, url: url || undefined, audience }),
    }).catch(() => null);
    setBusy(false);
    const data = (await res?.json().catch(() => null)) as { sent?: number; error?: string } | null;
    if (!res?.ok)
      return toast.error(
        data?.error === "push_not_configured"
          ? "Push isn't configured (VAPID keys)."
          : "Couldn't send.",
      );
    toast.success(`Sent to ${data?.sent ?? 0} device(s)`);
    setTitle("");
    setBody("");
  }

  return (
    <Card className="space-y-3">
      <p className="text-sm text-ink-muted">
        Use sparingly: one useful message beats five promos. Max ~1 a week.
      </p>
      <div>
        <Label htmlFor="bc-title">Title</Label>
        <Input
          id="bc-title"
          maxLength={80}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Cohort 8 doors open Monday"
        />
      </div>
      <div>
        <Label htmlFor="bc-body">Message</Label>
        <Textarea
          id="bc-body"
          className="min-h-16"
          maxLength={240}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="bc-url">Opens</Label>
          <Input id="bc-url" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="bc-aud">Audience</Label>
          <select
            id="bc-aud"
            className="h-12 w-full rounded-md border border-line bg-field px-3 text-sm"
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
          >
            <option value="everyone">Everyone</option>
            <option value="non_students">Not yet students</option>
            <option value="students">Students</option>
            <option value="alumni">Alumni</option>
          </select>
        </div>
      </div>
      <Button block disabled={busy || !title.trim() || !body.trim()} onClick={send}>
        <Send aria-hidden /> {busy ? "Sending…" : "Send push"}
      </Button>
    </Card>
  );
}
