
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Content = {
  id: string;
  title: string;
  content: string | null;
  link: string | null;
  type: string;
  image_url: string | null;
  is_approved: boolean;
  created_at: string;
  profiles:
    | {
        full_name: string | null;
        username: string | null;
      }
    | {
        full_name: string | null;
        username: string | null;
      }[]
    | null;
};

export default function AdminMentorshipPage() {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkAdminAndLoad() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin" && profile?.role !== "moderator") {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await loadContents();
    }

    checkAdminAndLoad();
  }, [filter]);

  async function loadContents() {
    setLoading(true);

    let query = supabase
      .from("mentorship_content")
      .select(`
        id,
        title,
        content,
        link,
        type,
        image_url,
        is_approved,
        created_at,
        profiles:profiles(full_name, username)
      `)
      .order("created_at", { ascending: false });

    if (filter === "pending") {
      query = query.eq("is_approved", false);
    } else if (filter === "approved") {
      query = query.eq("is_approved", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error loading mentorship content:", error);
      setContents([]);
    } else {
      setContents((data || []) as unknown as Content[]);
    }

    setLoading(false);
  }

  // Optimistic Approve
  const handleApprove = async (id: string) => {
    setActionLoading(id);

    if (filter === "pending") {
      setContents((prev) => prev.filter((item) => item.id !== id));
    } else {
      setContents((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_approved: true } : item
        )
      );
    }

    const { error } = await supabase
      .from("mentorship_content")
      .update({ is_approved: true })
      .eq("id", id);

    if (error) {
      console.error("Approval error:", error);
      alert("Failed to approve. Please try again.");
      await loadContents();
    }

    setActionLoading(null);
  };

  // Optimistic Delete
  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    setActionLoading(id);

    const previous = [...contents];

    setContents((prev) => prev.filter((item) => item.id !== id));

    const { error } = await supabase
      .from("mentorship_content")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete error:", error);
      alert("Failed to delete. Please try again.");
      setContents(previous);
    }

    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-3xl shadow-lg text-center max-w-md">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-6">
            Only admins and moderators can access this page.
          </p>
          <Link
            href="/"
            className="text-purple-600 font-medium hover:underline"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Mentorship Approval
            </h1>
            <p className="text-gray-600 mt-1">
              Review and approve submitted stories
            </p>
          </div>

          <Link
            href="/mentorship"
            className="text-purple-600 font-medium hover:underline"
          >
            View Public Page →
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setFilter("pending")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition ${
              filter === "pending"
                ? "bg-orange-500 text-white"
                : "bg-white text-gray-700 border hover:bg-orange-50"
            }`}
          >
            Pending
          </button>

          <button
            onClick={() => setFilter("approved")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition ${
              filter === "approved"
                ? "bg-green-600 text-white"
                : "bg-white text-gray-700 border hover:bg-green-50"
            }`}
          >
            Approved
          </button>

          <button
            onClick={() => setFilter("all")}
            className={`px-5 py-2 rounded-full text-sm font-medium transition ${
              filter === "all"
                ? "bg-purple-600 text-white"
                : "bg-white text-gray-700 border hover:bg-purple-50"
            }`}
          >
            All
          </button>
        </div>

        {/* Content List */}
        {contents.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
            <p className="text-gray-500">
              {filter === "pending"
                ? "No pending posts to review."
                : "No posts found."}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {contents.map((item) => {
              const profile = Array.isArray(item.profiles)
                ? item.profiles[0]
                : item.profiles;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border"
                >
                  <div className="md:flex">
                    {item.image_url && (
                      <div className="md:w-64 flex-shrink-0">
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-48 md:h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="p-6 flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            item.type === "journey"
                              ? "bg-green-100 text-green-700"
                              : item.type === "resource"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {item.type}
                        </span>

                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            item.is_approved
                              ? "bg-green-100 text-green-700"
                              : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {item.is_approved ? "Approved" : "Pending"}
                        </span>

                        <span className="text-sm text-gray-500">
                          {new Date(item.created_at).toLocaleString()}
                        </span>
                      </div>

                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {item.title}
                      </h3>

                      {item.content && (
                        <p className="text-gray-600 mb-3 whitespace-pre-line line-clamp-4">
                          {item.content}
                        </p>
                      )}

                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 text-sm hover:underline"
                        >
                          {item.link}
                        </a>
                      )}

                      <div className="mt-3 text-sm text-gray-500">
                        By: {profile?.full_name || profile?.username || "Unknown"}
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-5 flex gap-3">
                        {!item.is_approved && (
                          <button
                            onClick={() => handleApprove(item.id)}
                            disabled={actionLoading === item.id}
                            className="bg-green-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
                          >
                            {actionLoading === item.id
                              ? "Approving..."
                              : "Approve"}
                          </button>
                        )}

                        <button
                          onClick={() => handleReject(item.id)}
                          disabled={actionLoading === item.id}
                          className="bg-red-50 text-red-600 px-5 py-2 rounded-full text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
                        >
                          {actionLoading === item.id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
