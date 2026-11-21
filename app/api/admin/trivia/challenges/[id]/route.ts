
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

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET: Load one challenge
export async function GET(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const auth = await verifyAdmin();

    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await params;
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
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Challenge not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ challenge: data });
  } catch (error) {
    console.error("Challenge GET error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

// PATCH: Edit challenge details, questions, or status
export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    const auth = await verifyAdmin();

    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    const { data: existing, error: existingError } = await supabase
  .from("trivia_challenges")
  .select("id, status")
  .eq("id", id)
  .single();

if (existingError || !existing) {
  return NextResponse.json(
    { error: "Challenge not found." },
    { status: 404 }
  );
}

const isStatusOnlyUpdate =
  body.status !== undefined &&
  Object.keys(body).every((key) => key === "status");

if (existing.status !== "draft" && !isStatusOnlyUpdate) {
  return NextResponse.json(
    {
      error:
        "Only draft challenges can be edited. Status changes are still allowed.",
    },
    { status: 400 }
  );
}
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) {
      if (typeof body.title !== "string" || !body.title.trim()) {
        return NextResponse.json(
          { error: "A valid challenge title is required." },
          { status: 400 }
        );
      }
      updates.title = body.title.trim();
    }

    if (body.description !== undefined) {
      updates.description =
        typeof body.description === "string"
          ? body.description.trim() || null
          : null;
    }

    if (body.starts_at !== undefined) {
      updates.starts_at = body.starts_at;
    }

    if (body.ends_at !== undefined) {
      updates.ends_at = body.ends_at;
    }

    if (body.status !== undefined) {
      if (!["draft", "published", "closed"].includes(body.status)) {
        return NextResponse.json(
          { error: "Invalid challenge status." },
          { status: 400 }
        );
      }
      updates.status = body.status;
    }

    const { data: current, error: currentError } = await supabase
      .from("trivia_challenges")
      .select("starts_at, ends_at")
      .eq("id", id)
      .single();

    if (currentError || !current) {
      return NextResponse.json(
        { error: "Unable to load challenge dates." },
        { status: 500 }
      );
    }

    const startsAt =
      updates.starts_at !== undefined
        ? updates.starts_at
        : current.starts_at;

    const endsAt =
      updates.ends_at !== undefined
        ? updates.ends_at
        : current.ends_at;

    if (
      typeof startsAt !== "string" ||
      typeof endsAt !== "string" ||
      !Number.isFinite(Date.parse(startsAt)) ||
      !Number.isFinite(Date.parse(endsAt)) ||
      Date.parse(endsAt) <= Date.parse(startsAt)
    ) {
      return NextResponse.json(
        { error: "The end date must be after the start date." },
        { status: 400 }
      );
    }

    if (body.question_ids !== undefined) {
      if (
        !Array.isArray(body.question_ids) ||
        body.question_ids.length === 0 ||
        body.question_ids.some(
          (questionId: unknown) =>
            !Number.isInteger(questionId) ||
            typeof questionId !== "number" ||
            questionId <= 0
        ) ||
        new Set(body.question_ids).size !== body.question_ids.length
      ) {
        return NextResponse.json(
          { error: "Select at least one unique valid question." },
          { status: 400 }
        );
      }

      const { data: questions, error: questionsError } = await supabase
        .from("trivia_questions")
        .select("id")
        .in("id", body.question_ids)
        .eq("is_active", true);

      if (
        questionsError ||
        questions?.length !== body.question_ids.length
      ) {
        return NextResponse.json(
          { error: "One or more selected questions are unavailable or inactive." },
          { status: 400 }
        );
      }

      const { error: deleteError } = await supabase
        .from("trivia_challenge_questions")
        .delete()
        .eq("challenge_id", id);

      if (deleteError) {
        return NextResponse.json(
          { error: "Unable to update challenge questions." },
          { status: 500 }
        );
      }

      const assignments = body.question_ids.map(
        (questionId: number, index: number) => ({
          challenge_id: id,
          question_id: questionId,
          position: index + 1,
        })
      );

      const { error: insertError } = await supabase
        .from("trivia_challenge_questions")
        .insert(assignments);

      if (insertError) {
        console.error("Question reassignment error:", insertError);
        return NextResponse.json(
          { error: "Unable to save the new question order." },
          { status: 500 }
        );
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("trivia_challenges")
        .update(updates)
        .eq("id", id);

      if (updateError) {
        console.error("Challenge update error:", updateError);
        return NextResponse.json(
          { error: "Unable to update challenge." },
          { status: 500 }
        );
      }
    }

    const { data: updated, error: loadError } = await supabase
      .from("trivia_challenges")
      .select("*")
      .eq("id", id)
      .single();

    if (loadError) {
      return NextResponse.json(
        { error: "Challenge updated, but unable to reload it." },
        { status: 500 }
      );
    }

    return NextResponse.json({ challenge: updated });
  } catch (error) {
    console.error("Challenge PATCH error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

// DELETE: Remove a challenge
export async function DELETE(
  _request: Request,
  { params }: RouteContext
) {
  try {
    const auth = await verifyAdmin();

    if (!auth.user) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { id } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("trivia_challenges")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Challenge deletion error:", error);
      return NextResponse.json(
        { error: "Unable to delete challenge." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Challenge DELETE error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
