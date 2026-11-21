"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function PostOpportunityPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Job");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [locationType, setLocationType] = useState("Kenya");
  const [applicationLink, setApplicationLink] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isManager, setIsManager] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser();

           if (!user) {
        setIsManager(false);
        setChecking(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "admin" || profile?.role === "moderator") {
        setIsManager(true);
      } else {
        setIsManager(false);
      }
      setChecking(false);
    }

    checkAccess();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

        const isAdminSubmission = isManager && Boolean(user);

    const { error: insertError } = await supabase.from("opportunities").insert({
      title: title.trim(),
      description: description.trim() || null,
      type,
      category: category.trim() || null,
      location: location.trim() || locationType,
      location_type: locationType,
      application_link: applicationLink.trim() || null,
      deadline: deadline || null,
      created_by: user?.id ?? null,
      status: isAdminSubmission ? "approved" : "pending",
      is_active: isAdminSubmission,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

       alert(
      isAdminSubmission
        ? "Opportunity posted successfully!"
        : "Thank you! Your opportunity has been submitted for admin review."
    );
    setLoading(false);
    router.push("/opportunities");
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Checking permissions...</p>
      </div>
    );
  }

 
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/opportunities" className="text-purple-600 text-sm font-medium hover:underline">
          ← Back to Opportunities
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mt-3 mb-8">Post New Opportunity</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg p-6 md:p-8 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder="e.g. Sales Associate - Nairobi"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              placeholder="Describe the opportunity..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 outline-none bg-white"
              >
                <option value="Job">Job</option>
                <option value="Freelance">Freelance</option>
                <option value="Internship">Internship</option>
                <option value="Scholarship">Scholarship</option>
                <option value="Competition">Competition</option>
                <option value="Volunteer">Volunteer</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location Type *</label>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 outline-none bg-white"
              >
                <option value="Kenya">Kenya</option>
                <option value="International">International</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specific Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder="e.g. Nairobi, Mombasa, Remote, Germany..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder="e.g. Technology, Sales, Writing, Education..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Application Link</label>
            <input
              type="url"
              value={applicationLink}
              onChange={(e) => setApplicationLink(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline (Optional)</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-purple-500 outline-none"
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
            {loading ? "Posting..." : "Post Opportunity"}
          </button>
        </form>
      </div>
    </div>
  );
}