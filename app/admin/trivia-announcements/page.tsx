
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TriviaAnnouncement = {
  id: string;
  message: string;
  link_url: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
};

export default function TriviaAnnouncementsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [announcements, setAnnouncements] = useState<TriviaAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const checkAccess = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin, role")
        .eq("id", user.id)
        .single();

      if (
        profileError ||
        (!profile?.is_admin &&
          !["admin", "moderator"].includes(profile?.role || ""))
      ) {
        router.replace("/");
        return;
      }

      await loadAnnouncements();
    };

    checkAccess();
  }, [router]);

  const loadAnnouncements = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("trivia_announcements")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setAnnouncements(data || []);
    }

    setLoading(false);
  };

  const resetForm = () => {
    setMessage("");
    setLinkUrl("");
    setDisplayOrder("0");
    setIsActive(true);
    setEditingId(null);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!message.trim()) {
      setError("Please enter an announcement message.");
      return;
    }

    if (linkUrl.trim()) {
      try {
        const parsedUrl = new URL(linkUrl.trim());
        if (!["http:", "https:"].includes(parsedUrl.protocol)) {
          throw new Error("Invalid protocol");
        }
      } catch {
        setError("Please enter a valid link starting with https:// or http://.");
        return;
      }
    }

    setSaving(true);
    setError("");

    const payload = {
      message: message.trim(),
      link_url: linkUrl.trim() || null,
      display_order: Number(displayOrder) || 0,
      is_active: isActive,
    };

    const result = editingId
      ? await supabase
          .from("trivia_announcements")
          .update(payload)
          .eq("id", editingId)
      : await supabase
          .from("trivia_announcements")
          .insert(payload);

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    resetForm();
    await loadAnnouncements();
    setSaving(false);
  };

  const handleEdit = (announcement: TriviaAnnouncement) => {
    setEditingId(announcement.id);
    setMessage(announcement.message);
    setLinkUrl(announcement.link_url || "");
    setDisplayOrder(String(announcement.display_order));
    setIsActive(announcement.is_active);
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleActive = async (announcement: TriviaAnnouncement) => {
    const { error } = await supabase
      .from("trivia_announcements")
      .update({ is_active: !announcement.is_active })
      .eq("id", announcement.id);

    if (error) {
      setError(error.message);
      return;
    }

    await loadAnnouncements();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Trivia Announcements</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage announcements displayed in the Trivia section.
          </p>
        </div>

        <Link
          href="/admin"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to Admin Dashboard
        </Link>
      </div>

      <div className="border rounded-xl p-6 bg-white shadow-sm space-y-4">
        <h2 className="text-xl font-semibold">
          {editingId ? "Edit Announcement" : "Create Announcement"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Announcement Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={300}
              rows={3}
              required
              placeholder="Example: Join our weekly Trivia Challenge and test your knowledge!"
              className="w-full border rounded-lg p-3 text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {message.length}/300 characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Optional Link URL
            </label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full border rounded-lg p-3 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Display Order
            </label>
            <input
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
              className="w-full border rounded-lg p-3 text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Lower numbers appear first.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4"
            />
            Active — display this announcement
          </label>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-700 text-white px-5 py-2.5 rounded-lg hover:bg-blue-800 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Announcement"
                  : "Create Announcement"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="border px-5 py-2.5 rounded-lg"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Existing Announcements ({announcements.length})
        </h2>

        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading announcements...
          </p>
        ) : announcements.length === 0 ? (
          <p className="border rounded-lg p-6 text-center text-muted-foreground">
            No Trivia announcements created yet.
          </p>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="border rounded-xl p-5 bg-white space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    announcement.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {announcement.is_active ? "ACTIVE" : "INACTIVE"}
                </span>

                <span className="text-xs text-muted-foreground">
                  Display order: {announcement.display_order}
                </span>
              </div>

              <p className="font-medium">{announcement.message}</p>

              {announcement.link_url && (
                <p className="text-sm text-blue-600 break-all">
                  {announcement.link_url}
                </p>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => handleEdit(announcement)}
                  className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  Edit
                </button>

                <button
                  onClick={() => toggleActive(announcement)}
                  className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  {announcement.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
