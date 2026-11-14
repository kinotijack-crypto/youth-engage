import { createClient } from "@/lib/supabase/client"
import { Question, Category, Answer } from "@/types/database.types"

const supabase = createClient()

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name")

  if (error) {
    console.error("Error fetching categories:", error)
    return []
  }
  return data || []
}

export async function getQuestions(categoryId?: number): Promise<Question[]> {
  let query = supabase
    .from("questions")
    .select(`
      *,
      category:categories(*),
      profiles:profiles(username, full_name, avatar_url, role),
      answers:answers(count)
    `)
    .order("created_at", { ascending: false })

  if (categoryId) {
    query = query.eq("category_id", categoryId)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching questions:", error)
    return []
  }

  return data || []
}

export async function getQuestionById(id: string) {
  const { data: question, error: questionError } = await supabase
    .from("questions")
    .select(`
      *,
      category:categories(*),
      profiles:profiles(username, full_name, avatar_url, role)
    `)
    .eq("id", id)
    .single()

  if (questionError) {
    console.error("Error fetching question:", questionError)
    return null
  }

  const { data: answers, error: answersError } = await supabase
    .from("answers")
    .select(`
      *,
      profiles:profiles(username, full_name, avatar_url, role)
    `)
    .eq("question_id", id)
    .order("created_at", { ascending: true })

  if (answersError) {
    console.error("Error fetching answers:", answersError)
  }

  return {
    question,
    answers: answers || [],
  }
}