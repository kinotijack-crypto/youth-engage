
import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function verifyAdmin() {
  const supabase = await createServerSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.is_admin) {
    return { error: "Admin privileges required", status: 403 as const };
  }

  return { user, status: 200 as const };
}

// GET: Load challenges and their assigned questions
export async function GET() {
  try {
    const auth = await verifyAdmin();

    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("trivia_challenges")
      .select(`
        *,
        trivia_challenge_questions (
          id,
          question_id,
          position,
          trivia_questions (
            id,
            question,
            category,
            difficulty,
            is_active
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Challenge loading error:", error);
      return NextResponse.json(
        { error: "Unable to load weekly challenges." },
        { status: 500 }
      );
    }

    return NextResponse.json({ challenges: data || [] });
  } catch (error) {
    console.error("Weekly challenges GET error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

// POST: Create a weekly challenge
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

    const title =
      typeof body.title === "string" ? body.title.trim() : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : null;

    const startsAt =
      typeof body.starts_at === "string" ? body.starts_at : "";

    const endsAt =
      typeof body.ends_at === "string" ? body.ends_at : "";

    const questionIds: number[] = Array.isArray(body.question_ids)
      ? body.question_ids
      : [];

    if (!title) {
      return NextResponse.json(
        { error: "Challenge title is required." },
        { status: 400 }
      );
    }

    if (
      !startsAt ||
      !endsAt ||
      !Number.isFinite(Date.parse(startsAt)) ||
      !Number.isFinite(Date.parse(endsAt)) ||
      Date.parse(endsAt) <= Date.parse(startsAt)
    ) {
      return NextResponse.json(
        { error: "Provide valid start and end dates. The end must be after the start." },
        { status: 400 }
      );
    }

    if (
      questionIds.length === 0 ||
      questionIds.some(
        (id) => !Number.isInteger(id) || id <= 0
      ) ||
      new Set(questionIds).size !== questionIds.length
    ) {
      return NextResponse.json(
        { error: "Select at least one unique valid trivia question." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: questions, error: questionsError } = await supabase
      .from("trivia_questions")
      .select("id")
      .in("id", questionIds)
      .eq("is_active", true);

    if (questionsError || questions?.length !== questionIds.length) {
      return NextResponse.json(
        { error: "One or more selected questions are unavailable or inactive." },
        { status: 400 }
      );
    }

    const { data: challenge, error: challengeError } = await supabase
      .from("trivia_challenges")
      .insert({
        title,
        description,
        starts_at: startsAt,
        ends_at: endsAt,
        created_by: auth.user.id,
        status: "draft",
      })
      .select()
      .single();

    if (challengeError || !challenge) {
      console.error("Challenge creation error:", challengeError);
      return NextResponse.json(
        { error: "Unable to create weekly challenge." },
        { status: 500 }
      );
    }

    const assignments = questionIds.map((questionId, index) => ({
      challenge_id: challenge.id,
      question_id: questionId,
      position: index + 1,
    }));

    const { error: assignmentError } = await supabase
      .from("trivia_challenge_questions")
      .insert(assignments);

    if (assignmentError) {
      console.error("Question assignment error:", assignmentError);

      await supabase
        .from("trivia_challenges")
        .delete()
        .eq("id", challenge.id);

      return NextResponse.json(
        { error: "Challenge created, but assigning questions failed. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { challenge },
      { status: 201 }
    );
  } catch (error) {
    console.error("Weekly challenges POST error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
