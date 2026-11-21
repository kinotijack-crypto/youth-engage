
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Badge } from "@/types/badges";

export async function checkAndAwardBadges(): Promise<Badge[]> {
  const supabase = await createClient();

  // Identify the authenticated user securely
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return [];

  const userId = user.id;

  // 1. Get the authenticated user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("points, streak")
    .eq("id", userId)
    .single();

  if (!profile) return [];

  // 2. Count user actions
  const [
    { count: questionsCount },
    { count: answersCount },
    { count: triviaCorrect },
  ] = await Promise.all([
    supabase
      .from("questions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("answers")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("trivia_attempts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_correct", true),
  ]);

  const stats = {
    points: profile.points || 0,
    streak: profile.streak || 0,
    questions_posted: questionsCount || 0,
    answers_posted: answersCount || 0,
    trivia_correct: triviaCorrect || 0,
  };

  // 3. Get badges and already-earned badges
  const { data: allBadges } = await supabase
    .from("badges")
    .select("*");

  const { data: earned } = await supabase
    .from("user_badges")
    .select("badge_id")
    .eq("user_id", userId);

  const earnedIds = new Set(earned?.map((e) => e.badge_id) || []);

  // 4. Find newly earned badges
  const newBadges = (allBadges || []).filter((badge) => {
    if (earnedIds.has(badge.id)) return false;

    const currentValue =
      stats[badge.criteria_type as keyof typeof stats] ?? 0;

    return currentValue >= badge.criteria_value;
  });

  if (newBadges.length === 0) return [];

  // 5. Insert newly earned badges
  const inserts = newBadges.map((badge) => ({
    user_id: userId,
    badge_id: badge.id,
  }));

  const { error } = await supabase
    .from("user_badges")
    .insert(inserts);

  if (error) {
    console.error("Error awarding badges:", error);
    return [];
  }

  // 6. Award bonus points
  const bonusPoints = newBadges.reduce(
    (sum, badge) => sum + (badge.points_reward || 0),
    0
  );

  if (bonusPoints > 0) {
    const { error: pointsError } = await supabase
      .from("profiles")
      .update({ points: (profile.points || 0) + bonusPoints })
      .eq("id", userId);

    if (pointsError) {
      console.error("Error awarding badge points:", pointsError);
    }
  }

  revalidatePath("/profile");
  revalidatePath("/leaderboard");

  return newBadges;
}
