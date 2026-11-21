"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { BadgesSection } from "@/components/BadgesSection";
import { checkAndAwardBadges } from "@/app/actions/badges";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [earnedBadges, setEarnedBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      // Get profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      setProfile(profileData);

      // Check & award any new badges
      await checkAndAwardBadges();

      // Fetch earned badges
      const { data: userBadgesData } = await supabase
        .from("user_badges")
        .select(
          `
          earned_at,
          badge:badges (*)
        `
        )
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });

      const badges = (userBadgesData || []).map((item: any) => ({
        ...item.badge,
        earned_at: item.earned_at,
      }));

      setEarnedBadges(badges);
      setLoading(false);
    }

    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {profile?.full_name?.[0]?.toUpperCase() ||
                user?.email?.[0]?.toUpperCase() ||
                "U"}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile?.full_name || "Youth User"}
              </h1>
              <p className="text-gray-600">@{profile?.username || "username"}</p>
            </div>
          </div>

          {/* Points & Streak */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-purple-50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-700">
                {profile?.points || 0}
              </p>
              <p className="text-sm text-gray-600">Points</p>
            </div>
            <div className="bg-blue-50 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">
                {profile?.streak || 0}
              </p>
              <p className="text-sm text-gray-600">Day Streak</p>
            </div>
          </div>

          {/* Badges Section */}
          <BadgesSection earnedBadges={earnedBadges} />

          {/* Info */}
          <div className="space-y-3 text-sm mt-8">
            <p>
              <span className="font-medium text-gray-700">Email:</span>{" "}
              {user?.email}
            </p>
            <p>
              <span className="font-medium text-gray-700">Role:</span>{" "}
              {profile?.role || "user"}
            </p>
            <p>
              <span className="font-medium text-gray-700">Joined:</span>{" "}
              {new Date(profile?.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="mt-8 pt-6 border-t">
            <Link
              href="/qna"
              className="text-purple-600 font-medium hover:underline"
            >
              ← Back to Q&A
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}