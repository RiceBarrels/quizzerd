"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  Lightbulb,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PracticeFeedbackProps {
  isCorrect: boolean;
  correctAnswer?: string | number | boolean | number[];
  correctAnswerText?: string;
  explanation?: string;
  onRetry?: () => void;
  className?: string;
}

export function PracticeFeedback({
  isCorrect,
  correctAnswer,
  correctAnswerText,
  explanation,
  onRetry,
  className,
}: PracticeFeedbackProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "p-4 rounded-lg mt-4 border",
        isCorrect
          ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
          : "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
        className
      )}
    >
      {/* Result Header */}
      <div className="flex items-center gap-2">
        {isCorrect ? (
          <>
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-800 dark:text-green-300">
              Correct!
            </span>
          </>
        ) : (
          <>
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="font-medium text-red-800 dark:text-red-300">
              Incorrect
            </span>
          </>
        )}
      </div>

      {/* Correct Answer (if wrong) */}
      {!isCorrect && (correctAnswerText || correctAnswer !== undefined) && (
        <div className="mt-2 text-sm">
          <span className="text-muted-foreground">Correct answer: </span>
          <span className="font-medium">
            {correctAnswerText || String(correctAnswer)}
          </span>
        </div>
      )}

      {/* Explanation */}
      {explanation && (
        <div className="mt-3 pt-3 border-t border-current/10">
          <div className="flex items-center gap-1 text-sm font-medium mb-1">
            <Lightbulb className="h-4 w-4" />
            Explanation
          </div>
          <p
            className="text-sm text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: explanation }}
          />
        </div>
      )}

      {/* Retry Button */}
      {!isCorrect && onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 gap-1"
          onClick={onRetry}
        >
          <RotateCcw className="h-4 w-4" />
          Try Again
        </Button>
      )}
    </motion.div>
  );
}

interface PracticeCheckButtonProps {
  examId: string;
  questionId: string;
  userAnswer: any;
  onResult: (result: {
    isCorrect: boolean;
    correctAnswer?: any;
    correctAnswerText?: string;
    explanation?: string;
  }) => void;
  disabled?: boolean;
  className?: string;
}

export function PracticeCheckButton({
  examId,
  questionId,
  userAnswer,
  onResult,
  disabled,
  className,
}: PracticeCheckButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    if (userAnswer === undefined || userAnswer === null) return;

    setLoading(true);
    try {
      const response = await fetch("/api/exams/practice/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_id: examId,
          question_id: questionId,
          user_answer: userAnswer,
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        onResult({
          isCorrect: data.data.is_correct,
          correctAnswer: data.data.correct_answer,
          correctAnswerText: data.data.correct_answer_text,
          explanation: data.data.explanation,
        });
      }
    } catch (error) {
      console.error("Failed to check answer:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheck}
      disabled={disabled || loading || userAnswer === undefined}
      className={cn("gap-2", className)}
      variant="secondary"
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking...
        </>
      ) : (
        <>
          <CheckCircle className="h-4 w-4" />
          Check Answer
        </>
      )}
    </Button>
  );
}

interface PracticeProgressProps {
  totalQuestions: number;
  answeredCorrectly: number;
  attempts: Record<string, number>; // questionId -> attempt count
  className?: string;
}

export function PracticeProgress({
  totalQuestions,
  answeredCorrectly,
  attempts,
  className,
}: PracticeProgressProps) {
  const attemptValues = Object.values(attempts);
  const averageAttempts = attemptValues.length
    ? attemptValues.reduce((a, b) => a + b, 0) / attemptValues.length
    : 0;

  const progressPercent = totalQuestions
    ? Math.round((answeredCorrectly / totalQuestions) * 100)
    : 0;

  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <h3 className="font-medium mb-3">Practice Progress</h3>
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Accuracy</span>
          <span className="font-medium">{progressPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Completed: </span>
            <span className="font-medium">
              {answeredCorrectly} / {totalQuestions}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Avg. Attempts: </span>
            <span className="font-medium">{averageAttempts.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
