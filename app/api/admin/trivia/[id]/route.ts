
import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function verifyAdmin() {
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: "Unauthorized", status: 401 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: "Admin privileges required", status: 403 };
  }

  return { user };
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
  const difficulty =
    typeof body.difficulty === "string" ? body.difficulty : "medium";

  if (!question) return "Question text is required.";

  if (options.length !== 4 || options.some((option) => !option)) {
    return "Exactly four non-empty options are required.";
  }

  if (
    typeof correctAnswer !== "number" ||
    !Number.isInteger(correctAnswer) ||
    correctAnswer < 0 ||
    correctAnswer > 3
  ) {
    return "Select a valid correct answer.";
  }

  if (!["easy", "medium", "hard"].includes(difficulty)) {
    return "Invalid difficulty.";
  }

  return null;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const auth = await verifyAdmin();

    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await context.params;
    const questionId = Number(id);

    if (!Number.isInteger(questionId) || questionId <= 0) {
      return NextResponse.json({ error: "Invalid question ID." }, { status: 400 });
    }

    const body = await request.json();

    if (typeof body.is_active === "boolean" &&
        Object.keys(body).length === 1) {
      const adminSupabase = createAdminClient();

      const { data, error } = await adminSupabase
        .from("trivia_questions")
        .update({ is_active: body.is_active })
        .eq("id", questionId)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: "Unable to update question status." }, { status: 500 });
      }

      return NextResponse.json({ question: data });
    }

    const validationError = validateQuestion(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase
      .from("trivia_questions")
      .update({
        question: body.question.trim(),
        options: body.options.map((option: string) => option.trim()),
        correct_answer: body.correct_answer,
        explanation: typeof body.explanation === "string"
          ? body.explanation.trim() || null
          : null,
        category: typeof body.category === "string"
          ? body.category.trim() || null
          : null,
        difficulty: body.difficulty || "medium",
      })
      .eq("id", questionId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "Unable to update question." }, { status: 500 });
    }

    return NextResponse.json({ question: data });
  } catch (error) {
    console.error("Trivia PATCH error:", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const auth = await verifyAdmin();

    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await context.params;
    const questionId = Number(id);

    if (!Number.isInteger(questionId) || questionId <= 0) {
      return NextResponse.json({ error: "Invalid question ID." }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
      .from("trivia_questions")
      .delete()
      .eq("id", questionId);

    if (error) {
      return NextResponse.json({ error: "Unable to delete question." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Trivia DELETE error:", error);
    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
