
import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const serverSupabase = await createServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await serverSupabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const { data: profile, error: profileError } = await serverSupabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    return { error: "Admin privileges required", status: 403 as const };
  }

  return { user, status: 200 as const };
}

function validateQuestion(body: Record<string, unknown>) {
  const question =
    typeof body.question === "string" ? body.question.trim() : "";

  const options = Array.isArray(body.options)
    ? body.options.map((option) =>
        typeof option === "string" ? option.trim() : ""
      )
    : [];

  const correctAnswer = body.correct_answer;
  const category =
    typeof body.category === "string" ? body.category.trim() : "";
  const difficulty =
    typeof body.difficulty === "string" ? body.difficulty : "medium";
  const explanation =
    typeof body.explanation === "string" ? body.explanation.trim() : null;

  if (!question) {
    return { error: "Question text is required." };
  }

  if (
    options.length !== 4 ||
    options.some((option) => !option)
  ) {
    return { error: "Exactly four non-empty answer options are required." };
  }

  if (
    !Number.isInteger(correctAnswer) ||
    typeof correctAnswer !== "number" ||
    correctAnswer < 0 ||
    correctAnswer > 3
  ) {
    return { error: "Select a valid correct answer." };
  }

  if (!["easy", "medium", "hard"].includes(difficulty)) {
    return { error: "Difficulty must be easy, medium, or hard." };
  }

  return {
    data: {
      question,
      options,
      correct_answer: correctAnswer,
      category: category || null,
      difficulty,
      explanation: explanation || null,
      is_active: true,
    },
  };
}

export async function GET() {
  try {
    const auth = await verifyAdmin();

    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase
      .from("trivia_questions")
      .select(
        "id, question, options, correct_answer, explanation, category, difficulty, is_active, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Trivia loading error:", error);
      return NextResponse.json(
        { error: "Unable to load trivia questions." },
        { status: 500 }
      );
    }

    return NextResponse.json({ questions: data || [] });
  } catch (error) {
    console.error("Admin trivia GET error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAdmin();

    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();
    const validation = validateQuestion(body);

    if ("error" in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase
      .from("trivia_questions")
      .insert(validation.data)
      .select()
      .single();

    if (error) {
      console.error("Trivia creation error:", error);
      return NextResponse.json(
        { error: "Unable to create trivia question." },
        { status: 500 }
      );
    }

    return NextResponse.json({ question: data }, { status: 201 });
  } catch (error) {
    console.error("Admin trivia POST error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
