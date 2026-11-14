import { createClient } from "@/lib/supabase/client";

function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "server";
  let visitorId = localStorage.getItem("ye_visitor_id");
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    localStorage.setItem("ye_visitor_id", visitorId);
  }
  return visitorId;
}

export async function trackEvent(
  eventType: string,
  pagePath?: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    const supabase = createClient();
    const visitorId = getOrCreateVisitorId();
    const currentPath = pagePath || (typeof window !== "undefined" ? window.location.pathname : "/");
    const { data: { user } } = await supabase.auth.getUser();

    let userName: string | null = null;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      userName = profile?.full_name || user.email || "Member";

      // Update live presence ("where engaged in the system")
      await supabase
        .from("profiles")
        .update({
          last_seen_at: new Date().toISOString(),
          last_seen_path: currentPath,
          email: user.email,
        })
        .eq("id", user.id);
    }

    await supabase.from("analytics_events").insert({
      visitor_id: visitorId,
      user_id: user?.id || null,
      user_name: userName,
      event_type: eventType,
      page_path: currentPath,
      metadata,
    });
  } catch {
    // Fail silently so tracking never disrupts UX
  }
}