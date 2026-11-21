
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type QuestionType = "single_choice" | "multiple_choice" | "text";
type ContentType = "poll" | "survey";
type PollStatus = "draft" | "published" | "closed";

type Option = {
  id: string;
  option_text: string;
  position: number;
};

type PollQuestion = {
  id: string;
  question_text: string;
  question_type: QuestionType;
  is_required: boolean;
  position: number;
  engagement_options: Option[];
};

type Poll = {
  id: string;
  title: string;
  description: string | null;
  content_type: ContentType;
  status: PollStatus;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  engagement_questions: PollQuestion[];
};

type QuestionForm = {
  question_text: string;
  question_type: QuestionType;
  is_required: boolean;
  options: string[];
};

type FormData = {
  title: string;
  description: string;
  content_type: ContentType;
  starts_at: string;
  ends_at: string;
};

function newQuestion(): QuestionForm {
  return {
    question_text: "",
    question_type: "single_choice",
    is_required: true,
    options: ["", ""],
  };
}

function toLocalInput(value: string | null) {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60000)
    .toISOString()
    .slice(0, 16);
}

const emptyForm: FormData = {
  title: "",
  description: "",
  content_type: "poll",
  starts_at: "",
  ends_at: "",
};

export default function AdminPollsPage() {
  const router = useRouter();

  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [form, setForm] = useState<FormData>(emptyForm);
  const [questions, setQuestions] = useState<QuestionForm[]>([
    newQuestion(),
  ]);

  const [filter, setFilter] = useState<"all" | PollStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [detailsForm, setDetailsForm] = useState<FormData>(emptyForm);

  const loadPolls = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/polls");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load polls.");
      }

      setPolls(data.polls || []);
    } catch (error) {
      console.error("Load polls error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Could not load polls."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function checkAdmin() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (!active) return;

      if (error || !profile?.is_admin) {
        router.replace("/");
        return;
      }

      setIsAdmin(true);
      await loadPolls();
    }

    checkAdmin();

    return () => {
      active = false;
    };
  }, [router, loadPolls]);

  function resetForm() {
    setForm(emptyForm);
    setQuestions([newQuestion()]);
    setEditingId(null);
  }

  function updateQuestion(
    index: number,
    field: keyof QuestionForm,
    value: string | boolean
  ) {
    setQuestions((previous) =>
      previous.map((question, i) => {
        if (i !== index) return question;

        if (field === "question_type") {
          const type = value as QuestionType;

          return {
            ...question,
            question_type: type,
            options:
              type === "text"
                ? []
                : question.options.length >= 2
                  ? question.options
                  : ["", ""],
          };
        }

        return { ...question, [field]: value };
      })
    );
  }

  function updateOption(
    questionIndex: number,
    optionIndex: number,
    value: string
  ) {
    setQuestions((previous) =>
      previous.map((question, i) => {
        if (i !== questionIndex) return question;

        return {
          ...question,
          options: question.options.map((option, j) =>
            j === optionIndex ? value : option
          ),
        };
      })
    );
  }

  function addOption(questionIndex: number) {
    setQuestions((previous) =>
      previous.map((question, i) =>
        i === questionIndex
          ? { ...question, options: [...question.options, ""] }
          : question
      )
    );
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    setQuestions((previous) =>
      previous.map((question, i) => {
        if (i !== questionIndex) return question;

        return {
          ...question,
          options: question.options.filter(
            (_, j) => j !== optionIndex
          ),
        };
      })
    );
  }

  function addQuestion() {
    setQuestions((previous) => [...previous, newQuestion()]);
  }

  function removeQuestion(index: number) {
    setQuestions((previous) =>
      previous.filter((_, i) => i !== index)
    );
  }

  function startEditDetails(poll: Poll) {
    setEditingId(poll.id);

    setForm({
      title: poll.title,
      description: poll.description || "",
      content_type: poll.content_type,
      starts_at: toLocalInput(poll.starts_at),
      ends_at: toLocalInput(poll.ends_at),
    });

    setDetailsForm({
      title: poll.title,
      description: poll.description || "",
      content_type: poll.content_type,
      starts_at: toLocalInput(poll.starts_at),
      ends_at: toLocalInput(poll.ends_at),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      alert("Please enter a title.");
      return;
    }

    if (!editingId && questions.length === 0) {
      alert("Please add at least one question.");
      return;
    }

    if (!editingId && form.content_type === "poll" && questions.length !== 1) {
      alert("A poll must contain exactly one question.");
      return;
    }

    if (!editingId) {
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];

        if (!question.question_text.trim()) {
          alert(`Please enter the text for question ${i + 1}.`);
          return;
        }

        if (question.question_type !== "text") {
          const options = question.options
            .map((option) => option.trim())
            .filter(Boolean);

          if (options.length < 2) {
            alert(`Question ${i + 1} needs at least two options.`);
            return;
          }
        }
      }
    }

    if (
      form.starts_at &&
      form.ends_at &&
      new Date(form.ends_at) <= new Date(form.starts_at)
    ) {
      alert("The closing date must be after the starting date.");
      return;
    }

    setSaving(true);

    try {
      let response: Response;

      if (editingId) {
        response = await fetch(`/api/admin/polls/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: detailsForm.title.trim(),
            description: detailsForm.description.trim(),
            starts_at: detailsForm.starts_at
              ? new Date(detailsForm.starts_at).toISOString()
              : null,
            ends_at: detailsForm.ends_at
              ? new Date(detailsForm.ends_at).toISOString()
              : null,
          }),
        });
      } else {
        response = await fetch("/api/admin/polls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            description: form.description.trim(),
            content_type: form.content_type,
            starts_at: form.starts_at
              ? new Date(form.starts_at).toISOString()
              : null,
            ends_at: form.ends_at
              ? new Date(form.ends_at).toISOString()
              : null,
            questions: questions.map((question, index) => ({
              question_text: question.question_text.trim(),
              question_type: question.question_type,
              is_required: question.is_required,
              position: index,
              options:
                question.question_type === "text"
                  ? []
                  : question.options
                      .map((option) => option.trim())
                      .filter(Boolean),
            })),
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "The operation failed.");
      }

      alert(
        editingId
          ? "Poll details updated successfully."
          : "Poll created successfully as a draft."
      );

      resetForm();
      await loadPolls();
    } catch (error) {
      console.error("Save poll error:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Could not save the poll."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(poll: Poll, status: PollStatus) {
    try {
      const response = await fetch(`/api/admin/polls/${poll.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not update status.");
      }

      await loadPolls();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Could not update poll status."
      );
    }
  }

  async function deletePoll(poll: Poll) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${poll.title}"? This will also delete its questions and responses.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/admin/polls/${poll.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not delete poll.");
      }

      alert("Poll deleted successfully.");

      if (expandedId === poll.id) {
        setExpandedId(null);
      }

      await loadPolls();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Could not delete poll."
      );
    }
  }

  const filteredPolls = polls.filter(
    (poll) => filter === "all" || poll.status === filter
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Checking administrator access...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="text-sm text-blue-600 hover:underline"
            >
              ← Back to Admin Dashboard
            </Link>

            <h1 className="text-3xl font-bold mt-3 text-gray-900 dark:text-white">
              Polls & Surveys Manager
            </h1>

            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create and manage community polls and surveys.
            </p>
          </div>

          <button
            onClick={loadPolls}
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Refresh List
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total", value: polls.length },
            {
              label: "Published",
              value: polls.filter((p) => p.status === "published").length,
            },
            {
              label: "Drafts",
              value: polls.filter((p) => p.status === "draft").length,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5"
            >
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <section className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5 md:p-7">
          <div className="flex justify-between items-center gap-3 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingId ? "Edit Poll Details" : "Create New Poll or Survey"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {editingId
                  ? "Update the title, description and schedule."
                  : "New items are saved as drafts until published."}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!editingId && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Content Type
                </label>

                <select
                  value={form.content_type}
                  onChange={(e) => {
                    const type = e.target.value as ContentType;

                    setForm({ ...form, content_type: type });

                    if (type === "poll") {
                      setQuestions((previous) => [previous[0] || newQuestion()]);
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent p-3"
                >
                  <option value="poll">Poll - One question</option>
                  <option value="survey">Survey - Multiple questions</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">
                Title *
              </label>
              <input
                required
                value={editingId ? detailsForm.title : form.title}
                onChange={(e) =>
                  editingId
                    ? setDetailsForm({ ...detailsForm, title: e.target.value })
                    : setForm({ ...form, title: e.target.value })
                }
                placeholder="Enter poll or survey title"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent p-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                rows={3}
                value={editingId ? detailsForm.description : form.description}
                onChange={(e) =>
                  editingId
                    ? setDetailsForm({
                        ...detailsForm,
                        description: e.target.value,
                      })
                    : setForm({ ...form, description: e.target.value })
                }
                placeholder="Describe the purpose of this poll or survey"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent p-3"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Start Date (optional)
                </label>
                <input
                  type="datetime-local"
                  value={editingId ? detailsForm.starts_at : form.starts_at}
                  onChange={(e) =>
                    editingId
                      ? setDetailsForm({
                          ...detailsForm,
                          starts_at: e.target.value,
                        })
                      : setForm({ ...form, starts_at: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent p-3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  End Date (optional)
                </label>
                <input
                  type="datetime-local"
                  value={editingId ? detailsForm.ends_at : form.ends_at}
                  onChange={(e) =>
                    editingId
                      ? setDetailsForm({
                          ...detailsForm,
                          ends_at: e.target.value,
                        })
                      : setForm({ ...form, ends_at: e.target.value })
                  }
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent p-3"
                />
              </div>
            </div>

            {!editingId && (
              <div className="space-y-5 pt-4 border-t dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Questions ({questions.length})
                  </h3>

                  {form.content_type === "survey" && (
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="text-sm rounded-lg bg-blue-600 text-white px-4 py-2 hover:bg-blue-700"
                    >
                      + Add Question
                    </button>
                  )}
                </div>

                {questions.map((question, index) => (
                  <div
                    key={index}
                    className="border dark:border-gray-700 rounded-xl p-4 space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">
                        Question {index + 1}
                      </h4>

                      {form.content_type === "survey" &&
                        questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(index)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                    </div>

                    <input
                      value={question.question_text}
                      onChange={(e) =>
                        updateQuestion(index, "question_text", e.target.value)
                      }
                      placeholder="Enter your question"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent p-3"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Answer Type
                        </label>

                        <select
                          value={question.question_type}
                          onChange={(e) =>
                            updateQuestion(
                              index,
                              "question_type",
                              e.target.value
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent p-3"
                        >
                          <option value="single_choice">Single Choice</option>
                          <option value="multiple_choice">Multiple Choice</option>
                          <option value="text">Text Answer</option>
                        </select>
                      </div>

                      <label className="flex items-center gap-2 text-sm mt-6">
                        <input
                          type="checkbox"
                          checked={question.is_required}
                          onChange={(e) =>
                            updateQuestion(
                              index,
                              "is_required",
                              e.target.checked
                            )
                          }
                        />
                        Required question
                      </label>
                    </div>

                    {question.question_type !== "text" && (
                      <div className="space-y-3">
                        <label className="block text-sm font-medium">
                          Answer Options
                        </label>

                        {question.options.map((option, optionIndex) => (
                          <div
                            key={optionIndex}
                            className="flex gap-2"
                          >
                            <input
                              value={option}
                              onChange={(e) =>
                                updateOption(
                                  index,
                                  optionIndex,
                                  e.target.value
                                )
                              }
                              placeholder={`Option ${optionIndex + 1}`}
                              className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent p-3"
                            />

                            {question.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() =>
                                  removeOption(index, optionIndex)
                                }
                                className="text-red-600 px-3"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => addOption(index)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          + Add Option
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 text-white px-6 py-3 font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Details"
                    : "Save as Draft"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border px-6 py-3 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {editingId ? "Cancel Edit" : "Clear Form"}
              </button>
            </div>
          </form>
        </section>

        <section className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Manage Polls & Surveys
              </h2>
              <p className="text-sm text-gray-500">
                View, publish, close or delete existing items.
              </p>
            </div>

            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value as "all" | PollStatus)
              }
              className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-2"
            >
              <option value="all">All Items</option>
              <option value="draft">Drafts</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">
              Loading polls...
            </div>
          ) : filteredPolls.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-10 text-center">
              <p className="font-medium">No polls or surveys found.</p>
              <p className="text-sm text-gray-500 mt-2">
                Create your first one using the form above.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPolls.map((poll) => (
                <div
                  key={poll.id}
                  className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5 space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {poll.content_type}
                        </span>

                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${
                            poll.status === "published"
                              ? "bg-green-100 text-green-800"
                              : poll.status === "closed"
                                ? "bg-gray-200 text-gray-800"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {poll.status}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {poll.title}
                      </h3>

                      {poll.description && (
                        <p className="text-sm text-gray-500">
                          {poll.description}
                        </p>
                      )}

                      <p className="text-xs text-gray-500">
                        {poll.engagement_questions?.length || 0} question(s)
                        {" · "}
                        Created{" "}
                        {new Date(poll.created_at).toLocaleDateString()}
                      </p>

                      {(poll.starts_at || poll.ends_at) && (
                        <p className="text-xs text-gray-500">
                          {poll.starts_at
                            ? `Starts: ${new Date(poll.starts_at).toLocaleString()}`
                            : "No start date"}
                          {" · "}
                          {poll.ends_at
                            ? `Ends: ${new Date(poll.ends_at).toLocaleString()}`
                            : "No end date"}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() =>
                        setExpandedId(
                          expandedId === poll.id ? null : poll.id
                        )
                      }
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {expandedId === poll.id
                        ? "Hide Questions"
                        : "View Questions"}
                    </button>
                  </div>

                  {expandedId === poll.id && (
                    <div className="border-t dark:border-gray-800 pt-4 space-y-4">
                      {(poll.engagement_questions || []).map(
                        (question, index) => (
                          <div
                            key={question.id}
                            className="rounded-lg bg-gray-50 dark:bg-gray-800 p-4"
                          >
                            <p className="font-medium">
                              {index + 1}. {question.question_text}
                            </p>

                            <p className="text-xs text-gray-500 mt-1">
                              Type: {question.question_type.replace("_", " ")}
                              {" · "}
                              {question.is_required ? "Required" : "Optional"}
                            </p>

                            {question.question_type !== "text" && (
                              <ul className="list-disc pl-6 mt-3 text-sm space-y-1">
                                {(question.engagement_options || []).map(
                                  (option) => (
                                    <li key={option.id}>
                                      {option.option_text}
                                    </li>
                                  )
                                )}
                              </ul>
                            )}

                            {question.question_type === "text" && (
                              <p className="text-sm text-gray-500 mt-2">
                                Participants will provide a written answer.
                              </p>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 border-t dark:border-gray-800 pt-4">
                    <button
                      onClick={() => startEditDetails(poll)}
                      className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Edit Details
                    </button>

                    {poll.status === "draft" && (
                      <button
                        onClick={() => updateStatus(poll, "published")}
                        className="rounded-lg bg-green-600 text-white px-3 py-2 text-sm hover:bg-green-700"
                      >
                        Publish
                      </button>
                    )}

                    {poll.status === "published" && (
                      <button
                        onClick={() => updateStatus(poll, "closed")}
                        className="rounded-lg bg-gray-700 text-white px-3 py-2 text-sm hover:bg-gray-800"
                      >
                        Close
                      </button>
                    )}

                    {poll.status === "closed" && (
                      <button
                        onClick={() => updateStatus(poll, "draft")}
                        className="rounded-lg bg-yellow-600 text-white px-3 py-2 text-sm hover:bg-yellow-700"
                      >
                        Return to Draft
                      </button>
                    )}

                    <button
                      onClick={() => deletePoll(poll)}
                      className="rounded-lg border border-red-300 text-red-600 px-3 py-2 text-sm hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
