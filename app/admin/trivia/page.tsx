
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type TriviaQuestion = {
  id: number;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string | null;
  category: string | null;
  difficulty: string | null;
  is_active: boolean;
  created_at: string;
};
type TriviaChallenge = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  status: "draft" | "published" | "closed";
  trivia_challenge_questions?: {
    question_id: number;
    position: number;
    trivia_questions: TriviaQuestion | null;
  }[];
};
const emptyForm = {
  question: "",
  options: ["", "", "", ""],
  correct_answer: 0,
  explanation: "",
  category: "",
  difficulty: "medium",
};
const emptyChallengeForm = {
  title: "",
  description: "",
  starts_at: "",
  ends_at: "",
};

export default function AdminTriviaPage() {
  const router = useRouter();

  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [form, setForm] = useState(emptyForm);
const [challenges, setChallenges] = useState<TriviaChallenge[]>([]);
const [challengesLoading, setChallengesLoading] = useState(false);
const [challengeSaving, setChallengeSaving] = useState(false);
const [editingChallengeId, setEditingChallengeId] = useState<string | null>(null);
const [challengeForm, setChallengeForm] = useState(emptyChallengeForm);
const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/trivia");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load questions.");
      }

      setQuestions(result.questions || []);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to load questions.");
    } finally {
      setLoading(false);
    }
  }, []);
const loadChallenges = useCallback(async () => {
  setChallengesLoading(true);

  try {
    const response = await fetch("/api/admin/trivia/challenges");
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Unable to load challenges.");
    }

    setChallenges(result.challenges || []);
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : "Unable to load weekly challenges."
    );
  } finally {
    setChallengesLoading(false);
  }
}, []);
async function handleChallengeSubmit(
  e: React.FormEvent<HTMLFormElement>
) {
  e.preventDefault();

  if (selectedQuestionIds.length === 0) {
    alert("Please select at least one trivia question.");
    return;
  }

  setChallengeSaving(true);

  try {
    const response = await fetch(
  editingChallengeId
    ? `/api/admin/trivia/challenges/${editingChallengeId}`
    : "/api/admin/trivia/challenges",
  {
    method: editingChallengeId ? "PATCH" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...challengeForm,
      starts_at: new Date(challengeForm.starts_at).toISOString(),
      ends_at: new Date(challengeForm.ends_at).toISOString(),
      question_ids: selectedQuestionIds,
    }),
  }
);

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Unable to create challenge.");
    }

    alert(
  editingChallengeId
    ? "Weekly challenge updated successfully."
    : "Weekly challenge created successfully."
);

setChallengeForm(emptyChallengeForm);
setSelectedQuestionIds([]);
setEditingChallengeId(null);

    await loadChallenges();
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : "Unable to create weekly challenge."
    );
  } finally {
    setChallengeSaving(false);
  }
}
function toggleChallengeQuestion(questionId: number) {
  setSelectedQuestionIds((previous) => {
    if (previous.includes(questionId)) {
      return previous.filter((id) => id !== questionId);
    }

    return [...previous, questionId];
  });
}
function handleEditChallenge(challenge: TriviaChallenge) {
console.log("CHALLENGE SELECTED FOR EDITING:", challenge);
  if (challenge.status !== "draft") {
    alert("Only draft challenges can be edited.");
    return;
  }

  setEditingChallengeId(challenge.id);

  setChallengeForm({
    title: challenge.title,
    description: challenge.description || "",
    starts_at: new Date(challenge.starts_at)
      .toISOString()
      .slice(0, 16),
    ends_at: new Date(challenge.ends_at)
      .toISOString()
      .slice(0, 16),
  });

  setSelectedQuestionIds(
    (challenge.trivia_challenge_questions || [])
      .sort((a, b) => a.position - b.position)
      .map((item) => item.question_id)
  );

  window.scrollTo({ top: 0, behavior: "smooth" });
}
async function updateChallengeStatus(
  challenge: TriviaChallenge,
  status: "draft" | "published" | "closed"
) {
  const confirmed = window.confirm(
    `Are you sure you want to change "${challenge.title}" to ${status}?`
  );

  if (!confirmed) return;

  try {
    const response = await fetch(
      `/api/admin/trivia/challenges/${challenge.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Unable to update challenge.");
    }

    alert(`Challenge ${status} successfully.`);
    await loadChallenges();
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : "Unable to update challenge status."
    );
  }
}
async function deleteDraftChallenge(challenge: TriviaChallenge) {
  if (challenge.status !== "draft") {
    alert("Only draft challenges can be deleted.");
    return;
  }

  const confirmed = window.confirm(
    `Are you sure you want to delete "${challenge.title}"? This action cannot be undone.`
  );

  if (!confirmed) return;

  try {
    const response = await fetch(
      `/api/admin/trivia/challenges/${challenge.id}`,
      {
        method: "DELETE",
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Unable to delete challenge.");
    }

    alert("Draft challenge deleted successfully.");

    if (editingChallengeId === challenge.id) {
      setChallengeForm(emptyChallengeForm);
      setSelectedQuestionIds([]);
      setEditingChallengeId(null);
    }

    await loadChallenges();
  } catch (error) {
    alert(
      error instanceof Error
        ? error.message
        : "Unable to delete draft challenge."
    );
  }
}

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!profile?.is_admin) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
await Promise.all([loadQuestions(), loadChallenges()]);
    }

    checkAdmin();
 }, [router, loadQuestions, loadChallenges]);

  function updateOption(index: number, value: string) {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((option, i) =>
        i === index ? value : option
      ),
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(
        editingId
          ? `/api/admin/trivia/${editingId}`
          : "/api/admin/trivia",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            explanation: form.explanation || null,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to save question.");
      }

      alert(editingId ? "Question updated successfully." : "Question created successfully.");
      resetForm();
      await loadQuestions();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(question: TriviaQuestion) {
    setEditingId(question.id);
    setForm({
      question: question.question,
      options: [...question.options],
      correct_answer: question.correct_answer,
      explanation: question.explanation || "",
      category: question.category || "",
      difficulty: question.difficulty || "medium",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleStatus(question: TriviaQuestion) {
    const response = await fetch(`/api/admin/trivia/${question.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !question.is_active }),
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.error || "Unable to update question status.");
      return;
    }

    await loadQuestions();
  }

  async function deleteQuestion(question: TriviaQuestion) {
    if (!window.confirm(`Delete this question?\n\n${question.question}`)) {
      return;
    }

    const response = await fetch(`/api/admin/trivia/${question.id}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (!response.ok) {
      alert(result.error || "Unable to delete question.");
      return;
    }

    if (editingId === question.id) resetForm();
    await loadQuestions();
  }

  const filteredQuestions = questions.filter((question) => {
    if (filter === "active") return question.is_active;
    if (filter === "inactive") return !question.is_active;
    return true;
  });

  if (loading && !isAdmin) {
    return <div className="p-8 text-center">Loading Trivia Manager...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold">Access restricted</h1>
        <p className="text-muted-foreground mt-2">
          Administrator privileges are required to manage Trivia.
        </p>
        <Link href="/admin" className="text-primary underline mt-4 inline-block">
          Return to Admin Dashboard
        </Link>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm text-primary hover:underline">
            ← Back to Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold mt-3">Trivia Manager</h1>
          <p className="text-muted-foreground mt-1">
            Create, organize and manage Youth Engage trivia questions.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="rounded-lg border px-4 py-2 text-sm">
            Total: <strong>{questions.length}</strong>
          </div>
          <div className="rounded-lg border px-4 py-2 text-sm">
            Active: <strong>{questions.filter((q) => q.is_active).length}</strong>
          </div>
        </div>
      </div>

      <section className="border rounded-xl p-5 md:p-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold">
            {editingId ? "Edit Trivia Question" : "Create New Question"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Add a question with four possible answers and select the correct one.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              Question
            </label>
            <textarea
              required
              rows={3}
              value={form.question}
              onChange={(e) =>
                setForm({ ...form, question: e.target.value })
              }
              placeholder="Enter your trivia question..."
              className="w-full rounded-lg border bg-background p-3 text-sm"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {form.options.map((option, index) => (
              <div key={index}>
                <label className="block text-sm font-medium mb-2">
                  Option {index + 1}
                </label>
                <input
                  required
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Enter answer option ${index + 1}`}
                  className="w-full rounded-lg border bg-background p-3 text-sm"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Correct Answer
            </label>
            <select
              value={form.correct_answer}
              onChange={(e) =>
                setForm({
                  ...form,
                  correct_answer: Number(e.target.value),
                })
              }
              className="w-full md:w-1/2 rounded-lg border bg-background p-3 text-sm"
            >
              {form.options.map((option, index) => (
                <option key={index} value={index}>
                  Option {index + 1}{option ? `: ${option}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Category
              </label>
              <input
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                placeholder="e.g. Technology, Environment, General Knowledge"
                className="w-full rounded-lg border bg-background p-3 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Difficulty
              </label>
              <select
                value={form.difficulty}
                onChange={(e) =>
                  setForm({ ...form, difficulty: e.target.value })
                }
                className="w-full rounded-lg border bg-background p-3 text-sm"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Explanation (optional)
            </label>
            <textarea
              rows={3}
              value={form.explanation}
              onChange={(e) =>
                setForm({ ...form, explanation: e.target.value })
              }
              placeholder="Explain why the selected answer is correct..."
              className="w-full rounded-lg border bg-background p-3 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Question"
                  : "Create Question"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border px-5 py-2.5 text-sm"
              >
                Cancel Editing
              </button>
            )}
          </div>
        </form>
      </section>

<section className="border rounded-xl p-5 md:p-6 space-y-5">
  <div>
    <h2 className="text-xl font-semibold">Weekly Challenges</h2>
    <p className="text-sm text-muted-foreground mt-1">
      Create a weekly trivia challenge and select questions from your question bank.
    </p>
  </div>

  <form onSubmit={handleChallengeSubmit} className="space-y-4">
    <div>
      <label className="block text-sm font-medium mb-2">
        Challenge Title
      </label>
      <input
        required
        value={challengeForm.title}
        onChange={(e) =>
          setChallengeForm({ ...challengeForm, title: e.target.value })
        }
        placeholder="e.g. Youth Engage Weekly Challenge"
        className="w-full rounded-lg border bg-background p-3 text-sm"
      />
    </div>

    <div>
      <label className="block text-sm font-medium mb-2">
        Description
      </label>
      <textarea
        rows={3}
        value={challengeForm.description}
        onChange={(e) =>
          setChallengeForm({ ...challengeForm, description: e.target.value })
        }
        placeholder="Describe this week's challenge..."
        className="w-full rounded-lg border bg-background p-3 text-sm"
      />
    </div>

    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Start Date and Time
        </label>
        <input
          required
          type="datetime-local"
          value={challengeForm.starts_at}
          onChange={(e) =>
            setChallengeForm({ ...challengeForm, starts_at: e.target.value })
          }
          className="w-full rounded-lg border bg-background p-3 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          End Date and Time
        </label>
        <input
          required
          type="datetime-local"
          value={challengeForm.ends_at}
          onChange={(e) =>
            setChallengeForm({ ...challengeForm, ends_at: e.target.value })
          }
          className="w-full rounded-lg border bg-background p-3 text-sm"
        />
      </div>
    </div>

    <div className="space-y-3">
      <div>
        <h3 className="font-semibold">Select Trivia Questions</h3>
        <p className="text-sm text-muted-foreground">
          Select active questions. Their selection order determines the playing order.
        </p>
        <p className="text-sm font-medium mt-1">
          Selected: {selectedQuestionIds.length}
        </p>
      </div>

      {questions.filter((question) => question.is_active).length === 0 ? (
        <p className="text-sm text-muted-foreground border rounded-lg p-4">
          No active questions available. Add or activate questions in the Question Bank first.
        </p>
      ) : (
        <div className="max-h-80 overflow-y-auto space-y-2 border rounded-lg p-3">
          {questions
            .filter((question) => question.is_active)
            .map((question) => {
              const selectedIndex = selectedQuestionIds.indexOf(question.id);

              return (
                <label
                  key={question.id}
                  className="flex items-start gap-3 rounded-lg p-3 hover:bg-muted cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIndex !== -1}
                    onChange={() => toggleChallengeQuestion(question.id)}
                    className="mt-1"
                  />

                  <span className="text-sm">
                    {selectedIndex !== -1 && (
                      <strong className="mr-2 text-primary">
                        {selectedIndex + 1}.
                      </strong>
                    )}
                    {question.question}
                  </span>
                </label>
              );
            })}
        </div>
      )}
    </div>

    <button
      type="submit"
      disabled={challengeSaving || selectedQuestionIds.length === 0}
      className="rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium disabled:opacity-50"
    >
      {challengeSaving
  ? "Saving..."
  : editingChallengeId
    ? "Update Weekly Challenge"
    : "Create Weekly Challenge"}
       </button>

    {editingChallengeId && (
      <button
        type="button"
        onClick={() => {
          setChallengeForm(emptyChallengeForm);
          setSelectedQuestionIds([]);
          setEditingChallengeId(null);
        }}
        className="rounded-lg border px-5 py-2.5 text-sm"
      >
        Cancel Editing
      </button>
    )}
  </form>
</section>
      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold">Manage Weekly Challenges</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review, publish and close your weekly trivia challenges.
          </p>
        </div>

        {challengesLoading ? (
          <p className="text-center py-6 text-muted-foreground">
            Loading challenges...
          </p>
        ) : challenges.length === 0 ? (
          <div className="border rounded-xl p-8 text-center text-muted-foreground">
            No weekly challenges created yet.
          </div>
        ) : (
          <div className="space-y-3">
            {challenges.map((challenge) => (
              <article
                key={challenge.id}
                className="border rounded-xl p-4 md:p-5 space-y-3"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{challenge.title}</h3>
                    {challenge.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {challenge.description}
                      </p>
                    )}
                  </div>

                  <span className="text-xs border rounded-full px-3 py-1 capitalize h-fit">
                    {challenge.status}
                  </span>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    Starts: {new Date(challenge.starts_at).toLocaleString()}
                  </p>
                  <p>
                    Ends: {new Date(challenge.ends_at).toLocaleString()}
                  </p>
                  <p>
                    Questions: {challenge.trivia_challenge_questions?.length || 0}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                 {challenge.status === "draft" && (
  <>
    <button
      type="button"
      onClick={() => handleEditChallenge(challenge)}
      className="rounded-lg border px-3 py-2 text-sm"
    >
      Edit Draft
    </button>
    <button
      type="button"
      onClick={() => updateChallengeStatus(challenge, "published")}
      className="rounded-lg bg-green-600 text-white px-3 py-2 text-sm"
    >
      Publish Challenge
    </button>

    <button
      type="button"
      onClick={() => deleteDraftChallenge(challenge)}
      className="rounded-lg border border-red-500 text-red-600 px-3 py-2 text-sm"
    >
      Delete Draft
    </button>
  </>
)}

                  {challenge.status === "published" && (
                    <button
                      type="button"
                      onClick={() => updateChallengeStatus(challenge, "closed")}
                      className="rounded-lg border px-3 py-2 text-sm"
                    >
                      Close Challenge
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>      
<section className="space-y-5">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold">Question Bank</h2>
            <p className="text-sm text-muted-foreground">
              Manage the questions available to players.
            </p>
          </div>

          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as "all" | "active" | "inactive")
            }
            className="rounded-lg border bg-background p-2.5 text-sm"
          >
            <option value="all">All Questions</option>
            <option value="active">Active Questions</option>
            <option value="inactive">Inactive Questions</option>
          </select>
        </div>

        {loading ? (
          <p className="text-center py-8 text-muted-foreground">
            Loading questions...
          </p>
        ) : filteredQuestions.length === 0 ? (
          <div className="border rounded-xl p-10 text-center text-muted-foreground">
            No questions found. Create your first trivia question above.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQuestions.map((question) => (
              <article
                key={question.id}
                className="border rounded-xl p-4 md:p-5 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{question.question}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs border rounded-full px-2.5 py-1">
                        {question.category || "Uncategorized"}
                      </span>
                      <span className="text-xs border rounded-full px-2.5 py-1 capitalize">
                        {question.difficulty || "medium"}
                      </span>
                      <span
                        className={`text-xs rounded-full px-2.5 py-1 ${
                          question.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {question.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  {question.options.map((option, index) => (
                    <div
                      key={index}
                      className={`rounded-lg p-2.5 border ${
                        index === question.correct_answer
                          ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                          : "border-border"
                      }`}
                    >
                      <span className="font-medium mr-2">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      {option}
                      {index === question.correct_answer && (
                        <span className="text-green-700 dark:text-green-400 ml-2 text-xs font-semibold">
                          Correct
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {question.explanation && (
                  <p className="text-sm text-muted-foreground">
                    <strong>Explanation:</strong> {question.explanation}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(question)}
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleStatus(question)}
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                  >
                    {question.is_active ? "Deactivate" : "Activate"}
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteQuestion(question)}
                    className="rounded-lg border border-red-300 text-red-600 px-3 py-2 text-sm hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
