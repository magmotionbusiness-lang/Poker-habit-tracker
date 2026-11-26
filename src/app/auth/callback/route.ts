import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeNext } from "@/lib/safe-redirect";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Landing point for magic links (token_hash) and OAuth (code). On success the session
 * cookie is set and the user continues to `next` (default /today).
 * Note: on iPhone a link from Mail opens in Safari, not the Home Screen app — that's why
 * the login screen also offers the 6-digit code (see DECISIONS.md → "Auth on iOS PWA").
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const next = safeNext(url.searchParams.get("next"));
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.redirect(new URL("/login?error=not_configured", url.origin));

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing_params") };

  if (error) return NextResponse.redirect(new URL("/login?error=link_invalid", url.origin));
  return NextResponse.redirect(
    new URL(`${next}${next.includes("?") ? "&" : "?"}signed_in=1`, url.origin),
  );
}
