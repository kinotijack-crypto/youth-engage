export type Badge = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  criteria_type: string;
  criteria_value: number;
  points_reward: number;
};

export type UserBadge = {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
};