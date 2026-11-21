
import { createHash, randomBytes, randomInt } from "crypto";
import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const GUEST_COOKIE = "ye_trivia_guest";
const SESSION_DURATION = 2 * 60 * 60;

export async function POST() {
  try {
    // Identify the authenticated user, if any.
    const serverSupabase = await createServerSupabase();
    const {
  data: { user },
} = await serverSupabase.auth.getUser();

    // Generate a secure guest token when the visitor is not logged in.
    const guestToken = user ? null : randomBytes(32).toString("hex");

    const guestTokenHash = guestToken
      ? createHash("sha256").update(guestToken).digest("hex")
      : null;

    // Use the server-only admin client for database operations.
    const adminSupabase = createAdminClient();

        // Check whether a published weekly challenge is currently active.
    const now = new Date().toISOString();

    const { data: activeChallenge, error: challengeError } =
      await adminSupabase
        .from("trivia_challenges")
        .select("id, title, description, starts_at, ends_at")
        .eq("status", "published")
        .lte("starts_at", now)
        .gt("ends_at", now)
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (challengeError) {
      console.error("Active challenge loading error:", challengeError);
      return NextResponse.json(
        { error: "Unable to load the weekly challenge." },
        { status: 500 }
      );
    }

    let selectedQuestions;
    let challenge = null;

    if (activeChallenge) {
      // Load the questions in the administrator's chosen order.
      const { data: assignments, error: assignmentsError } =
        await adminSupabase
          .from("trivia_challenge_questions")
          .select("question_id, position")
          .eq("challenge_id", activeChallenge.id)
          .order("position", { ascending: true });

      if (assignmentsError || !assignments || assignments.length === 0) {
        return NextResponse.json(
          { error: "The weekly challenge has no assigned questions." },
          { status: 404 }
        );
      }

      const questionIds = assignments.map((item) => item.question_id);

      const { data: challengeQuestions, error: challengeQuestionsError } =
        await adminSupabase
          .from("trivia_questions")
          .select("id, question, options, category")
          .in("id", questionIds)
          .eq("is_active", true);

      if (
        challengeQuestionsError ||
        !challengeQuestions ||
        challengeQuestions.length !== questionIds.length
      ) {
        return NextResponse.json(
          { error: "Some weekly challenge questions are unavailable." },
          { status: 500 }
        );
      }

      const questionsById = new Map(
        challengeQuestions.map((question) => [question.id, question])
      );

      selectedQuestions = assignments.map(
        (assignment) => questionsById.get(assignment.question_id)!
      );

      challenge = activeChallenge;
    } else {
      // Keep the existing random-question behaviour when no challenge is active.
      const { data: availableQuestions, error: questionsError } =
        await adminSupabase
          .from("trivia_questions")
          .select("id, question, options, category")
          .eq("is_active", true)
          .limit(100);

      if (questionsError) {
        console.error("Trivia question loading error:", questionsError);
        return NextResponse.json(
          { error: "Unable to load trivia questions." },
          { status: 500 }
        );
      }

      if (!availableQuestions || availableQuestions.length === 0) {
        return NextResponse.json(
          { error: "No trivia questions are currently available." },
          { status: 404 }
        );
      }

      const shuffled = [...availableQuestions];

      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      selectedQuestions = shuffled.slice(0, 10);
    }
    // Create the server-controlled quiz session.
    const { data: session, error: sessionError } =
      await adminSupabase
        .from("trivia_sessions")
        .insert({
          user_id: user?.id ?? null,
          guest_token_hash: guestTokenHash,
          question_ids: selectedQuestions.map((q) => q.id),
          challenge_id: challenge?.id ?? null,
          current_index: 0,
          score: 0,
        })
        .select("id")
        .single();

    if (sessionError || !session) {
      console.error("Trivia session creation error:", sessionError);
      return NextResponse.json(
        { error: "Unable to start your quiz." },
        { status: 500 }
      );
    }

    // Return public question data only.
    const response = NextResponse.json({
  sessionId: session.id,
  questions: selectedQuestions,
  challenge,
  isAuthenticated: Boolean(user),
});

    if (guestToken) {
      response.cookies.set(GUEST_COOKIE, guestToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/trivia",
        maxAge: SESSION_DURATION,
      });
    } else {
      response.cookies.delete(GUEST_COOKIE);
    }

    return response;
  } catch (error) {
    console.error("Trivia start API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while starting trivia." },
      { status: 500 }
    );
  }
}
