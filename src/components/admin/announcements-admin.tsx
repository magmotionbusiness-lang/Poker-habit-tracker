"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { announcementLabels } from "@/content/announcements";
import type { Announcement, AnnouncementType, Audience } from "@/lib/growth/announcements";

type Row = Announcement & { published: boolean };

const AUDIENCES: Array<[Audience, string]> = [
  ["everyone", "Everyone"],
  ["non_students", "Not yet students"],
  ["students", "Students"],
  ["alumni", "Alumni (Stakers Club)"],
];

/** datetime-local ⇄ ISO (the admin types local time; we store UTC). */
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

const blank = (): Row => ({
  id: "",
  type: "workshop",
  title: "",
  body: "",
  image_url: null,
  starts_at: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  ends_at: null,
  cta_label: "",
  cta_url: "",
  audience: "everyone",
  priority: "normal",
  published: false,
});

export function AnnouncementsAdmin({ client }: { client: SupabaseClient }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [edit, setEdit] = useState<Row | null>(null);
  const [version, setVersion] = useState(0);
  const load = () => setVersion((v) => v + 1);
  useEffect(() => {
    let live = true;
    void client
      .from("announcements")
      .select("*")
      .order("starts_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!live) return;
        if (error) toast.error(error.message);
        setRows((data ?? []) as Row[]);
      });
    return () => {
      live = false;
    };
  }, [client, version]);

  async function save(r: Row) {
    const { id, ...rest } = r;
    const payload = {
      ...rest,
      body: rest.body || null,
      cta_label: rest.cta_label || null,
      cta_url: rest.cta_url || null,
    };
    const { error } = id
      ? await client.from("announcements").update(payload).eq("id", id)
      : await client.from("announcements").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(r.published ? "Published" : "Saved as draft");
    setEdit(null);
    load();
  }

  async function togglePublish(r: Row) {
    const { error } = await client
      .from("announcements")
      .update({ published: !r.published })
      .eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  }

  async function remove(r: Row) {
    if (!confirm(`Delete “${r.title}”?`)) return;
    const { error } = await client.from("announcements").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="space-y-3">
      <Button block onClick={() => setEdit(blank())}>
        <Plus aria-hidden /> New announcement
      </Button>
      {rows === null ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No announcements yet. Create a cohort opening or a workshop countdown.
        </p>
      ) : (
        <ul className="stagger space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <Megaphone className="mt-0.5 size-5 shrink-0 text-lavender" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{r.title}</p>
                    <p className="text-xs text-ink-muted">
                      {announcementLabels[r.type]} · {new Date(r.starts_at).toLocaleString()} ·{" "}
                      {r.audience} · {r.priority}
                    </p>
                  </div>
                  <Badge size="sm" className={r.published ? "text-success" : ""}>
                    {r.published ? "Live" : "Draft"}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Switch
                    checked={r.published}
                    onCheckedChange={() => togglePublish(r)}
                    aria-label={`Publish ${r.title}`}
                  />
                  <span className="flex-1 text-sm text-ink-muted">Published</span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Edit ${r.title}`}
                    onClick={() => setEdit(r)}
                  >
                    <Pencil aria-hidden />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Delete ${r.title}`}
                    onClick={() => remove(r)}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {edit && <AnnouncementSheet row={edit} onClose={() => setEdit(null)} onSave={save} />}
    </div>
  );
}

function AnnouncementSheet({
  row,
  onClose,
  onSave,
}: {
  row: Row;
  onClose: () => void;
  onSave: (r: Row) => void;
}) {
  const [r, setR] = useState<Row>(row);
  const set = (p: Partial<Row>) => setR((x) => ({ ...x, ...p }));
  const urlOk = !r.cta_url || /^(\/|https:\/\/)/.test(r.cta_url);
  const sel = "h-12 w-full rounded-md border border-line bg-field px-3 text-sm";
  return (
    <Sheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={row.id ? "Edit announcement" : "New announcement"}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="an-type">Type</Label>
            <select
              id="an-type"
              className={sel}
              value={r.type}
              onChange={(e) => set({ type: e.target.value as AnnouncementType })}
            >
              {Object.entries(announcementLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="an-pri">Priority</Label>
            <select
              id="an-pri"
              className={sel}
              value={r.priority}
              onChange={(e) => set({ priority: e.target.value as Row["priority"] })}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High (top of Today)</option>
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="an-title">Title</Label>
          <Input
            id="an-title"
            maxLength={80}
            value={r.title}
            onChange={(e) => set({ title: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="an-body">Text</Label>
          <Textarea
            id="an-body"
            className="min-h-16"
            maxLength={240}
            value={r.body ?? ""}
            onChange={(e) => set({ body: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="an-start">Starts (your time)</Label>
            <Input
              id="an-start"
              type="datetime-local"
              value={toLocalInput(r.starts_at)}
              onChange={(e) => set({ starts_at: fromLocalInput(e.target.value) ?? r.starts_at })}
            />
          </div>
          <div>
            <Label htmlFor="an-end">Ends (optional)</Label>
            <Input
              id="an-end"
              type="datetime-local"
              value={toLocalInput(r.ends_at)}
              onChange={(e) => set({ ends_at: fromLocalInput(e.target.value) })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="an-cta">Button label</Label>
            <Input
              id="an-cta"
              maxLength={40}
              placeholder="Join the waitlist"
              value={r.cta_label ?? ""}
              onChange={(e) => set({ cta_label: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="an-url">Button link</Label>
            <Input
              id="an-url"
              placeholder="https://… or /more/…"
              value={r.cta_url ?? ""}
              onChange={(e) => set({ cta_url: e.target.value })}
              aria-invalid={!urlOk}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="an-aud">Audience</Label>
          <select
            id="an-aud"
            className={sel}
            value={r.audience}
            onChange={(e) => set({ audience: e.target.value as Audience })}
          >
            {AUDIENCES.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3">
          <span className="text-sm font-medium">Publish now</span>
          <Switch
            checked={r.published}
            onCheckedChange={(v) => set({ published: v })}
            aria-label="Publish now"
          />
        </div>
        {!urlOk && <p className="text-sm text-danger">Links must start with https:// or /</p>}
        <Button block size="lg" disabled={!r.title.trim() || !urlOk} onClick={() => onSave(r)}>
          Save
        </Button>
      </div>
    </Sheet>
  );
}
