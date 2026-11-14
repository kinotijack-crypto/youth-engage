import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export function getUserRank(points: number) {
  if (points >= 500) return { title: "Youth Legend", level: 5, nextLevel: 1000, color: "text-purple-600 bg-purple-100" };
  if (points >= 250) return { title: "Mentor Guide", level: 4, nextLevel: 500, color: "text-amber-600 bg-amber-100" };
  if (points >= 100) return { title: "Changemaker", level: 3, nextLevel: 250, color: "text-emerald-600 bg-emerald-100" };
  if (points >= 25) return { title: "Explorer", level: 2, nextLevel: 100, color: "text-blue-600 bg-blue-100" };
  return { title: "Newcomer", level: 1, nextLevel: 25, color: "text-slate-600 bg-slate-100" };
}

export async function awardPointsAndCheckBadges(userId: string, pointsToAdd: number, reason: string) {
  const supabase = createClient();

  // 1. Get current user points
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("points")
    .eq("id", userId)
    .single();

  if (profileError || !profile) return;

  const newPoints = (profile.points || 0) + pointsToAdd;

  // 2. Update user profile with new points
  await supabase
    .from("profiles")
    .update({ points: newPoints })
    .eq("id", userId);

  // 3. Show popup toast message on screen
  toast.success(`+${pointsToAdd} Points!`, {
    description: reason,
  });

  // 4. Save notification to database so the Bell icon shows it
  await supabase.from("notifications").insert({
    user_id: userId,
    title: `+${pointsToAdd} Points Earned!`,
    message: reason,
    type: "points",
    link: "/profile",
  });

  // 5. Check if user unlocked any new badges
  const { data: allBadges } = await supabase
    .from("badges")
    .select("*")
    .lte("points_required", newPoints);

  const { data: existingBadges } = await supabase
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", userId);

  const ownedIds = new Set(existingBadges?.map((b) => b.badge_id) || []);

  if (allBadges) {
    for (const badge of allBadges) {
      if (!ownedIds.has(badge.id)) {
        const { error: insertError } = await supabase
          .from("user_badges")
          .insert({ user_id: userId, badge_id: badge.id });

        if (!insertError) {
          toast.success(`Badge Unlocked: ${badge.icon} ${badge.name}`, {
            description: badge.description,
            duration: 5000,
          });

          // Save badge notification to database
          await supabase.from("notifications").insert({
            user_id: userId,
            title: `New Badge Unlocked! 🏆`,
            message: `${badge.icon} ${badge.name} — ${badge.description}`,
            type: "badge",
            link: "/profile",
          });
        }
      }
    }
  }
}

export async function checkDailyStreak(userId: string) {
  const supabase = createClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: profile } = await supabase
    .from("profiles")
    .select("streak_count, last_active_date, points")
    .eq("id", userId)
    .single();

  if (!profile || profile.last_active_date === today) return;

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const isConsecutive = profile.last_active_date === yesterday;
  const newStreak = isConsecutive ? (profile.streak_count || 0) + 1 : 1;

  await supabase
    .from("profiles")
    .update({
      streak_count: newStreak,
      last_active_date: today,
    })
    .eq("id", userId);

  await awardPointsAndCheckBadges(
    userId,
    5,
    `Daily check-in! Current streak: ${newStreak} day${newStreak > 1 ? "s" : ""} 🔥`
  );
}