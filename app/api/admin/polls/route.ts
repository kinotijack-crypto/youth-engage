
import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

type QuestionInput = {
  question_text: string;
  question_type: "single_choice" | "multiple_choice" | "text";
  is_required?: boolean;
  options?: string[];
};

function validatePoll(body: Record<string, unknown>) {
  const title =
    typeof body.title === "string" ? body.title.trim() : "";

  const description =
    typeof body.description === "string"
      ? body.description.trim()
      : null;

  const contentType = body.content_type;
  const questions = body.questions;

  if (!title) return { error: "Poll or survey title is required." };

  if (!["poll", "survey"].includes(String(contentType))) {
    return { error: "Content type must be poll or survey." };
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    return { error: "Add at least one question." };
  }

  if (contentType === "poll" && questions.length !== 1) {
    return { error: "A poll must contain exactly one question." };
  }

  const cleanedQuestions: QuestionInput[] = [];

  for (const item of questions) {
    if (!item || typeof item !== "object") {
      return { error: "Invalid question data." };
    }

    const question = item as Record<string, unknown>;
    const questionText =
      typeof question.question_text === "string"
        ? question.question_text.trim()
        : "";

    const questionType = question.question_type;
    const options = Array.isArray(question.options)
      ? question.options.map((option) =>
          typeof option === "string" ? option.trim() : ""
        )
      : [];

    if (!questionText) {
      return { error: "Every question must have text." };
    }

    if (
      !["single_choice", "multiple_choice", "text"].includes(
        String(questionType)
      )
    ) {
      return { error: "Invalid question type." };
    }

    if (questionType === "text" && options.length > 0) {
      return { error: "Text questions cannot have answer options." };
    }

    if (
      questionType !== "text" &&
      (options.length < 2 || options.some((option) => !option))
    ) {
      return {
        error: "Choice questions need at least two non-empty options.",
      };
    }

    cleanedQuestions.push({
      question_text: questionText,
      question_type: questionType as QuestionInput["question_type"],
      is_required: question.is_required !== false,
      options,
    });
  }

  const startsAt =
    typeof body.starts_at === "string" && body.starts_at
      ? body.starts_at
      : null;

  const endsAt =
    typeof body.ends_at === "string" && body.ends_at
      ? body.ends_at
      : null;

  if (startsAt && Number.isNaN(Date.parse(startsAt))) {
    return { error: "Invalid start date." };
  }

  if (endsAt && Number.isNaN(Date.parse(endsAt))) {
    return { error: "Invalid closing date." };
  }

  if (
    startsAt &&
    endsAt &&
    new Date(endsAt).getTime() <= new Date(startsAt).getTime()
  ) {
    return { error: "Closing date must be after the start date." };
  }

  return {
    data: {
      title,
      description,
      content_type: contentType as "poll" | "survey",
      starts_at: startsAt,
      ends_at: endsAt,
      questions: cleanedQuestions,
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
      .from("engagement_polls")
      .select(`
        id,
        title,
        description,
        content_type,
        status,
        starts_at,
        ends_at,
        created_at,
        updated_at,
        engagement_questions (
          id,
          question_text,
          question_type,
          is_required,
          position,
          engagement_options (
            id,
            option_text,
            position
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Poll loading error:", error);
      return NextResponse.json(
        { error: "Unable to load polls and surveys." },
        { status: 500 }
      );
    }

    return NextResponse.json({ polls: data || [] });
  } catch (error) {
    console.error("Admin polls GET error:", error);
    return NextResponse.json(
      { error: "Unexpected server error." },
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
    const validation = validatePoll(body);

    if ("error" in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: poll, error: pollError } = await adminSupabase
      .from("engagement_polls")
      .insert({
        title: validation.data.title,
        description: validation.data.description,
        content_type: validation.data.content_type,
        starts_at: validation.data.starts_at,
        ends_at: validation.data.ends_at,
        status: "draft",
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (pollError || !poll) {
      console.error("Poll creation error:", pollError);
      return NextResponse.json(
        { error: "Unable to create poll or survey." },
        { status: 500 }
      );
    }

    for (let index = 0; index < validation.data.questions.length; index++) {
      const question = validation.data.questions[index];

      const { data: savedQuestion, error: questionError } =
        await adminSupabase
          .from("engagement_questions")
          .insert({
            poll_id: poll.id,
            question_text: question.question_text,
            question_type: question.question_type,
            is_required: question.is_required,
            position: index,
          })
          .select()
          .single();

      if (questionError || !savedQuestion) {
        console.error("Question creation error:", questionError);
        await adminSupabase
          .from("engagement_polls")
          .delete()
          .eq("id", poll.id);

        return NextResponse.json(
          { error: "Unable to save survey questions." },
          { status: 500 }
        );
      }

      if (question.options && question.options.length > 0) {
        const optionRows = question.options.map((option, optionIndex) => ({
          question_id: savedQuestion.id,
          option_text: option,
          position: optionIndex,
        }));

        const { error: optionsError } = await adminSupabase
          .from("engagement_options")
          .insert(optionRows);

        if (optionsError) {
          console.error("Poll options creation error:", optionsError);
          await adminSupabase
            .from("engagement_polls")
            .delete()
            .eq("id", poll.id);

          return NextResponse.json(
            { error: "Unable to save answer options." },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ poll }, { status: 201 });
  } catch (error) {
    console.error("Admin polls POST error:", error);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
