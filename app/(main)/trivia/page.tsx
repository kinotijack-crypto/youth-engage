"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type TriviaQuestion = {
  id: number;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
  category: string;
};

export default function TriviaPage() {
  const supabase = createClient();

  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadQuestions() {
      const { data } = await supabase
        .from("trivia_questions")
        .select("*")
        .eq("is_active", true)
        .limit(10);

      if (data && data.length > 0) {
        // Shuffle questions
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setQuestions(shuffled);
      }

      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    }

    loadQuestions();
  }, []);

  const question = questions[currentQuestion];

  const handleOptionClick = (index: number) => {
    if (showResult) return;
    setSelectedOption(index);
  };

  const handleNext = () => {
    if (selectedOption === null) return;

    if (selectedOption === question.correct_answer) {
      setScore(score + 1);
    }
    setShowResult(true);
  };

  const handleContinue = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      // Quiz finished - save score if user is logged in
      if (user) {
        await supabase.from("trivia_attempts").insert({
          user_id: user.id,
          score: score + (selectedOption === question.correct_answer ? 1 : 0),
          total_questions: questions.length,
        });

        // Give points (2 points per correct answer)
        const finalScore = score + (selectedOption === question.correct_answer ? 1 : 0);
        const { data: profile } = await supabase
          .from("profiles")
          .select("points")
          .eq("id", user.id)
          .single();

        await supabase
          .from("profiles")
          .update({ points: (profile?.points || 0) + finalScore * 2 })
          .eq("id", user.id);
      }
      setQuizFinished(true);
    }
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setSelectedOption(null);
    setShowResult(false);
    setScore(0);
    setQuizFinished(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <p className="text-gray-600">Loading trivia...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <p className="text-gray-600">No trivia questions available yet.</p>
      </div>
    );
  }

  if (quizFinished) {
    const finalScore = score;
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
        <div className="max-w-xl mx-auto bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Quiz Completed!</h2>
          <p className="text-xl text-gray-600 mb-2">
            You scored <span className="font-bold text-purple-600">{finalScore}</span> out of{" "}
            {questions.length}
          </p>
          {user && (
            <p className="text-green-600 font-medium mb-6">
              +{finalScore * 2} points added to your account!
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={restartQuiz}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-full font-medium hover:from-blue-700 hover:to-purple-700 transition"
            >
              Play Again
            </button>
            <Link
              href="/"
              className="border border-gray-300 px-8 py-3 rounded-full font-medium hover:bg-gray-50 transition"
            >
              Back to Home
            </Link>
          </div>

          {!user && (
            <p className="mt-8 text-sm text-gray-500">
              <Link href="/login" className="text-purple-600 font-medium">
                Log in
              </Link>{" "}
              to save your scores and earn points!
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Daily Trivia</h1>
          <div className="text-sm font-medium text-purple-600">
            Question {currentQuestion + 1} of {questions.length}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8">
          <div
            className="bg-gradient-to-r from-blue-600 to-purple-600 h-2.5 rounded-full transition-all"
            style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
          ></div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8 mb-6">
          <div className="text-sm font-medium text-purple-600 mb-3">
            {question.category}
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">
            {question.question}
          </h2>

          <div className="space-y-3">
            {question.options.map((option, index) => {
              let optionClass = "w-full text-left p-4 rounded-2xl border-2 transition font-medium ";

              if (showResult) {
                if (index === question.correct_answer) {
                  optionClass += "border-green-500 bg-green-50 text-green-800";
                } else if (index === selectedOption) {
                  optionClass += "border-red-500 bg-red-50 text-red-800";
                } else {
                  optionClass += "border-gray-200 text-gray-500";
                }
              } else {
                optionClass +=
                  selectedOption === index
                    ? "border-purple-600 bg-purple-50 text-purple-800"
                    : "border-gray-200 hover:border-purple-300 hover:bg-purple-50";
              }

              return (
                <button
                  key={index}
                  onClick={() => handleOptionClick(index)}
                  className={optionClass}
                  disabled={showResult}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {showResult && (
            <div className="mt-6 p-4 bg-blue-50 rounded-2xl text-blue-900 text-sm">
              <strong>Explanation:</strong> {question.explanation}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          {!showResult ? (
            <button
              onClick={handleNext}
              disabled={selectedOption === null}
              className={`px-8 py-3 rounded-full font-medium transition ${
                selectedOption === null
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
              }`}
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={handleContinue}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-full font-medium hover:from-blue-700 hover:to-purple-700 transition"
            >
              {currentQuestion < questions.length - 1 ? "Next Question" : "See Results"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}