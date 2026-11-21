
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const GUEST_COOKIE = "ye_trivia_guest";

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get("origin");

    if (!origin || origin !== new URL(request.url).origin) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { sessionId, questionId, expectedIndex, selectedOption } = body;

    if (
      typeof sessionId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId) ||
      !Number.isInteger(questionId) ||
      questionId <= 0 ||
      !Number.isInteger(expectedIndex) ||
      expectedIndex < 0 ||
      !Number.isInteger(selectedOption) ||
      selectedOption < 0 ||
      selectedOption > 100
    ) {
      return NextResponse.json(
        { error: "Invalid answer submission." },
        { status: 400 }
      );
    }

    const serverSupabase = await createServerSupabase();

        const {
      data: { user },
    } = await serverSupabase.auth.getUser();

    const guestToken = request.cookies.get(GUEST_COOKIE)?.value;

    if (!user && !guestToken) {
      return NextResponse.json(
        { error: "Your quiz session has expired. Please start again." },
        { status: 401 }
      );
    }

    const guestTokenHash = guestToken
      ? createHash("sha256").update(guestToken).digest("hex")
      : null;

    const adminSupabase = createAdminClient();

    const { data, error } = await adminSupabase.rpc(
      "submit_trivia_answer",
      {
        p_session_id: sessionId,
        p_user_id: user?.id ?? null,
        p_guest_token_hash: user ? null : guestTokenHash,
        p_expected_index: expectedIndex,
        p_question_id: questionId,
        p_selected_option: selectedOption,
      }
    );

    if (error) {
      console.error("Trivia answer verification error:", error);

      return NextResponse.json(
        { error: "Answer could not be submitted. Your quiz session may have expired or the question may already have been answered." },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Trivia answer API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred while submitting your answer." },
      { status: 500 }
    );
  }
}
