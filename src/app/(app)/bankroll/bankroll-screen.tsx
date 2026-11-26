"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Lightbulb,
  Plus,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { LedgerChart } from "@/components/charts/ledger-chart";
import { MonthlyBars } from "@/components/charts/monthly-bars";
import { WinLossCalendar } from "@/components/charts/win-loss-calendar";
import { StatsFilterSheet, type RangeKey } from "@/components/bankroll/stats-filter-sheet";
import { formatDuration } from "@/components/sessions/timer";
import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/content/copy";
import { dailyResults, ledger, monthlyResults, sessionDelta } from "@/lib/bankroll/bankroll";
import { useBankrollSummary } from "@/lib/db/derived";
import { useToday, useVenues } from "@/lib/db/hooks";
import { addDays } from "@/lib/dates/dates";
import { formatMoney } from "@/lib/money";
import { ratingInsight } from "@/lib/stats/insights";
import { sessionDurationMs, stakesLabel } from "@/lib/stats/session-math";
import { breakdown, computeStats, filterSessions, type SessionFilter } from "@/lib/stats/stats";
import { useAppStore } from "@/lib/store/app-store";
import { useUi } from "@/lib/store/ui-store";
import type { GameRating } from "@/lib/domain/types";

export function BankrollScreen() {
  const currency = useAppStore((s) => s.prefs.currency);
  const summary = useBankrollSummary(currency);
  const venues = useVenues() ?? [];
  const { today, tz } = useToday();
  const open = useUi((s) => s.open);
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<"balance" | "results">("balance");
  const [filter, setFilter] = useState<SessionFilter>({});
  const [range, setRange] = useState<RangeKey>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const br = summary?.items.find((i) => i.bankroll.id === selected) ?? summary?.items[0];
  const bankroll = br?.bankroll;

  const view = useMemo(() => {
    if (!summary || !bankroll) return null;
    const own = summary.sessions.filter((s) => s.bankroll_id === bankroll.id);
    const from =
      range === "30d"
        ? addDays(today, -29)
        : range === "90d"
          ? addDays(today, -89)
          : range === "ytd"
            ? `${today.slice(0, 4)}-01-01`
            : undefined;
    const filtered = filterSessions(own, { ...filter, from }, tz);
    const ccy = bankroll.currency;
    const rates: Record<string, string> = {};
    for (const s of filtered)
      if (s.currency !== ccy && s.fx_rate) rates[`${s.currency}:${ccy}`] = s.fx_rate;
    const stats = computeStats(filtered, ccy, rates, { includeCosts: true });
    const byRating = breakdown(filtered, (s) => s.game_rating as GameRating | null, ccy, rates);
    return {
      events: ledger(bankroll, summary.txs, summary.sessions),
      stats,
      insight: ratingInsight(byRating, copy.stats.ratingInsight, (m) =>
        formatMoney({ minor: m, currency: ccy }, { trimZeroCents: true }),
      ),
      monthly: monthlyResults(own, bankroll, tz).slice(-12),
      daily: dailyResults(own, bankroll, tz),
      list: own.filter((s) => s.status === "finished"),
      txs: summary.txs
        .filter((t) => t.bankroll_id === bankroll.id || t.transfer_bankroll_id === bankroll.id)
        .reverse(),
      stakesOptions: [...new Set(own.map(stakesLabel))],
      tagOptions: [...new Set(own.flatMap((s) => s.tags))],
    };
  }, [summary, bankroll, filter, range, today, tz]);

  if (!summary) return <Loading />;
  if (!bankroll || !view) {
    return (
      <>
        <PageHeader eyebrow="Results" title="Bankroll" />
        <EmptyState
          icon={<Wallet />}
          title={copy.empty.bankroll.title}
          body="Create your bankroll — money set aside for poker only — and every session builds the graph."
          action={<Button onClick={() => open("bankroll")}>Create bankroll</Button>}
        />
      </>
    );
  }

  const ccy = bankroll.currency;
  const money = (m: number, o: Parameters<typeof formatMoney>[1] = {}) =>
    formatMoney({ minor: m, currency: ccy }, { trimZeroCents: true, ...o });
  const st = view.stats;
  const activeFilters =
    Object.values(filter).filter((v) => (Array.isArray(v) ? v.length : v !== undefined)).length +
    (range !== "all" ? 1 : 0);
  const sampleNote = copy.stats.sample[st.sample]?.replace("{n}", String(st.sessions));
  const tone = (m: number | null) =>
    m === null ? "" : m > 0 ? "text-success" : m < 0 ? "text-danger" : "";
  const pct = (x: number | null) => (x === null ? "—" : `${Math.round(x * 1000) / 10}%`);

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Results"
        title="Bankroll"
        action={
          <Button
            size="icon-sm"
            variant="secondary"
            aria-label="New bankroll"
            onClick={() => open("bankroll")}
          >
            <Plus />
          </Button>
        }
      />

      {summary.items.length > 1 && (
        <div className="-mx-4 flex scrollbar-none gap-2 overflow-x-auto px-4">
          {summary.items.map((it) => (
            <button
              key={it.bankroll.id}
              type="button"
              aria-pressed={it.bankroll.id === bankroll.id}
              onClick={() => setSelected(it.bankroll.id)}
              className={`shrink-0 rounded-lg border px-4 py-2.5 text-left ${it.bankroll.id === bankroll.id ? "border-primary-strong bg-pill" : "border-line bg-surface"}`}
            >
              <span className="block text-xs text-ink-muted">{it.bankroll.name}</span>
              <span className="num block font-semibold">
                {formatMoney(
                  { minor: it.balance, currency: it.bankroll.currency },
                  { trimZeroCents: true },
                )}
              </span>
            </button>
          ))}
        </div>
      )}

      <Card glow>
        <CardHeader
          eyebrow={bankroll.name}
          action={
            <Segmented
              ariaLabel="Graph mode"
              value={mode}
              onValueChange={setMode}
              options={[
                { value: "balance", label: "Balance" },
                { value: "results", label: "Results" },
              ]}
            />
          }
        />
        <p className="num font-display text-[40px] leading-none font-semibold tracking-[-0.02em]">
          {money(br!.balance)}
        </p>
        <p className="mt-1.5 text-sm text-ink-muted">
          {summary.items.length > 1 &&
            summary.total !== null &&
            `Total ${formatMoney({ minor: summary.total, currency }, { trimZeroCents: true })} · `}
          Results {money(view.events.at(-1)?.results ?? 0, { signed: true })}
        </p>
        <div className="mt-4">
          <LedgerChart events={view.events} currency={ccy} mode={mode} />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => open("transaction")}>
          <ArrowDownLeft aria-hidden /> Deposit / out
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/sessions/edit">
            <Plus aria-hidden /> Log session
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader
          eyebrow="Stats"
          action={
            <Button
              size="sm"
              variant={activeFilters ? "outline" : "ghost"}
              onClick={() => setFilterOpen(true)}
            >
              <SlidersHorizontal aria-hidden /> Filter{activeFilters ? ` · ${activeFilters}` : ""}
            </Button>
          }
        />
        {sampleNote && (
          <p className="mb-4 rounded-md bg-field px-3 py-2 text-sm text-ink-soft">{sampleNote}</p>
        )}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
          <StatCell
            label="Net (after costs)"
            value={money(st.net, { signed: true })}
            className={tone(st.net)}
          />
          <StatCell
            label="Hourly"
            value={st.hourly === null ? "—" : `${money(st.hourly, { signed: true })}/h`}
            className={tone(st.hourly)}
          />
          <StatCell label="Sessions · hours" value={`${st.sessions} · ${Math.round(st.hours)}h`} />
          <StatCell label="Winning sessions" value={pct(st.winRate)} />
          <StatCell
            label="Biggest win"
            value={st.biggestWin === null ? "—" : money(st.biggestWin, { signed: true })}
            className={tone(st.biggestWin)}
          />
          <StatCell
            label="Biggest loss"
            value={st.biggestLoss === null ? "—" : money(st.biggestLoss, { signed: true })}
            className={tone(st.biggestLoss)}
          />
          <StatCell label="Std dev / session" value={st.stdDev === null ? "—" : money(st.stdDev)} />
          {st.bbPerHour !== null && (
            <StatCell
              label="BB/hr (live cash)"
              value={`${st.bbPerHour > 0 ? "+" : ""}${st.bbPerHour}`}
              className={tone(st.bbPerHour)}
            />
          )}
          {st.bbPer100 !== null && (
            <StatCell
              label="BB/100 (online)"
              value={`${st.bbPer100 > 0 ? "+" : ""}${st.bbPer100}`}
              className={tone(st.bbPer100)}
            />
          )}
          {st.tournaments > 0 && (
            <>
              <StatCell label="ROI" value={pct(st.roi)} className={tone(st.roi)} />
              <StatCell label="ITM" value={pct(st.itm)} />
              <StatCell
                label="Avg finish"
                value={st.avgFinish === null ? "—" : String(st.avgFinish)}
              />
              <StatCell
                label="Avg buy-in"
                value={st.avgBuyIn === null ? "—" : money(st.avgBuyIn)}
              />
            </>
          )}
        </dl>
        {st.excluded > 0 && (
          <p className="mt-3 text-xs text-ink-subtle">
            {st.excluded} session(s) without an exchange rate are excluded.
          </p>
        )}
      </Card>

      {view.insight && (
        <Card className="flex gap-3">
          <Lightbulb className="mt-0.5 size-5 shrink-0 text-lavender" aria-hidden />
          <div>
            <p className="eyebrow mb-1">What&apos;s working</p>
            <p className="text-ink">{view.insight}</p>
          </div>
        </Card>
      )}

      {view.monthly.length > 0 && (
        <Card>
          <CardHeader eyebrow="Monthly results" />
          <MonthlyBars data={view.monthly} currency={ccy} />
        </Card>
      )}

      <Card>
        <CardHeader eyebrow="Up & down days" />
        <div className="-mx-1 scrollbar-none overflow-x-auto px-1">
          <WinLossCalendar results={view.daily} today={today} currency={ccy} />
        </div>
      </Card>

      <section aria-labelledby="sessions-h" className="space-y-2">
        <h2 id="sessions-h" className="eyebrow px-1 !font-sans">
          Sessions
        </h2>
        {view.list.length === 0 ? (
          <p className="px-1 text-sm text-ink-muted">No sessions in this bankroll yet.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {(showAll ? view.list : view.list.slice(0, 15)).map((s) => {
              const r = sessionDelta(s, bankroll);
              const venue = venues.find((v) => v.id === s.venue_id)?.name;
              return (
                <li key={s.id}>
                  <Link
                    href={`/sessions/edit?id=${s.id}`}
                    className="flex min-h-[60px] items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {s.game} {stakesLabel(s)}{" "}
                        {venue && <span className="text-ink-muted">· {venue}</span>}
                      </span>
                      <span className="block text-sm text-ink-muted">
                        {new Date(s.started_at).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        · {formatDuration(sessionDurationMs(s))}
                        {s.game_rating && ` · ${s.game_rating}-game`}
                      </span>
                    </span>
                    <span className={`num font-semibold ${tone(r)}`}>
                      {money(r, { signed: true })}
                    </span>
                    <ChevronRight className="size-4 text-ink-subtle" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {!showAll && view.list.length > 15 && (
          <Button variant="ghost" block onClick={() => setShowAll(true)}>
            Show all {view.list.length}
          </Button>
        )}
      </section>

      {view.txs.length > 0 && (
        <section aria-labelledby="tx-h" className="space-y-2">
          <h2 id="tx-h" className="eyebrow px-1 !font-sans">
            Deposits & withdrawals
          </h2>
          <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {view.txs.slice(0, 10).map((t) => {
              const incoming =
                t.type === "deposit" ||
                (t.type === "transfer" && t.transfer_bankroll_id === bankroll.id) ||
                (t.type === "adjustment" && t.amount_minor > 0);
              const amount = incoming ? Math.abs(t.amount_minor) : -Math.abs(t.amount_minor);
              return (
                <li key={t.id} className="flex min-h-[52px] items-center gap-3 px-4 py-2">
                  {incoming ? (
                    <ArrowDownLeft className="size-4 text-ink-muted" aria-hidden />
                  ) : (
                    <ArrowUpRight className="size-4 text-ink-muted" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium capitalize">{t.type}</span>
                    <span className="block truncate text-sm text-ink-muted">
                      {new Date(t.occurred_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {t.note && ` · ${t.note}`}
                    </span>
                  </span>
                  <span className="num font-semibold text-ink-soft">
                    {money(amount, { signed: true })}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="px-1 text-xs text-ink-subtle">
        <Badge variant="outline" size="sm">
          Note
        </Badge>{" "}
        Results include tips & expenses. Money moved in and out never counts as profit.
      </p>

      <StatsFilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        filter={filter}
        setFilter={setFilter}
        range={range}
        setRange={setRange}
        stakesOptions={view.stakesOptions}
        venueOptions={venues.map((v) => ({ value: v.id, label: v.name }))}
        tagOptions={view.tagOptions}
      />
    </div>
  );
}

function StatCell({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={`num mt-0.5 font-display text-xl font-semibold ${className ?? ""}`}>
        {value}
      </dd>
    </div>
  );
}

function Loading() {
  return (
    <div className="space-y-4 pt-5">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
