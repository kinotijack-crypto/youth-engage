"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { ShieldBan } from "lucide-react";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const supabase = createClient();
  const lastTrackedPath = useRef<string | null>(null);
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    async function checkSuspensionAndTrack() {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_suspended")
          .eq("id", user.id)
          .single();

        if (profile?.is_suspended) {
          setIsSuspended(true);
          return;
        }
      }

      if (!pathname || lastTrackedPath.current === pathname) return;
      lastTrackedPath.current = pathname;

      await trackEvent("page_view", pathname);

      if (pathname.startsWith("/trivia")) {
        await trackEvent("trivia_visit", pathname);
      } else if (pathname.startsWith("/games")) {
        await trackEvent("game_visit", pathname);
      }
    }

    checkSuspensionAndTrack();
  }, [pathname, supabase]);

  if (isSuspended) {
    return (
      <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4 border rounded-xl p-8 bg-card shadow-lg">
          <ShieldBan className="w-16 h-16 text-red-600 mx-auto" />
          <h2 className="text-2xl font-bold">Account Suspended</h2>
          <p className="text-sm text-muted-foreground">
            Your YouthEngage account has been suspended by an administrator. Contact support if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  return null;
}