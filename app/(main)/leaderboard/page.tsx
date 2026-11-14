"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadLeaderboard() {
      const { data } = await supabase
        .from("profiles")
        .select("username, full_name, points, streak")
        .order("points", { ascending: false })
        .limit(20);

      setLeaders(data || []);
      setLoading(false);
    }

    loadLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Leaderboard
          </h1>
          <p className="text-gray-600">Top contributors on YouthEngage</p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : leaders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No users on the leaderboard yet.
            </div>
          ) : (
            <div className="divide-y">
              {leaders.map((user, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-5 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        index === 0
                          ? "bg-yellow-500"
                          : index === 1
                          ? "bg-gray-400"
                          : index === 2
                          ? "bg-orange-600"
                          : "bg-purple-500"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {user.full_name || user.username || "Anonymous"}
                      </p>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-purple-700">{user.points} pts</p>
                    <p className="text-sm text-gray-500">{user.streak} day streak</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="text-center mt-8">
          <Link href="/" className="text-purple-600 font-medium hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}