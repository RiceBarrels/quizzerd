import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

// POST - Check answer in practice mode (immediate feedback)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { exam_id, question_id, user_answer } = body;

    if (!exam_id || !question_id) {
      return NextResponse.json(
        { error: 'Exam ID and question ID are required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    // Fetch exam and verify it's in practice mode
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('items, is_practice_mode, show_explanations')
      .eq('exam_id', exam_id)
      .single();

    if (examError || !exam) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    if (!exam.is_practice_mode) {
      return NextResponse.json(
        { error: 'This exam is not in practice mode' },
        { status: 403 }
      );
    }

    // Find the question
    const question = exam.items?.find((q: any) => q.question_id === question_id);

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    // Check the answer
    let isCorrect = false;
    const correctAnswer = question.correct_answer;

    switch (question.question_type) {
      case 'multiple_choice':
      case 'dropdown':
        isCorrect = user_answer === correctAnswer;
        break;

      case 'multiple_select':
        // Both should be arrays, compare sorted
        if (Array.isArray(user_answer) && Array.isArray(correctAnswer)) {
          const userSorted = [...user_answer].sort();
          const correctSorted = [...correctAnswer].sort();
          isCorrect = JSON.stringify(userSorted) === JSON.stringify(correctSorted);
        }
        break;

      case 'true_false':
        isCorrect = user_answer === correctAnswer;
        break;

      case 'short_answer':
        // Case-insensitive comparison, check against all acceptable answers
        const userAnswerLower = String(user_answer).toLowerCase().trim();
        if (Array.isArray(correctAnswer)) {
          isCorrect = correctAnswer.some(
            (ans: string) => String(ans).toLowerCase().trim() === userAnswerLower
          );
        } else {
          isCorrect = String(correctAnswer).toLowerCase().trim() === userAnswerLower;
        }
        break;

      case 'scale':
      case 'rating':
        isCorrect = user_answer === correctAnswer;
        break;

      default:
        // For types without definite answers, just return neutral
        return NextResponse.json({
          success: true,
          data: {
            question_id,
            hasCorrectAnswer: false,
            message: 'This question type does not have automatic grading'
          }
        });
    }

    // Build response
    const response: any = {
      question_id,
      is_correct: isCorrect,
      hasCorrectAnswer: true,
    };

    // Include correct answer if wrong
    if (!isCorrect) {
      response.correct_answer = correctAnswer;

      // Format answer for display
      if (question.question_type === 'multiple_choice' || question.question_type === 'dropdown') {
        response.correct_answer_text = question.options?.[correctAnswer as number] || '';
      } else if (question.question_type === 'multiple_select') {
        response.correct_answer_text = (correctAnswer as number[])
          .map((idx: number) => question.options?.[idx])
          .filter(Boolean)
          .join(', ');
      }
    }

    // Include explanation if enabled
    if (exam.show_explanations && question.explanation) {
      response.explanation = question.explanation;
    }

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Error checking practice answer:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
