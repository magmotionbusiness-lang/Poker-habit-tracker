"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Chips } from "@/components/forms/chips";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { habitPresets, presetByKey } from "@/content/habits";
import { createCustomHabit, createHabitsFromPresets, updateHabit } from "@/lib/db/actions";
import { useHabits, useSettings } from "@/lib/db/hooks";
import { saveSettings } from "@/lib/db/repo";
import type { Habit } from "@/lib/domain/types";
import { errorMessage } from "@/lib/errors";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, i) => ({
  value: i + 1,
  label,
}));

export function HabitsScreen() {
  const habits = useHabits() ?? [];
  const settings = useSettings();
  const [editing, setEditing] = useState<Habit | null>(null);
  const [adding, setAdding] = useState(false);
  const missing = habitPresets.filter((p) => !habits.some((h) => h.key === p.key));

  return (
    <div className="space-y-6 pt-3">
      <Link
        href="/more"
        className="-ml-2 inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold text-ink-soft"
      >
        <ArrowLeft className="size-4" aria-hidden /> More
      </Link>
      <header>
        <p className="eyebrow mb-1.5">Structure</p>
        <h1 className="text-[34px] font-semibold">Habits & streak</h1>
      </header>

      <section className="space-y-2">
        <h2 className="eyebrow !font-sans">Your habits</h2>
        <ul className="stagger divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {habits.map((h) => (
            <li key={h.id} className="flex min-h-[60px] items-center gap-3 px-4 py-2">
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => setEditing(h)}
              >
                <span
                  className={`block font-medium ${h.active ? "" : "text-ink-muted line-through"}`}
                >
                  {h.name}
                </span>
                <span className="block text-sm text-ink-muted">
                  {h.unit === "boolean"
                    ? "Yes / no"
                    : `${h.target_value}${h.unit === "minutes" ? " min" : ""} a day`}
                  {h.days_of_week.length < 7 &&
                    ` · ${h.days_of_week.map((d) => WEEKDAYS[d - 1]!.label).join(" ")}`}
                  {presetByKey(h.key)?.sessionLinked && " · on play days"}
                </span>
              </button>
              <Switch
                checked={h.active}
                onCheckedChange={(v) => updateHabit(h, { active: v })}
                aria-label={`${h.name} active`}
              />
            </li>
          ))}
        </ul>
        <Button variant="ghost" block onClick={() => setAdding(true)}>
          <Plus aria-hidden /> Add habit
        </Button>
      </section>

      {settings && (
        <section className="space-y-4">
          <h2 className="eyebrow !font-sans">Streak rules</h2>
          <Card className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-ink-soft">A day counts when I complete</p>
              <Chips
                ariaLabel="Daily commitment"
                options={[
                  { value: "any", label: "At least 1 habit" },
                  { value: "all", label: "All habits" },
                  { value: "count2", label: "At least 2" },
                ]}
                value={settings.commitment.mode === "count" ? "count2" : settings.commitment.mode}
                onChange={(v) =>
                  saveSettings({
                    commitment:
                      v === "count2" ? { mode: "count", n: 2 } : { mode: v as "any" | "all" },
                  })
                }
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-ink-soft">Planned rest days</p>
              <Chips
                ariaLabel="Rest days"
                multiple
                size="sm"
                options={WEEKDAYS}
                value={settings.restWeekdays}
                onChange={(v) => saveSettings({ restWeekdays: v as number[] })}
              />
              <p className="mt-2 text-xs text-ink-subtle">
                Rest days never break your streak. You earn a streak freeze every 7 days (hold{" "}
                {settings.maxFreezes}; Pro holds 5). Miss one day with no freeze? Double up the next
                day to repair it — once per streak.
              </p>
            </div>
          </Card>
        </section>
      )}

      <HabitSheet habit={editing} onClose={() => setEditing(null)} />
      <Sheet open={adding} onOpenChange={setAdding} title="Add habit">
        <div className="space-y-2">
          {missing.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={async () => {
                await createHabitsFromPresets([p.key]);
                setAdding(false);
                toast.success(`${p.name} added.`);
              }}
              className="w-full rounded-lg border border-line bg-surface p-3.5 text-left hover:border-line-strong"
            >
              <span className="block font-semibold">{p.name}</span>
              <span className="block text-sm text-ink-muted">{p.hint}</span>
            </button>
          ))}
          <CustomHabitForm onDone={() => setAdding(false)} />
        </div>
      </Sheet>
    </div>
  );
}

function CustomHabitForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<Habit["unit"]>("boolean");
  const [target, setTarget] = useState("1");
  return (
    <Card className="mt-4 space-y-3">
      <p className="font-semibold">Custom habit</p>
      <Input
        aria-label="Habit name"
        placeholder="Review session notes"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Chips
        ariaLabel="Habit type"
        size="sm"
        options={[
          { value: "boolean", label: "Yes / no" },
          { value: "count", label: "Count" },
          { value: "minutes", label: "Minutes" },
        ]}
        value={unit}
        onChange={(v) => setUnit(v as Habit["unit"])}
      />
      {unit !== "boolean" && (
        <Input
          aria-label="Daily target"
          inputMode="numeric"
          value={target}
          onChange={(e) => setTarget(e.target.value.replace(/\D/g, ""))}
        />
      )}
      <Button
        block
        disabled={!name.trim()}
        onClick={async () => {
          try {
            await createCustomHabit(name, unit, Number(target) || 1);
            toast.success("Habit added.");
            onDone();
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      >
        Add
      </Button>
    </Card>
  );
}

function HabitSheet({ habit, onClose }: { habit: Habit | null; onClose: () => void }) {
  return (
    <Sheet
      open={habit !== null}
      onOpenChange={(o) => !o && onClose()}
      title={habit?.name ?? "Habit"}
    >
      {habit && <HabitForm key={habit.id} habit={habit} onClose={onClose} />}
    </Sheet>
  );
}

function HabitForm({ habit, onClose }: { habit: Habit; onClose: () => void }) {
  const [name, setName] = useState(habit.name);
  const [target, setTarget] = useState(String(habit.target_value));
  const [days, setDays] = useState<number[]>(habit.days_of_week);
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="h-name">Name</Label>
        <Input id="h-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      {habit.unit !== "boolean" && (
        <div>
          <Label htmlFor="h-target">
            Daily target {habit.unit === "minutes" ? "(minutes)" : ""}
          </Label>
          <Input
            id="h-target"
            inputMode="numeric"
            value={target}
            onChange={(e) => setTarget(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      )}
      <div>
        <p className="mb-2 text-sm font-medium text-ink-soft">Days</p>
        <Chips
          ariaLabel="Days"
          multiple
          size="sm"
          options={WEEKDAYS}
          value={days}
          onChange={(v) => setDays(v as number[])}
        />
      </div>
      <Button
        size="lg"
        block
        disabled={!name.trim() || days.length === 0}
        onClick={async () => {
          await updateHabit(habit, {
            name: name.trim(),
            target_value: habit.unit === "boolean" ? 1 : Math.max(1, Number(target) || 1),
            days_of_week: [...days].sort(),
          });
          toast.success("Saved.");
          onClose();
        }}
      >
        Save
      </Button>
    </div>
  );
}
