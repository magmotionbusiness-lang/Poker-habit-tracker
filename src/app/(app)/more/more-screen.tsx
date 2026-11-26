"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  FileText,
  HeartHandshake,
  Info,
  LogIn,
  LogOut,
  Palette,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { InstallPrompt } from "@/components/shell/install-prompt";
import { Dialog } from "@/components/ui/dialog";
import { ListGroup, ListRow } from "@/components/ui/list-row";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { brand } from "@/config/brand";
import { isProductionDeployment } from "@/lib/env";
import { useAppStore } from "@/lib/store/app-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const CURRENCIES = ["USD", "EUR", "GBP", "HUF", "CAD", "AUD"] as const;

export function MoreScreen() {
  const router = useRouter();
  const { mode, prefs, setPrefs, reset } = useAppStore();
  const [installOpen, setInstallOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  async function signOut() {
    await getSupabaseBrowserClient()?.auth.signOut();
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
      </ListGroup>

      <ListGroup title="Account">
        {mode === "account" ? (
          <ListRow
            icon={<LogOut />}
            label="Sign out"
            detail="Your data stays backed up"
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
        <div className="space-y-3 px-4 py-4">
          <label htmlFor="currency" className="block text-sm font-medium text-ink-soft">
            Default currency
          </label>
          <select
            id="currency"
            value={prefs.currency}
            onChange={(e) => setPrefs({ currency: e.target.value })}
            className="h-11 w-full rounded-md border border-line bg-field px-3 text-[16px] text-ink"
          >
            {Array.from(new Set([prefs.currency, ...CURRENCIES])).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
