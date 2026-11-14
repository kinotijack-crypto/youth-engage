"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Content = {
  id: string;
  title: string;
  content: string | null;
  link: string | null;
  type: string;
  image_url: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    username: string | null;
  } | null;
};

export default function MentorshipPage() {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const { data } = await supabase
        .from("mentorship_content")
        .select(`
          id,
          title,
          content,
          link,
          type,
          image_url,
          created_at,
          profiles:profiles(full_name, username)
        `)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });

      setContents(data || []);
      setLoading(false);
    }

    loadData();

    // Real-time subscription
    const channel = supabase
      .channel("mentorship-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "mentorship_content",
        },
        async () => {
          // Reload data when anything changes
          const { data } = await supabase
            .from("mentorship_content")
            .select(`
              id,
              title,
              content,
              link,
              type,
              image_url,
              created_at,
              profiles:profiles(full_name, username)
            `)
            .eq("is_approved", true)
            .order("created_at", { ascending: false });

          setContents(data || []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredContents = contents.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      (item.content && item.content.toLowerCase().includes(query))
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Mentorship & Journeys
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-8">
            Share your journey, learn from others, and discover useful mentorship resources.
          </p>

          {user ? (
            <Link
              href="/mentorship/share"
              className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3.5 rounded-full font-medium hover:from-blue-700 hover:to-purple-700 transition shadow-md"
            >
              Share Your Journey
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3.5 rounded-full font-medium"
            >
              Log in to Share Your Journey
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Search stories and resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-5 py-3.5 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-sm"
          />
        </div>

        {/* Feed */}
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Stories & Resources</h2>

        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading...</div>
        ) : filteredContents.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-sm">
            <div className="text-5xl mb-4">🌱</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? "No matching stories found" : "No stories yet"}
            </h3>
            <p className="text-gray-600">
              {searchQuery
                ? "Try a different search term."
                : "Be the first to share your journey!"}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredContents.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition"
              >
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-56 object-cover"
                  />
                )}

                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      item.type === "journey"
                        ? "bg-green-100 text-green-700"
                        : item.type === "resource"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {item.type === "journey" ? "Journey" : item.type === "resource" ? "Resource" : "Story"}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>

                  {item.content && (
                    <p className="text-gray-600 mb-4 whitespace-pre-line line-clamp-4">
                      {item.content}
                    </p>
                  )}

                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-purple-600 font-medium hover:underline text-sm mb-3"
                    >
                      Visit Resource →
                    </a>
                  )}

                  <div className="pt-3 border-t text-sm text-gray-500">
                    Shared by{" "}
                    <span className="font-medium text-gray-700">
                      {item.profiles?.full_name || item.profiles?.username || "Anonymous"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}