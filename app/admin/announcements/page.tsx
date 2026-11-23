
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Announcement = {
  id: string;
  message: string;
  link_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
};

const emptyForm = {
  message: "",
  link_url: "",
  display_order: "0",
  is_active: true,
};

export default function AnnouncementsAdminPage() {
  const router = useRouter();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const supabase = createClient();

  async function loadAnnouncements() {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      alert("Unable to load announcements: " + error.message);
      return;
    }

    setAnnouncements(data || []);
  }

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_admin, role")
        .eq("id", user.id)
        .single();

      if (
        error ||
        !(
          profile?.is_admin === true ||
          profile?.role === "admin" ||
          profile?.role === "moderator"
        )
      ) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      setAuthorized(true);
      await loadAnnouncements();
      setLoading(false);
    }

    checkAccess();
  }, [router]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function handleEdit(item: Announcement) {
    setEditingId(item.id);
    setForm({
      message: item.message,
      link_url: item.link_url || "",
      display_order: String(item.display_order),
      is_active: item.is_active,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.message.trim()) {
      alert("Please enter an announcement message.");
      return;
    }

    setSaving(true);

    try {
      const announcementData = {
        message: form.message.trim(),
        link_url: form.link_url.trim() || null,
        display_order: Number(form.display_order) || 0,
        is_active: form.is_active,
      };

      if (editingId) {
        const { error } = await supabase
          .from("announcements")
          .update(announcementData)
          .eq("id", editingId);

        if (error) throw error;

        alert("Announcement updated successfully.");
      } else {
        const { error } = await supabase
          .from("announcements")
          .insert(announcementData);

        if (error) throw error;

        alert("Announcement created successfully.");
      }

      resetForm();
      await loadAnnouncements();
    } catch (error) {
      console.error("Announcement save error:", error);

      alert(
        error instanceof Error
          ? error.message
          : JSON.stringify(error)
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: Announcement) {
    const { error } = await supabase
      .from("announcements")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);

    if (error) {
      alert("Unable to update announcement: " + error.message);
      return;
    }

    await loadAnnouncements();
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        Loading announcements...
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold">Access denied</h1>
        <p className="mt-2 text-gray-600">
          Only administrators and moderators can manage announcements.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-blue-600 underline"
        >
          Return home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Announcements Manager
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Create and manage website announcements.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-lg border bg-white px-4 py-2 text-sm font-medium hover:bg-gray-100"
          >
            Back to Admin
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-xl border bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold">
            {editingId ? "Edit Announcement" : "Create Announcement"}
          </h2>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Announcement message *
            </label>
            <textarea
              value={form.message}
              onChange={(e) =>
                setForm({ ...form, message: e.target.value })
              }
              rows={3}
              maxLength={300}
              required
              placeholder="Enter your announcement..."
              className="w-full rounded-lg border p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Maximum 300 characters.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Optional link URL
            </label>
            <input
              type="url"
              value={form.link_url}
              onChange={(e) =>
                setForm({ ...form, link_url: e.target.value })
              }
              placeholder="https://example.com"
              className="w-full rounded-lg border p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Display order
            </label>
            <input
              type="number"
              value={form.display_order}
              onChange={(e) =>
                setForm({ ...form, display_order: e.target.value })
              }
              className="w-full rounded-lg border p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Lower numbers appear first.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) =>
                setForm({ ...form, is_active: e.target.checked })
              }
              className="h-4 w-4"
            />
            Active — display this announcement publicly
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Create Announcement"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border px-5 py-2.5 text-sm font-medium hover:bg-gray-100"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Existing Announcements
            </h2>
            <span className="text-sm text-gray-500">
              {announcements.length} total
            </span>
          </div>

          {announcements.length === 0 ? (
            <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
              No announcements created yet.
            </div>
          ) : (
            announcements.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </span>

                      <span className="text-xs text-gray-500">
                        Order: {item.display_order}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap break-words font-medium text-gray-900">
                      {item.message}
                    </p>

                    {item.link_url && (
                      <p className="mt-2 break-all text-sm text-blue-600">
                        {item.link_url}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
                  <button
                    type="button"
                    onClick={() => handleEdit(item)}
                    className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-100"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleActive(item)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium ${
                      item.is_active
                        ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                        : "bg-green-100 text-green-800 hover:bg-green-200"
                    }`}
                  >
                    {item.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
