
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Promotion = {
  id: string;
  title: string;
  description: string | null;
  media_type: "poster" | "video";
  media_url: string;
  sponsor_name: string | null;
  sponsor_logo_url: string | null;
  link_url: string | null;
  display_order: number;
};

function getYouTubeEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    let videoId = "";

    if (
      parsed.hostname === "youtu.be" ||
      parsed.hostname === "www.youtu.be"
    ) {
      videoId = parsed.pathname.slice(1);
    } else if (
      parsed.hostname === "youtube.com" ||
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "m.youtube.com"
    ) {
      if (parsed.pathname === "/watch") {
        videoId = parsed.searchParams.get("v") || "";
      } else if (parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.split("/")[2] || "";
      } else if (parsed.pathname.startsWith("/shorts/")) {
        videoId = parsed.pathname.split("/")[2] || "";
      }
    }

    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;

    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

export default function TriviaPromotions() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPromotions() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("trivia_promotions")
        .select(
          "id, title, description, media_type, media_url, sponsor_name, sponsor_logo_url, link_url, display_order"
        )
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Unable to load trivia promotions:", error.message);
        setLoading(false);
        return;
      }

      setPromotions(((data || []) as Promotion[]).slice(0, 3));
      setLoading(false);
    }

    void loadPromotions();
  }, []);

  if (loading || promotions.length === 0) {
    return null;
  }

  return (
    <section className="mt-5 space-y-3 border-t border-gray-200 pt-4">
      <div className="text-center">
        <h3 className="text-lg font-extrabold text-gray-900">
  ✨ Opportunities & Promotions
</h3>
        <p className="mt-1 text-sm text-gray-600">
          Discover opportunities from our partners and sponsors.
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4">
        {promotions.map((promotion) => {
          const embedUrl =
            promotion.media_type === "video"
              ? getYouTubeEmbedUrl(promotion.media_url)
              : null;

          const content = (
            <>
              {promotion.media_type === "poster" ? (
                <img
                  src={promotion.media_url}
                  alt={promotion.title}
                  className="mx-auto h-48 w-full rounded-xl object-contain"
                />
              ) : embedUrl ? (
                <div className="aspect-video overflow-hidden rounded-xl bg-black">
                  <iframe
                    src={embedUrl}
                    title={promotion.title}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              ) : (
                <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                  This video link is invalid or unsupported.
                </p>
              )}
            </>
          );

          return (
            <article
              key={promotion.id}
              className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-gray-900">
                    {promotion.title}
                  </h4>
                  {promotion.sponsor_name && (
                    <p className="mt-1 text-xs text-gray-500">
                      Sponsored by {promotion.sponsor_name}
                    </p>
                  )}
                </div>

                {promotion.sponsor_logo_url && (
                  <img
                    src={promotion.sponsor_logo_url}
                    alt={`${promotion.sponsor_name || "Sponsor"} logo`}
                    className="h-12 max-w-24 object-contain"
                  />
                )}
              </div>

              {promotion.link_url ? (
                <a
                  href={promotion.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  {content}
                </a>
              ) : (
                content
              )}

              {promotion.description && (
                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  {promotion.description}
                </p>
              )}

              {promotion.link_url && (
                <a
                  href={promotion.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-block text-sm font-semibold text-purple-700 hover:underline"
                >
                  Learn more →
                </a>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
