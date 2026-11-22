
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type TriviaAnnouncement = {
  id: string;
  message: string;
  link_url: string | null;
  display_order: number;
};

export default function TriviaAnnouncementBar() {
  const [announcements, setAnnouncements] = useState<
    TriviaAnnouncement[]
  >([]);

  useEffect(() => {
    const supabase = createClient();

    const loadAnnouncements = async () => {
      const { data, error } = await supabase
        .from("trivia_announcements")
        .select("id, message, link_url, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Error loading Trivia announcements:", error);
        return;
      }

      setAnnouncements(data || []);
    };

    void loadAnnouncements();

    const channel = supabase
      .channel("trivia-announcements")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trivia_announcements",
        },
        () => {
          void loadAnnouncements();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  if (announcements.length === 0) return null;

  const items = [...announcements, ...announcements];

  return (
    <div className="w-full overflow-hidden bg-purple-900 text-white py-3 rounded-xl mb-6">
      <div className="flex whitespace-nowrap animate-announcement-scroll">
        {items.map((announcement, index) => (
          <span
            key={`${announcement.id}-${index}`}
            className="inline-flex items-center px-8 text-sm font-semibold"
          >
            <span className="mr-2 text-yellow-300">🔥</span>

            {announcement.link_url ? (
              <Link
                href={announcement.link_url}
                className="hover:underline"
              >
                {announcement.message}
              </Link>
            ) : (
              <span>{announcement.message}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
