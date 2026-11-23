
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Announcement = {
  id: string;
  message: string;
  link_url: string | null;
  display_order: number;
};

export default function AnnouncementBar() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const supabase = createClient();

    const loadAnnouncements = async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, message, link_url, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading announcements:", error);
        return;
      }

      setAnnouncements(data || []);
    };

    loadAnnouncements();

    const channel = supabase
      .channel("public-announcements")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "announcements",
        },
        () => {
          loadAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (announcements.length === 0) return null;

  const items = [...announcements, ...announcements];

  return (
    <div className="w-full overflow-hidden bg-blue-900 text-white py-2">
      <div className="flex whitespace-nowrap animate-announcement-scroll">
        {items.map((announcement, index) => (
          <span
            key={`${announcement.id}-${index}`}
            className="inline-flex items-center px-8 text-sm font-medium"
          >
            <span className="mr-2 text-yellow-300">●</span>

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
