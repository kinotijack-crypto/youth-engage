import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    // 1. Verify the caller is an authenticated Admin
    const serverSupabase = await createServerSupabase();
    const { data: { user: caller } } = await serverSupabase.auth.getUser();

    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: callerProfile } = await serverSupabase
      .from("profiles")
      .select("is_admin")
      .eq("id", caller.id)
      .single();

    if (!callerProfile?.is_admin) {
      return NextResponse.json({ error: "Admin privileges required" }, { status: 403 });
    }

    // 2. Parse new account payload
    const body = await request.json();
    const { email, password, full_name, role, priority_tier, is_admin } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: "Email, password, and full name are required." }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY is missing in .env.local" },
        { status: 500 }
      );
    }

    // 3. Create auth user via Supabase Admin Client
    const adminAuthClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: createdUser, error: createError } = await adminAuthClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError || !createdUser.user) {
      return NextResponse.json({ error: createError?.message || "Failed to create user" }, { status: 400 });
    }

    // 4. Upsert profile with selected rights and priority tier
    const { error: profileError } = await adminAuthClient.from("profiles").upsert({
      id: createdUser.user.id,
      email,
      full_name,
      role: role || (is_admin ? "admin" : "member"),
      priority_tier: priority_tier || "standard",
      is_admin: Boolean(is_admin),
      is_suspended: false,
      points: 0,
      streak_count: 0,
    });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, userId: createdUser.user.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}