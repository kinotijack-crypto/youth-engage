"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getCategories } from "@/lib/qna";
import { Category } from "@/types/database.types";

export default function AskQuestionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function init() {
      const cats = await getCategories();
      setCategories(cats);

      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user) {
      setError("You must be logged in to post a question.");
      return;
    }

    if (!title.trim() || !categoryId) {
      setError("Please enter a title and select a category.");
      return;
    }

    setLoading(true);

    try {
      // Check if profile exists (using maybeSingle to avoid errors)
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      // Create profile only if it doesn't exist
      if (!existingProfile) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: user.id,
          full_name: user.user_metadata?.full_name || "Youth User",
          username: user.email?.split("@")[0] || "user",
        });

        if (profileError) {
          console.error("Profile error:", profileError);
          setError("Could not create profile: " + profileError.message);
          setLoading(false);
          return;
        }
      }

      // Insert the question
      const { error: insertError } = await supabase.from("questions").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        category_id: Number(categoryId),
        is_anonymous: isAnonymous,
      });

      if (insertError) {
        console.error("Insert error:", insertError);
        setError(insertError.message);
        setLoading(false);
        return;
      }

     // Add 5 points
const { data: profile } = await supabase
  .from("profiles")
  .select("points")
  .eq("id", user.id)
  .single();

await supabase
  .from("profiles")
  .update({ points: (profile?.points || 0) + 5 })
  .eq("id", user.id);

alert("Question posted successfully! You earned 5 points!");
router.push("/qna");
router.refresh();
    } catch (err: any) {
      console.error("Unexpected error:", err);
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/qna" className="text-purple-600 text-sm font-medium hover:underline">
            ← Back to Q&A
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-3">Ask a Question</h1>
          <p className="text-gray-600 mt-1">
            Get answers from the community and mentors.
          </p>
        </div>

        {!user && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-4 rounded-2xl mb-6">
            You need to be logged in to post a question.{" "}
            <Link href="/login" className="font-medium underline">
              Log in here
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg p-6 md:p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. How can I start freelancing with no experience?"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              maxLength={150}
              required
            />
            <p className="text-xs text-gray-500 mt-1">{title.length}/150</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              required
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details to help others understand your question better..."
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <label htmlFor="anonymous" className="text-sm text-gray-700">
              Post as anonymous
            </label>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !user}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-full font-medium hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-60"
            >
              {loading ? "Posting..." : "Post Question"}
            </button>

            <Link
              href="/qna"
              className="border border-gray-300 px-8 py-3 rounded-full font-medium text-center hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}