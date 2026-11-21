"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkAccessAndLoad() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Check if user is admin or moderator
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin" && profile?.role !== "moderator") {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      // Load leaderboard data
      const { data } = await supabase
        .from("profiles")
        .select("username, full_name, points, streak")
        .order("points", { ascending: false })
        .limit(50);

      setLeaders(data || []);
      setLoading(false);
    }

    checkAccessAndLoad();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  // Show Access Denied if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 px-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            Only administrators can view the Leaderboard.
          </p>
          <Link href="/" className="text-purple-600 font-medium hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // Admin view
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Leaderboard
          </h1>
          <p className="text-gray-600">Top contributors (Admin only)</p>
        </div>

        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          {leaders.length === 0 ? (
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
          <Link href="/admin" className="text-purple-600 font-medium hover:underline">
            ← Back to Admin Panel
          </Link>
        </div>
      </div>
    </div>
  );
}