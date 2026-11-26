"use client";

import { useState } from "react";
import { Chips } from "@/components/forms/chips";
import { MoneyInput } from "@/components/forms/money-input";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { deleteGoal, saveGoal } from "@/lib/db/actions";
import type { Goal, GoalType, GoalUnit } from "@/lib/domain/types";
import { errorMessage } from "@/lib/errors";
import { useAppStore } from "@/lib/store/app-store";

const TYPES: Array<{ value: GoalType; label: string }> = [
  { value: "profit", label: "Profit" },
  { value: "bankroll", label: "Bankroll" },
  { value: "volume", label: "Volume" },
  { value: "study", label: "Study" },
  { value: "stake", label: "Stake" },
  { value: "custom", label: "Custom" },
];

/** Add or edit a goal. `goal` null = new. */
export function GoalSheet({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  goal: Goal | null;
}) {
  const currency = useAppStore((s) => s.prefs.currency);
  const [type, setType] = useState<GoalType>(goal?.type ?? "profit");
  const [title, setTitle] = useState(goal?.title ?? "");
  const [amount, setAmount] = useState<number | null>(
    goal?.unit === "minor" ? goal.target_value : null,
  );
  const [count, setCount] = useState(
    goal && goal.unit !== "minor"
      ? String(goal.unit === "minutes" ? goal.target_value / 60 : goal.target_value)
      : "",
  );
  const [volumeUnit, setVolumeUnit] = useState<"hours" | "sessions">(
    goal?.unit === "sessions" ? "sessions" : "hours",
  );
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [isMain, setIsMain] = useState(goal?.is_main ?? false);
  const ccy = goal?.currency ?? currency;
  const money = type === "profit" || type === "bankroll";

  async function save() {
    try {
      const unit: GoalUnit = money
        ? "minor"
        : type === "volume"
          ? volumeUnit
          : type === "study"
            ? "minutes"
            : "count";
      const target = money
        ? (amount ?? 0)
        : type === "study"
          ? Math.round(Number(count) * 60)
          : type === "stake"
            ? 1
            : Math.round(Number(count));
      if (!target || target <= 0) throw new Error("Set a target above zero.");
      const defaultTitle = {
        profit: "Profit target",
        bankroll: "Bankroll target",
        volume: "Volume target",
        study: "Study target",
        stake: "Move up a stake",
        custom: "My goal",
        reviews: "Hands reviewed",
      }[type];
      await saveGoal({
        id: goal?.id,
        type,
        title: title.trim() || defaultTitle,
        target_value: target,
        start_value: goal?.start_value ?? 0,
        manual_value: type === "stake" || type === "custom" ? (goal?.manual_value ?? 0) : null,
        currency: money ? ccy : null,
        unit,
        starts_at: goal?.starts_at ?? new Date().toISOString(),
        deadline: deadline || null,
        is_main: isMain,
        status: goal?.status ?? "active",
        achieved_at: goal?.achieved_at ?? null,
      });
      toast.success(goal ? "Goal updated." : "Goal set. Now the system works toward it.");
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={goal ? "Edit goal" : "New goal"}>
      <div className="space-y-4">
        {!goal && (
          <Chips
            ariaLabel="Goal type"
            size="sm"
            options={TYPES}
            value={type}
            onChange={(v) => setType(v as GoalType)}
          />
        )}
        <div>
          <Label htmlFor="goal-title">Name</Label>
          <Input
            id="goal-title"
            placeholder={type === "stake" ? "Play 2/5 by June" : "Make my first $50k from poker"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        {money && <MoneyInput label="Target" currency={ccy} value={amount} onChange={setAmount} />}
        {type === "volume" && (
          <Chips
            ariaLabel="Volume unit"
            size="sm"
            options={[
              { value: "hours", label: "Hours" },
              { value: "sessions", label: "Sessions" },
            ]}
            value={volumeUnit}
            onChange={(v) => setVolumeUnit(v as "hours" | "sessions")}
          />
        )}
        {(type === "volume" || type === "study" || type === "custom") && (
          <div>
            <Label htmlFor="goal-count">{type === "study" ? "Target hours" : "Target"}</Label>
            <Input
              id="goal-count"
              inputMode="numeric"
              value={count}
              onChange={(e) => setCount(e.target.value.replace(/[^\d.]/g, ""))}
            />
          </div>
        )}
        <div>
          <Label htmlFor="goal-deadline">Deadline (optional)</Label>
          <Input
            id="goal-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-4 py-3">
          <span className="text-sm font-medium">Main goal (shown on Today)</span>
          <Switch checked={isMain} onCheckedChange={setIsMain} aria-label="Main goal" />
        </div>
        <Button size="lg" block onClick={save}>
          {goal ? "Save" : "Set goal"}
        </Button>
        {goal && (
          <Button
            variant="ghost"
            block
            onClick={async () => {
              await deleteGoal(goal.id);
              onOpenChange(false);
              toast("Goal deleted");
            }}
          >
            Delete goal
          </Button>
        )}
      </div>
    </Sheet>
  );
}
