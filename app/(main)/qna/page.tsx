"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCategories, getQuestions } from "@/lib/qna";
import { Category, Question } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";

export default function QnAPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const cats = await getCategories();
      setCategories(cats);

      const qs = await getQuestions(
        activeCategory === "All" ? undefined : activeCategory
      );
      setQuestions(qs);
      setLoading(false);
    }

    loadData();
  }, [activeCategory]);

  // Filter questions by search
  const filteredQuestions = questions.filter((q) =>
    q.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Community Q&A</h1>
            <p className="text-gray-600 mt-1">
              Ask questions. Share knowledge. Grow together.
            </p>
          </div>

          <Link
            href="/qna/ask"
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full font-medium hover:from-blue-700 hover:to-purple-700 transition text-center"
          >
            Ask a Question
          </Link>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-5 py-3 rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-sm"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          <button
            onClick={() => setActiveCategory("All")}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              activeCategory === "All"
                ? "bg-purple-600 text-white"
                : "bg-white text-gray-700 hover:bg-purple-50 border"
            }`}
          >
            All
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                activeCategory === cat.id
                  ? "bg-purple-600 text-white"
                  : "bg-white text-gray-700 hover:bg-purple-50 border"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-16 text-gray-500">
            Loading questions...
          </div>
        )}

        {/* Questions List */}
        {!loading && (
          <div className="space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                {searchQuery
                  ? "No questions match your search."
                  : "No questions yet. Be the first to ask one!"}
              </div>
            ) : (
              filteredQuestions.map((q) => (
                <Link
                  href={`/qna/${q.id}`}
                  key={q.id}
                  className="block bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {q.category && (
                      <span className="text-xs font-medium bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full">
                        {q.category.name}
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg font-semibold text-gray-900 mb-2 hover:text-purple-700">
                    {q.title}
                  </h2>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{(q as any).answers?.[0]?.count || 0} answers</span>
                    <span>{q.views} views</span>
                    <span>
                      by{" "}
                      {q.is_anonymous
                        ? "Anonymous"
                        : q.profiles?.username ||
                          q.profiles?.full_name ||
                          "User"}
                    </span>
                    <span>{new Date(q.created_at).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}