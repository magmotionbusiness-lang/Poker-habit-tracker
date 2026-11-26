"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  Database,
  FileText,
  Flame,
  HeartHandshake,
  Info,
  LogIn,
  LogOut,
  Palette,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
  Volume2,
  VolumeX,
} from "lucide-react";
import { CurrencySelect } from "@/components/forms/currency-select";
import { PageHeader } from "@/components/shell/page-header";
import { InstallPrompt } from "@/components/shell/install-prompt";
import { Dialog } from "@/components/ui/dialog";
import { ListGroup, ListRow } from "@/components/ui/list-row";
import { Segmented } from "@/components/ui/segmented";
import { useAdminAccess } from "@/components/admin/use-admin";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { brand } from "@/config/brand";
import { isProductionDeployment } from "@/lib/env";
import { useAppStore } from "@/lib/store/app-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { wipeLocalData } from "@/lib/db/repo";
import { useSyncStatus } from "@/lib/db/sync-status";
import { useSettings } from "@/lib/db/hooks";

export function MoreScreen() {
  const router = useRouter();
  const { mode, prefs, setPrefs, reset } = useAppStore();
  const [installOpen, setInstallOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const sync = useSyncStatus();
  const settings = useSettings();

  async function signOut() {
    await getSupabaseBrowserClient()?.auth.signOut();
    // Account data stays in the cloud; this device forgets it.
    await wipeLocalData();
    reset();
    toast("Signed out");
    router.replace("/");
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={brand.appName} title="More" />

      <ListGroup title={brand.coach.business}>
        <ListRow
          href="/more/up-the-stakes"
          icon={<Sparkles />}
          label={`${brand.coach.businessTm} with ${brand.coach.name}`}
          detail="The 6-week cohort, free training, waitlist"
        />
        {mode === "account" && <AdminRow />}
      </ListGroup>

      <ListGroup title="Your system">
        <ListRow
          href="/more/habits"
          icon={<Flame />}
          label="Habits & streak"
          detail="Targets, rest days, commitment"
        />
        <ListRow
          href="/more/notifications"
          icon={<Bell />}
          label="Reminders"
          detail="Daily nudge & quiet hours"
        />
        <ListRow
          href="/more/data"
          icon={<Database />}
          label="Data & sync"
          detail={
            mode === "account"
              ? sync.state === "error"
                ? "Sync problem — tap for details"
                : "Export, backup status, demo data"
              : "Export, demo data"
          }
        />
      </ListGroup>

      {settings?.uts && (
        <p className="-mt-2 px-1 text-sm text-lavender">
          UTS {settings.uts.status} · Pro
          {settings.uts.proUntil
            ? ` until ${new Date(settings.uts.proUntil).toLocaleDateString()}`
            : ""}
        </p>
      )}
      {settings?.utsCodeError && (
        <p className="-mt-2 px-1 text-sm text-danger">{settings.utsCodeError}</p>
      )}

      <ListGroup title="Account">
        {mode === "account" ? (
          <ListRow
            icon={<LogOut />}
            label="Sign out"
            detail="Backed up in your account; this device is cleared"
            onClick={signOut}
          />
        ) : (
          <ListRow
            href="/login"
            icon={<LogIn />}
            label="Create account or sign in"
            detail="You're in guest mode — data lives on this device"
          />
        )}
        <ListRow
          icon={<UserRound />}
          label="Mode"
          trailing={<span className="text-sm text-ink-muted capitalize">{mode ?? "—"}</span>}
        />
      </ListGroup>

      <ListGroup title="Display">
        <div className="space-y-3 px-4 py-4">
          <p className="text-sm font-medium text-ink-soft">Show results in</p>
          <Segmented
            ariaLabel="Display results in"
            value={prefs.displayMode}
            onValueChange={(v) => setPrefs({ displayMode: v })}
            options={[
              { value: "money", label: "Money" },
              { value: "bb", label: "Big blinds" },
            ]}
            className="w-full"
          />
        </div>
        <div className="px-4 py-4">
          <CurrencySelect
            id="currency"
            label="Default currency"
            value={prefs.currency}
            onChange={(c) => setPrefs({ currency: c })}
          />
        </div>
        <ListRow
          icon={prefs.sound === false ? <VolumeX /> : <Volume2 />}
          label="Sounds"
          detail="Chips, cards and celebrations"
          trailing={
            <Switch
              checked={prefs.sound !== false}
              onCheckedChange={(v) => setPrefs({ sound: v })}
              aria-label="Sounds"
            />
          }
        />
        <div className="px-4 py-3">
          <p className="mb-1 flex items-center gap-2 font-medium">
            <Sparkles className="anim-pulse size-4 text-lavender" aria-hidden /> Animations
          </p>
          <p className="mb-2 text-sm text-ink-muted">
            Gentle keeps fades, fills and counters but drops slides and bounces. Auto follows your
            phone&apos;s Reduce Motion setting.
          </p>
          <Segmented
            ariaLabel="Animations"
            value={prefs.motion ?? "auto"}
            onValueChange={(v) => setPrefs({ motion: v })}
            options={[
              { value: "auto", label: "Auto" },
              { value: "full", label: "Full" },
              { value: "gentle", label: "Gentle" },
            ]}
            className="w-full [&>*]:flex-1"
          />
        </div>
        <ListRow
          label="Four-colour deck"
          detail="Diamonds blue, clubs green"
          trailing={
            <Switch
              checked={prefs.fourColorDeck}
              onCheckedChange={(v) => setPrefs({ fourColorDeck: v })}
              aria-label="Four-colour deck"
            />
          }
        />
      </ListGroup>

      <ListGroup title="App">
        <ListRow
          icon={<Smartphone />}
          label="Install to Home Screen"
          detail="Needed for reminders on iPhone"
          onClick={() => setInstallOpen(true)}
        />
        {!isProductionDeployment && (
          <ListRow
            href="/design"
            icon={<Palette />}
            label="Design system"
            detail="Tokens & components (not in production)"
          />
        )}
        <ListRow
          href="/legal/responsible-gaming"
          icon={<HeartHandshake />}
          label="Responsible gaming"
        />
        <ListRow href="/legal/privacy" icon={<ShieldCheck />} label="Privacy policy" />
        <ListRow href="/legal/terms" icon={<FileText />} label="Terms" />
        <ListRow
          icon={<Info />}
          label="Version"
          trailing={<span className="num text-sm text-ink-muted">0.1.0 · Phase 0</span>}
        />
      </ListGroup>

      <Button variant="danger" block onClick={() => setConfirmReset(true)}>
        Reset this device
      </Button>

      <Dialog open={installOpen} onOpenChange={setInstallOpen} title="Install Stakers">
        <InstallPrompt force />
      </Dialog>
      <Dialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset this device?"
        description="Clears guest data and preferences stored on this device. Account data in the cloud is not affected."
      >
        <div className="flex gap-3">
          <Button variant="secondary" block onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
          <Button variant="danger" block onClick={signOut}>
            Reset
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

/** Shown only to admins (the /admin route and RLS enforce it regardless). */
function AdminRow() {
  const access = useAdminAccess();
  if (access.state !== "admin") return null;
  return (
    <ListRow
      href="/admin"
      icon={<ShieldCheck />}
      label="Admin"
      detail="Announcements, Daily Hand, codes, leads, push"
    />
  );
}
