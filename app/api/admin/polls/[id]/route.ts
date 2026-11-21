
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

async function getPollId(context: RouteContext) {
  const { id } = await context.params;
  return id;
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

    const id = await getPollId(context);

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json(
        { error: "Invalid poll ID." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.title === "string") {
      const title = body.title.trim();

      if (!title) {
        return NextResponse.json(
          { error: "Title cannot be empty." },
          { status: 400 }
        );
      }

      updates.title = title;
    }

    if (typeof body.description === "string" || body.description === null) {
      updates.description =
        typeof body.description === "string"
          ? body.description.trim() || null
          : null;
    }

    if (body.status !== undefined) {
      if (!["draft", "published", "closed"].includes(body.status)) {
        return NextResponse.json(
          { error: "Invalid poll status." },
          { status: 400 }
        );
      }

      updates.status = body.status;
    }

    if (body.starts_at !== undefined) {
      if (body.starts_at === null || body.starts_at === "") {
        updates.starts_at = null;
      } else if (
        typeof body.starts_at === "string" &&
        !Number.isNaN(Date.parse(body.starts_at))
      ) {
        updates.starts_at = body.starts_at;
      } else {
        return NextResponse.json(
          { error: "Invalid start date." },
          { status: 400 }
        );
      }
    }

    if (body.ends_at !== undefined) {
      if (body.ends_at === null || body.ends_at === "") {
        updates.ends_at = null;
      } else if (
        typeof body.ends_at === "string" &&
        !Number.isNaN(Date.parse(body.ends_at))
      ) {
        updates.ends_at = body.ends_at;
      } else {
        return NextResponse.json(
          { error: "Invalid closing date." },
          { status: 400 }
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid changes supplied." },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const adminSupabase = createAdminClient();

    const { data: existing, error: existingError } = await adminSupabase
      .from("engagement_polls")
      .select("id, starts_at, ends_at")
      .eq("id", id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: "Poll or survey not found." },
        { status: 404 }
      );
    }

    const startsAt =
      "starts_at" in updates ? updates.starts_at : existing.starts_at;

    const endsAt =
      "ends_at" in updates ? updates.ends_at : existing.ends_at;

    if (
      startsAt &&
      endsAt &&
      new Date(String(endsAt)).getTime() <=
        new Date(String(startsAt)).getTime()
    ) {
      return NextResponse.json(
        { error: "Closing date must be after the start date." },
        { status: 400 }
      );
    }

    const { data, error } = await adminSupabase
      .from("engagement_polls")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Poll update error:", error);
      return NextResponse.json(
        { error: "Unable to update poll or survey." },
        { status: 500 }
      );
    }

    return NextResponse.json({ poll: data });
  } catch (error) {
    console.error("Admin polls PATCH error:", error);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
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

    const id = await getPollId(context);

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json(
        { error: "Invalid poll ID." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { error } = await adminSupabase
      .from("engagement_polls")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Poll deletion error:", error);
      return NextResponse.json(
        { error: "Unable to delete poll or survey." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin polls DELETE error:", error);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
