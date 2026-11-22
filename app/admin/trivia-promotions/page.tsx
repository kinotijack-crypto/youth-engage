
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Promotion = {
  id: string;
  title: string;
  description: string | null;
  media_type: "poster" | "video";
  media_url: string;
  sponsor_name: string | null;
  sponsor_logo_url: string | null;
  link_url: string | null;
  is_active: boolean;
  display_order: number;
};

const emptyForm = {
  title: "",
  description: "",
  media_type: "poster" as "poster" | "video",
  video_url: "",
  sponsor_name: "",
  link_url: "",
  display_order: "0",
  is_active: true,
};

export default function TriviaPromotionsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  async function loadPromotions() {
    const { data, error } = await supabase
      .from("trivia_promotions")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      alert("Unable to load promotions: " + error.message);
      return;
    }

    setPromotions(data || []);
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
      await loadPromotions();
      setLoading(false);
    }

    void checkAccess();
  }, [router]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setPosterFile(null);
    setLogoFile(null);
  }

  function handleEdit(item: Promotion) {
    setEditingId(item.id);

    setForm({
      title: item.title,
      description: item.description || "",
      media_type: item.media_type,
      video_url: item.media_type === "video" ? item.media_url : "",
      sponsor_name: item.sponsor_name || "",
      link_url: item.link_url || "",
      display_order: String(item.display_order),
      is_active: item.is_active,
    });

    setPosterFile(null);
    setLogoFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadFile(file: File, prefix: string) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${extension}`;

    const { error } = await supabase.storage
      .from("trivia-promotions")
      .upload(fileName, file);

    if (error) {
      throw new Error("File upload failed: " + error.message);
    }

    const { data } = supabase.storage
      .from("trivia-promotions")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!form.title.trim()) {
      alert("Please enter a promotion title.");
      return;
    }

    if (form.media_type === "poster" && !posterFile && !editingId) {
      alert("Please select a poster image.");
      return;
    }

    if (form.media_type === "video" && !form.video_url.trim()) {
      alert("Please enter a YouTube video URL.");
      return;
    }

    if (
      posterFile &&
      (!posterFile.type.startsWith("image/") ||
        posterFile.size > 5 * 1024 * 1024)
    ) {
      alert("Poster must be an image no larger than 5 MB.");
      return;
    }

    if (
      logoFile &&
      (!logoFile.type.startsWith("image/") ||
        logoFile.size > 2 * 1024 * 1024)
    ) {
      alert("Sponsor logo must be an image no larger than 2 MB.");
      return;
    }

    setSaving(true);

    try {
      const existing = promotions.find((item) => item.id === editingId);

      let mediaUrl =
        form.media_type === "video"
          ? form.video_url.trim()
          : existing?.media_type === "poster"
            ? existing.media_url
            : "";

      let sponsorLogoUrl = existing?.sponsor_logo_url || null;

      if (posterFile && form.media_type === "poster") {
        mediaUrl = await uploadFile(posterFile, "poster");
      }

      if (logoFile) {
        sponsorLogoUrl = await uploadFile(logoFile, "logo");
      }

      if (!mediaUrl) {
        throw new Error("Please provide the required poster or video.");
      }

      const promotionData = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        media_type: form.media_type,
        media_url: mediaUrl,
        sponsor_name: form.sponsor_name.trim() || null,
        sponsor_logo_url: sponsorLogoUrl,
        link_url: form.link_url.trim() || null,
        display_order: Number(form.display_order) || 0,
        is_active: form.is_active,
      };

      if (editingId) {
        const { error } = await supabase
          .from("trivia_promotions")
          .update(promotionData)
          .eq("id", editingId);

        if (error) throw error;

        alert("Promotion updated successfully.");
      } else {
        const { error } = await supabase
          .from("trivia_promotions")
          .insert(promotionData);

        if (error) throw error;

        alert("Promotion created successfully.");
      }

      resetForm();
      await loadPromotions();
    } catch (error) {
      console.error("Promotion save error:", error);
      alert(error instanceof Error ? error.message : "Unable to save promotion.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: Promotion) {
    const { error } = await supabase
      .from("trivia_promotions")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);

    if (error) {
      alert("Unable to update promotion: " + error.message);
      return;
    }

    await loadPromotions();
  }

  if (loading) {
    return <div className="p-8 text-center">Loading promotions...</div>;
  }

  if (!authorized) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold">Access denied</h1>
        <p className="mt-2 text-gray-600">
          Only administrators and moderators can manage promotions.
        </p>
        <Link href="/" className="mt-4 inline-block text-blue-600 underline">
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
              Trivia Promotions Manager
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage posters, videos and sponsor logos displayed after Trivia.
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
            {editingId ? "Edit Promotion" : "Create Promotion"}
          </h2>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Promotion title *
            </label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              maxLength={150}
              placeholder="e.g. Youth Innovation Summit"
              className="w-full rounded-lg border p-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              placeholder="Describe this promotion..."
              className="w-full rounded-lg border p-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Promotion type *
            </label>
            <select
              value={form.media_type}
              onChange={(e) =>
                setForm({
                  ...form,
                  media_type: e.target.value as "poster" | "video",
                })
              }
              className="w-full rounded-lg border p-3 text-sm"
            >
              <option value="poster">Poster / Image</option>
              <option value="video">YouTube Video</option>
            </select>
          </div>

          {form.media_type === "poster" ? (
            <div>
              <label className="mb-2 block text-sm font-medium">
                Poster image {editingId ? "(optional when editing)" : "*"}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setPosterFile(e.target.files?.[0] || null)
                }
                className="w-full rounded-lg border p-3 text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Maximum image size: 5 MB.
              </p>
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-sm font-medium">
                YouTube video URL *
              </label>
              <input
                type="url"
                value={form.video_url}
                onChange={(e) =>
                  setForm({ ...form, video_url: e.target.value })
                }
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-lg border p-3 text-sm"
              />
            </div>
          )}

          <div className="border-t pt-5">
            <h3 className="mb-4 font-semibold">Sponsor information</h3>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Sponsor / Organisation name
                </label>
                <input
                  value={form.sponsor_name}
                  onChange={(e) =>
                    setForm({ ...form, sponsor_name: e.target.value })
                  }
                  placeholder="Organisation name"
                  className="w-full rounded-lg border p-3 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Sponsor logo (optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border p-3 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Maximum logo size: 2 MB.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Optional destination link
            </label>
            <input
              type="url"
              value={form.link_url}
              onChange={(e) => setForm({ ...form, link_url: e.target.value })}
              placeholder="https://example.com/register"
              className="w-full rounded-lg border p-3 text-sm"
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
              className="w-full rounded-lg border p-3 text-sm"
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
            Active — display this promotion publicly
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Create Promotion"}
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
            <h2 className="text-lg font-semibold">Existing Promotions</h2>
            <span className="text-sm text-gray-500">
              {promotions.length} total
            </span>
          </div>

          {promotions.length === 0 ? (
            <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
              No promotions created yet.
            </div>
          ) : (
            promotions.map((item) => (
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
                        {item.media_type} · Order: {item.display_order}
                      </span>
                    </div>

                    <p className="font-semibold text-gray-900">{item.title}</p>

                    {item.description && (
                      <p className="mt-1 text-sm text-gray-600">
                        {item.description}
                      </p>
                    )}

                    {item.sponsor_name && (
                      <p className="mt-2 text-sm text-purple-700">
                        Sponsor: {item.sponsor_name}
                      </p>
                    )}

                    {item.sponsor_logo_url && (
                      <img
                        src={item.sponsor_logo_url}
                        alt={`${item.sponsor_name || "Sponsor"} logo`}
                        className="mt-2 h-12 max-w-40 object-contain"
                      />
                    )}

                    {item.media_type === "poster" && (
                      <img
                        src={item.media_url}
                        alt={item.title}
                        className="mt-3 max-h-48 rounded-lg object-contain"
                      />
                    )}

                    {item.media_type === "video" && (
                      <p className="mt-2 break-all text-sm text-blue-600">
                        {item.media_url}
                      </p>
                    )}

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
                    onClick={() => void toggleActive(item)}
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
