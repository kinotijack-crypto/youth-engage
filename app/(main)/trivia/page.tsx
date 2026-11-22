
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import TriviaAnnouncementBar from "@/components/layout/TriviaAnnouncementBar";
import TriviaPromotions from "@/components/trivia/TriviaPromotions";

type TriviaQuestion = {
  id: number;
  question: string;
  options: string[];
  category: string;
};
type TriviaChallenge = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
};

type AnswerFeedback = {
  is_correct: boolean;
  correct_answer: number;
  explanation: string | null;
  finished: boolean;
  score: number;
  next_index: number;
  total_questions: number;
  points_awarded: number;
};

export default function TriviaPage() {
  const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
const [challenge, setChallenge] = useState<TriviaChallenge | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [score, setScore] = useState(0);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submissionLock = useRef(false);

  const startQuiz = useCallback(async () => {
    setLoading(true);
    setError("");
    setQuestions([]);
setChallenge(null);
    setSessionId("");
    setCurrentQuestion(0);
    setSelectedOption(null);
    setFeedback(null);
    setScore(0);
    setPointsAwarded(0);
    setQuizFinished(false);
    setSubmitting(false);
    submissionLock.current = false;

    try {
      const response = await fetch("/api/trivia/start", {
        method: "POST",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to start trivia.");
      }

      setQuestions(data.questions);
setChallenge(data.challenge ?? null);
setSessionId(data.sessionId);
setIsAuthenticated(Boolean(data.isAuthenticated));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load trivia. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void startQuiz();
  }, [startQuiz]);

  const handleOptionClick = async (index: number) => {
    if (
      submissionLock.current ||
      submitting ||
      feedback ||
      !sessionId
    ) {
      return;
    }

    const question = questions[currentQuestion];

    if (!question) return;

    submissionLock.current = true;
    setSubmitting(true);
    setSelectedOption(index);
    setError("");

    try {
      const response = await fetch("/api/trivia/answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          sessionId,
          questionId: question.id,
          expectedIndex: currentQuestion,
          selectedOption: index,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to submit your answer.");
      }

      const answerResult = result as AnswerFeedback;

      setScore(answerResult.score);

      if (answerResult.finished) {
        setPointsAwarded(answerResult.points_awarded);
        setQuizFinished(true);
      } else {
        setCurrentQuestion(answerResult.next_index);
        setSelectedOption(null);
        setFeedback(null);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please restart the quiz."
      );
    } finally {
      setSubmitting(false);
      submissionLock.current = false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <p className="text-gray-600">Loading trivia...</p>
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Unable to load trivia
          </h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={() => void startQuiz()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-full font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (quizFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-amber-50 px-3 py-5">
  <div className="mx-auto max-w-4xl rounded-3xl border border-purple-100 bg-white p-5 text-center shadow-xl sm:p-7">
          <div className="mb-2 text-5xl">👑</div>
<h2 className="mb-1 text-2xl font-extrabold tracking-tight text-purple-800 sm:text-3xl">
  Congratulations!
</h2>
<p className="mb-3 text-sm font-medium text-gray-500">
  You've completed the Trivia Challenge!
</p>

          <div className="my-3">
  <p className="text-sm font-medium uppercase tracking-wider text-gray-500">
    Your Trivia Score
  </p>
  <p className="mt-1 text-4xl font-black text-purple-700">
    {score}
    <span className="text-xl font-semibold text-gray-400">
      {" "}/ {questions.length}
    </span>
  </p>
</div>

          {isAuthenticated && pointsAwarded > 0 && (
            <p className="mb-3 inline-block rounded-full bg-green-50 px-4 py-2 text-sm font-bold text-green-700">
  🎁 +{pointsAwarded} points added to your account!
</p>
          )}
<TriviaPromotions />

         <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              onClick={() => void startQuiz()}
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

          {!isAuthenticated && (
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

  const question = questions[currentQuestion];

  if (!question) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">No trivia questions available.</p>
      </div>
    );
  }

 return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-purple-50 to-pink-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <TriviaAnnouncementBar />
        <div className="flex justify-between items-center mb-6">
         <h1 className="text-2xl font-bold text-gray-900">
  {challenge?.title || "Weekly Trivia"}
</h1>

          <div className="text-sm font-medium text-purple-600">
            Question {currentQuestion + 1} of {questions.length}
          </div>
        </div>
{challenge?.description && (
  <p className="text-gray-600 mb-6">
    {challenge.description}
  </p>
)}

        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8">
          <div
            className="bg-gradient-to-r from-blue-600 to-purple-600 h-2.5 rounded-full transition-all"
            style={{
              width: `${((currentQuestion + 1) / questions.length) * 100}%`,
            }}
          />
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-6 md:p-8 mb-6">
          <div className="text-sm font-medium text-purple-600 mb-3">
            {question.category}
          </div>

          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6">
            {question.question}
          </h2>

          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => void handleOptionClick(index)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition font-medium ${
                  selectedOption === index
                    ? "border-purple-600 bg-purple-50 text-purple-800"
                    : "border-gray-200 hover:border-purple-300 hover:bg-purple-50"
                }`}
                disabled={submitting}
              >
                {option}
              </button>
            ))}
          </div>

          {submitting && (
            <p className="mt-4 text-sm text-purple-600 text-center">
              Moving to the next question...
            </p>
          )}

          {error && (
            <div className="mt-5 p-4 bg-red-50 text-red-700 rounded-2xl text-sm">
              <p>{error}</p>
              <button
                onClick={() => void startQuiz()}
                className="mt-3 font-semibold underline"
              >
                Restart quiz
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-500">
          Select an answer to continue automatically.
        </p>
      </div>
    </div>
  );
}
