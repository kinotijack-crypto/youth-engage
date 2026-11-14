"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ShareJourneyPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [link, setLink] = useState("");
  const [type, setType] = useState("journey");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);
    }
    checkUser();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 2MB limit
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be less than 2MB");
      return;
    }

    // Only images
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed");
      return;
    }

    setError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setLoading(true);

    let imageUrl = null;

    // Upload image if selected
    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("mentorship")
        .upload(fileName, imageFile);

      if (uploadError) {
        setError("Image upload failed: " + uploadError.message);
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("mentorship")
        .getPublicUrl(fileName);

      imageUrl = urlData.publicUrl;
    }

    const { error: insertError } = await supabase.from("mentorship_content").insert({
      user_id: user.id,
      title: title.trim(),
      content: content.trim() || null,
      link: link.trim() || null,
      type,
      image_url: imageUrl,
      is_approved: false, // Requires admin approval
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    alert("Shared successfully! Your post will appear after admin approval.");
    router.push("/mentorship");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/mentorship" className="text-purple-600 text-sm font-medium hover:underline">
          ← Back to Mentorship
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mt-3 mb-2">Share Your Journey</h1>
        <p className="text-gray-600 mb-8">
          Share your story or a helpful resource. Posts are reviewed before appearing publicly.
        </p>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg p-6 md:p-8 space-y-5">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 outline-none bg-white"
            >
              <option value="journey">My Journey / Story</option>
              <option value="resource">Helpful Resource / Link</option>
              <option value="story">Mentorship Story</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder="e.g. How I started freelancing with zero experience"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add a Picture (Optional, max 2MB)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
            {imagePreview && (
              <div className="mt-3">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full max-h-64 object-cover rounded-xl"
                />
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Story / Description</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              placeholder="Share your experience, lessons learned, or details about the resource..."
            />
          </div>

          {/* Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Useful Link (Optional)
            </label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder="https://..."
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-full font-medium hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-60"
          >
            {loading ? "Sharing..." : "Share Now"}
          </button>
        </form>
      </div>
    </div>
  );
}