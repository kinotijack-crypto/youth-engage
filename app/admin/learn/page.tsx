"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Course = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  duration_minutes: number | null;
  points_reward: number | null;
  icon: string | null;
  is_published: boolean;
};

type Lesson = {
  id: string;
  course_id: string;
  title: string;
  content: string;
  quiz_question: string;
  quiz_options: string[];
  correct_option_index: number;
};

const emptyForm = {
  slug: "",
  title: "",
  description: "",
  category: "",
  duration_minutes: "5",
  points_reward: "10",
  icon: "📚",
  is_published: false,
  lesson_title: "",
  content: "",
  quiz_question: "",
  option1: "",
  option2: "",
  option3: "",
  option4: "",
  correct_option_index: "0",
};

export default function AdminLearnPage() {
  const router = useRouter();
  const supabase = createClient();

  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadCourses = useCallback(async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Unable to load courses: " + error.message);
      return;
    }

    setCourses((data || []) as Course[]);
  }, [supabase]);

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin, role")
        .eq("id", user.id)
        .single();

      const allowed =
        profile?.is_admin === true ||
        profile?.role === "admin" ||
        profile?.role === "moderator";

      if (!allowed) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await loadCourses();
      setLoading(false);
    }

    checkAdmin();
  }, [router, supabase, loadCourses]);

  function updateField(
    field: keyof typeof emptyForm,
    value: string | boolean
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setEditingLessonId(null);
  }

  async function handleEdit(course: Course) {
    const { data: lessons, error } = await supabase
      .from("course_lessons")
      .select("*")
      .eq("course_id", course.id)
      .order("step_order", { ascending: true })
      .limit(1);

    if (error) {
      alert("Unable to load lesson: " + error.message);
      return;
    }

    const lesson = lessons?.[0] as Lesson | undefined;
    const options = lesson?.quiz_options || [];

    setEditingId(course.id);
    setEditingLessonId(lesson?.id || null);

    setForm({
      slug: course.slug || "",
      title: course.title || "",
      description: course.description || "",
      category: course.category || "",
      duration_minutes: String(course.duration_minutes ?? 5),
      points_reward: String(course.points_reward ?? 10),
      icon: course.icon || "📚",
      is_published: course.is_published,
      lesson_title: lesson?.title || "",
      content: lesson?.content || "",
      quiz_question: lesson?.quiz_question || "",
      option1: options[0] || "",
      option2: options[1] || "",
      option3: options[2] || "",
      option4: options[3] || "",
      correct_option_index: String(
        lesson?.correct_option_index ?? 0
      ),
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (
      !form.title.trim() ||
      !form.slug.trim() ||
      !form.description.trim() ||
      !form.category.trim() ||
      !form.lesson_title.trim() ||
      !form.content.trim() ||
      !form.quiz_question.trim()
    ) {
      alert("Please complete all required fields.");
      return;
    }

    const options = [
      form.option1.trim(),
      form.option2.trim(),
      form.option3.trim(),
      form.option4.trim(),
    ];

    if (options.some((option) => !option)) {
      alert("Please provide all four quiz options.");
      return;
    }

    setSaving(true);

    let courseWasCreated = false;    
try {
      const courseData = {
        slug: form.slug.trim().toLowerCase(),
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        duration_minutes: Number(form.duration_minutes),
        points_reward: Number(form.points_reward),
        icon: form.icon.trim() || "📚",
        is_published: form.is_published,
      };

      let courseId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from("courses")
          .update(courseData)
          .eq("id", editingId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("courses")
          .insert(courseData)
          .select("id")
          .single();

               if (error) throw error;

        courseWasCreated = true;
        courseId = data.id;
      }

      const lessonData = {
        course_id: courseId,
        step_order: 1,
        title: form.lesson_title.trim(),
        content: form.content.trim(),
        quiz_question: form.quiz_question.trim(),
        quiz_options: options,
        correct_option_index: Number(form.correct_option_index),
      };

      if (editingLessonId) {
        const { error } = await supabase
          .from("course_lessons")
          .update(lessonData)
          .eq("id", editingLessonId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("course_lessons")
          .insert(lessonData);

        if (error) throw error;
      }

      alert(
        editingId
          ? "Course updated successfully."
          : "Course created successfully."
      );

      resetForm();
      await loadCourses();
            } catch (error) {
      console.error("Learn course save error:", error);

      const errorMessage =
        error instanceof Error
          ? error.message
          : JSON.stringify(error);

      if (courseWasCreated) {
        alert(
          `The course was created, but a later step failed. Check the course list before trying again.\n\nDetails: ${errorMessage}`
        );
      } else {
        alert(errorMessage || "Unable to save course.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(course: Course) {
    const newStatus = !course.is_published;

    const { error } = await supabase
      .from("courses")
      .update({ is_published: newStatus })
      .eq("id", course.id);

    if (error) {
      alert("Unable to update publication status: " + error.message);
      return;
    }

    alert(newStatus ? "Course published." : "Course unpublished.");
    await loadCourses();
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        Loading Learn Management...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-xl font-bold">Access denied</h1>
        <p className="mt-2 text-muted-foreground">
          You do not have permission to manage Learn content.
        </p>
        <Link href="/" className="text-blue-600 underline mt-4 inline-block">
          Return home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Learn Management</h1>
          <p className="text-muted-foreground mt-2">
            Create, edit and publish learning courses.
          </p>
        </div>

        <Link href="/admin">
          <button className="border rounded-lg px-4 py-2 hover:bg-muted">
            Back to Admin
          </button>
        </Link>
      </div>

      <section className="border rounded-xl p-5 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">
            {editingId ? "Edit Course" : "Create New Course"}
          </h2>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-blue-600 underline"
            >
              Cancel editing
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Course title *
              </label>
              <input
                required
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
                className="w-full border rounded-lg p-2 bg-background"
                placeholder="Introduction to Financial Literacy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Course slug *
              </label>
              <input
                required
                value={form.slug}
                onChange={(e) => updateField("slug", e.target.value)}
                className="w-full border rounded-lg p-2 bg-background"
                placeholder="financial-literacy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Category *
              </label>
              <input
                required
                value={form.category}
                onChange={(e) => updateField("category", e.target.value)}
                className="w-full border rounded-lg p-2 bg-background"
                placeholder="Finance"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Icon (emoji)
              </label>
              <input
                value={form.icon}
                onChange={(e) => updateField("icon", e.target.value)}
                className="w-full border rounded-lg p-2 bg-background"
                placeholder="📚"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                required
                value={form.duration_minutes}
                onChange={(e) =>
                  updateField("duration_minutes", e.target.value)
                }
                className="w-full border rounded-lg p-2 bg-background"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Points reward
              </label>
              <input
                type="number"
                min="0"
                required
                value={form.points_reward}
                onChange={(e) =>
                  updateField("points_reward", e.target.value)
                }
                className="w-full border rounded-lg p-2 bg-background"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Course description *
            </label>
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              className="w-full border rounded-lg p-2 bg-background"
              placeholder="Describe what learners will gain from this course."
            />
          </div>

          <hr />

          <h3 className="text-lg font-semibold">First Lesson</h3>

          <div>
            <label className="block text-sm font-medium mb-1">
              Lesson title *
            </label>
            <input
              required
              value={form.lesson_title}
              onChange={(e) => updateField("lesson_title", e.target.value)}
              className="w-full border rounded-lg p-2 bg-background"
              placeholder="Understanding the basics"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Lesson content *
            </label>
            <textarea
              required
              rows={7}
              value={form.content}
              onChange={(e) => updateField("content", e.target.value)}
              className="w-full border rounded-lg p-2 bg-background"
              placeholder="Write the lesson content here..."
            />
          </div>

          <hr />

          <h3 className="text-lg font-semibold">Lesson Quiz</h3>

          <div>
            <label className="block text-sm font-medium mb-1">
              Quiz question *
            </label>
            <textarea
              required
              rows={2}
              value={form.quiz_question}
              onChange={(e) => updateField("quiz_question", e.target.value)}
              className="w-full border rounded-lg p-2 bg-background"
              placeholder="What is the correct answer?"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((number) => {
              const field = `option${number}` as
                | "option1"
                | "option2"
                | "option3"
                | "option4";

              return (
                <div key={number}>
                  <label className="block text-sm font-medium mb-1">
                    Option {number} *
                  </label>
                  <input
                    required
                    value={form[field]}
                    onChange={(e) => updateField(field, e.target.value)}
                    className="w-full border rounded-lg p-2 bg-background"
                    placeholder={`Answer option ${number}`}
                  />
                </div>
              );
            })}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Correct answer
            </label>
            <select
              value={form.correct_option_index}
              onChange={(e) =>
                updateField("correct_option_index", e.target.value)
              }
              className="w-full border rounded-lg p-2 bg-background"
            >
              <option value="0">Option 1</option>
              <option value="1">Option 2</option>
              <option value="2">Option 3</option>
              <option value="3">Option 4</option>
            </select>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) =>
                updateField("is_published", e.target.checked)
              }
            />
            <span className="text-sm font-medium">
              Publish this course immediately
            </span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white rounded-lg px-6 py-3 font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : editingId
                ? "Update Course"
                : "Create Course"}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Existing Courses ({courses.length})
        </h2>

        {courses.length === 0 ? (
          <p className="text-muted-foreground border rounded-lg p-6">
            No courses have been created yet.
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {courses.map((course) => (
              <div
                key={course.id}
                className="border rounded-xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {course.icon || "📚"} {course.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {course.category}
                    </p>
                  </div>

                  <span
                    className={`text-xs rounded-full px-3 py-1 ${
                      course.is_published
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {course.is_published ? "Published" : "Draft"}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground">
                  {course.description}
                </p>

                <p className="text-xs text-muted-foreground">
                  {course.duration_minutes ?? 0} minutes ·{" "}
                  {course.points_reward ?? 0} points
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(course)}
                    className="border rounded-lg px-4 py-2 text-sm hover:bg-muted"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePublish(course)}
                    className="border rounded-lg px-4 py-2 text-sm hover:bg-muted"
                  >
                    {course.is_published ? "Unpublish" : "Publish"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}