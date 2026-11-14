"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Question, Answer } from "@/types/database.types";

export default function QuestionPage() {
  const params = useParams();
  const questionId = params.id as string;
  const supabase = createClient();

  const [question, setQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      if (!questionId) return;

      setLoading(true);
      setError("");

      try {
        // 1. Fetch the question
        const { data: questionData, error: questionError } = await supabase
          .from("questions")
          .select(`
            *,
            category:categories(*),
            profiles:profiles(username, full_name, avatar_url, role)
          `)
          .eq("id", questionId)
          .single();

        if (questionError) {
          console.error("Question error:", questionError);
          setError("Question not found");
          setLoading(false);
          return;
        }

        setQuestion(questionData);

        // 2. Fetch answers
        const { data: answersData } = await supabase
          .from("answers")
          .select(`
            *,
            profiles:profiles(username, full_name, avatar_url, role)
          `)
          .eq("question_id", questionId)
          .order("created_at", { ascending: true });

        setAnswers(answersData || []);

        // 3. Increase view count (don't wait for it)
        supabase
          .from("questions")
          .update({ views: (questionData.views || 0) + 1 })
          .eq("id", questionId)
          .then(() => {});

        // 4. Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (err) {
        console.error(err);
        setError("Something went wrong while loading the question");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [questionId]);

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!user) {
      setError("You must be logged in to post an answer.");
      return;
    }

    if (!answer.trim()) {
      setError("Answer cannot be empty.");
      return;
    }

    setSubmitting(true);

    const { error: insertError } = await supabase.from("answers").insert({
      question_id: questionId,
      user_id: user.id,
      content: answer.trim(),
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    // Reload answers
    const { data: answersData } = await supabase
      .from("answers")
      .select(`
        *,
        profiles:profiles(username, full_name, avatar_url, role)
      `)
      .eq("question_id", questionId)
      .order("created_at", { ascending: true });

    setAnswers(answersData || []);
    setAnswer("");
// Add 3 points for answering
const { data: profile } = await supabase
  .from("profiles")
  .select("points")
  .eq("id", user.id)
  .single();

await supabase
  .from("profiles")
  .update({ points: (profile?.points || 0) + 3 })
  .eq("id", user.id);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <p className="text-gray-600">Loading question...</p>
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">{error || "Question not found."}</p>
          <Link href="/qna" className="text-purple-600 font-medium hover:underline">
            ← Back to Q&A
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/qna"
          className="text-purple-600 text-sm font-medium hover:underline mb-6 inline-block"
        >
          ← Back to Q&A
        </Link>

        {/* Question Card */}
        <div className="bg-white rounded-3xl shadow-md p-6 md:p-8 mb-8">
          <div className="flex items-center gap-2 mb-4">
            {question.category && (
              <span className="text-xs font-medium bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                {question.category.name}
              </span>
            )}
            <span className="text-sm text-gray-500">
              {new Date(question.created_at).toLocaleDateString()}
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            {question.title}
          </h1>

          {question.description && (
            <p className="text-gray-700 leading-relaxed mb-6">
              {question.description}
            </p>
          )}

          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              Posted by{" "}
              <span className="font-medium text-gray-800">
                {question.is_anonymous
                  ? "Anonymous"
                  : question.profiles?.username ||
                    question.profiles?.full_name ||
                    "User"}
              </span>
            </span>
            <span>{question.views} views</span>
          </div>
        </div>

        {/* Answers Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {answers.length} {answers.length === 1 ? "Answer" : "Answers"}
          </h2>

          <div className="space-y-4">
            {answers.length === 0 ? (
              <p className="text-gray-500">No answers yet. Be the first to answer!</p>
            ) : (
              answers.map((ans) => (
                <div
                  key={ans.id}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-medium text-gray-900">
                      {ans.profiles?.username ||
                        ans.profiles?.full_name ||
                        "User"}
                    </span>
                    {ans.is_mentor_answer && (
                      <span className="text-xs font-medium bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full">
                        Mentor
                      </span>
                    )}
                    <span className="text-sm text-gray-500">
                      • {new Date(ans.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-gray-700 leading-relaxed">{ans.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Add Answer Box */}
        <div className="bg-white rounded-3xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Your Answer</h3>

          {!user && (
            <div className="bg-yellow-50 text-yellow-800 p-3 rounded-xl text-sm mb-4">
              You need to{" "}
              <Link href="/login" className="font-medium underline">
                log in
              </Link>{" "}
              to post an answer.
            </div>
          )}

          <form onSubmit={handleSubmitAnswer}>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Write your answer here..."
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none mb-4"
              disabled={!user}
            />

            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm mb-4">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || !user || !answer.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2.5 rounded-full font-medium hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50"
              >
                {submitting ? "Posting..." : "Post Answer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}