"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { awardPointsAndCheckBadges } from "@/lib/gamification";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Award, BookOpen, ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";

interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  duration_minutes: number;
  points_reward: number;
  icon: string;
}

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  content: string;
  quiz_question: string;
  quiz_options: string[];
  correct_option_index: number;
}

export default function LearnPage() {
  const supabase = createClient();
  const [courses, setCourses] = useState<Course[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: progress } = await supabase
          .from("user_course_progress")
          .select("course_id")
          .eq("user_id", user.id);
        if (progress) {
          setCompletedIds(new Set(progress.map((p) => p.course_id)));
        }
      }

      const { data: coursesData } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: true });
      if (coursesData) setCourses(coursesData);
    }
    loadData();
  }, [supabase]);

  async function openCourse(course: Course) {
    const { data: lesson } = await supabase
      .from("course_lessons")
      .select("*")
      .eq("course_id", course.id)
      .single();

    if (lesson) {
      setActiveCourse(course);
      setActiveLesson(lesson);
      setSelectedOption(null);
    } else {
      toast.error("Lesson content coming soon!");
    }
  }

  async function handleQuizSubmit() {
    if (!activeCourse || !activeLesson || selectedOption === null) return;

    if (selectedOption !== activeLesson.correct_option_index) {
      toast.error("Not quite right! Review the lesson above and try again.");
      return;
    }

    if (!userId) {
      toast.success("Correct answer! Log in to save your progress and earn points.");
      setActiveCourse(null);
      return;
    }

    if (completedIds.has(activeCourse.id)) {
      toast.success("You already completed this micro-course!");
      setActiveCourse(null);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase
      .from("user_course_progress")
      .insert({ user_id: userId, course_id: activeCourse.id });

    if (!error) {
      setCompletedIds((prev) => new Set(prev).add(activeCourse.id));
      await awardPointsAndCheckBadges(
        userId,
        activeCourse.points_reward,
        `Completed micro-course: ${activeCourse.title}`
      );
    }
    setSubmitting(false);
    setActiveCourse(null);
  }

  // Extract unique categories for filter pills
  const categories = ["All", ...Array.from(new Set(courses.map((c) => c.category)))];

  // Filter courses based on search query & selected category
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Active Lesson & Quiz View
  if (activeCourse && activeLesson) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
        <Button variant="ghost" onClick={() => setActiveCourse(null)} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Courses
        </Button>

        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{activeCourse.category}</Badge>
              <span className="text-sm font-medium text-emerald-600">
                +{activeCourse.points_reward} Points Reward
              </span>
            </div>
            <CardTitle className="text-2xl pt-2">
              {activeCourse.icon} {activeLesson.title}
            </CardTitle>
            <CardDescription>{activeCourse.title}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="p-5 rounded-xl bg-muted/50 leading-relaxed text-base">
              {activeLesson.content}
            </div>

            <div className="space-y-4 border-t pt-6">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" /> Quick Knowledge Check
              </h3>
              <p className="font-medium">{activeLesson.quiz_question}</p>

              <div className="space-y-2">
                {activeLesson.quiz_options.map((option, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedOption(idx)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedOption === idx
                        ? "border-primary bg-primary/10 font-medium"
                        : "hover:bg-muted"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              onClick={handleQuizSubmit}
              disabled={selectedOption === null || submitting}
              className="w-full"
              size="lg"
            >
              {submitting ? "Checking..." : "Complete Lesson & Claim Points"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Course Catalog View with Search & Filter
  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">YouthEngage Learn 🎓</h1>
        <p className="text-muted-foreground">
          Bite-sized, practical micro-courses designed to build real-world skills and earn points.
        </p>
      </div>

      {/* Search and Category Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search micro-courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Course Grid */}
      {filteredCourses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No micro-courses found matching your search.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map((course) => {
            const isCompleted = completedIds.has(course.id);
            return (
              <Card key={course.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{course.category}</Badge>
                    {isCompleted ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </Badge>
                    ) : (
                      <span className="text-xs font-semibold text-primary">
                        +{course.points_reward} pts
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <span>{course.icon}</span> {course.title}
                  </CardTitle>
                  <CardDescription className="pt-1">{course.description}</CardDescription>
                </CardHeader>

                <CardFooter className="flex items-center justify-between border-t pt-4">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {course.duration_minutes} mins
                  </span>
                  <Button
                    onClick={() => openCourse(course)}
                    variant={isCompleted ? "secondary" : "default"}
                    size="sm"
                    className="gap-1.5"
                  >
                    <BookOpen className="w-4 h-4" />
                    {isCompleted ? "Review Lesson" : "Start Lesson"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}