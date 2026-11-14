export type Profile = {
  id: string
  username: string | null
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  role: "user" | "mentor" | "moderator" | "admin"
  points: number
  streak: number
  last_active_date: string | null
  created_at: string
  updated_at: string
}

export type Category = {
  id: number
  name: string
  slug: string
  description: string | null
  created_at: string
}

export type Question = {
  id: string
  user_id: string | null
  title: string
  description: string | null
  category_id: number | null
  is_anonymous: boolean
  views: number
  is_resolved: boolean
  created_at: string
  updated_at: string
  // Joined data
  category?: Category
  profiles?: Profile | null
}

export type Answer = {
  id: string
  question_id: string
  user_id: string | null
  content: string
  is_mentor_answer: boolean
  is_best_answer: boolean
  likes: number
  created_at: string
  updated_at: string
  profiles?: Profile | null
}