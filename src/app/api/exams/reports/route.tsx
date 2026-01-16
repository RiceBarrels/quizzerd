import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { ExamReportPDF, type ReportData } from '@/components/reports/ExamReportPDF';

// POST - Generate PDF report for an attempt
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { attempt_id, include_questions = true } = body;

    if (!attempt_id) {
      return NextResponse.json({ error: 'Attempt ID is required' }, { status: 400 });
    }

    const supabase = await createSupabaseClient();

    // Fetch attempt with exam data
    const { data: attempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .select(`
        *,
        exams (
          exam_id,
          exam_name,
          items,
          total_points,
          passing_score
        )
      `)
      .eq('attempt_id', attempt_id)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
    }

    // Verify permission (must be exam creator or the student)
    const exam = attempt.exams;
    const { data: examCheck } = await supabase
      .from('exams')
      .select('created_by')
      .eq('exam_id', exam.exam_id)
      .single();

    const isCreator = examCheck?.created_by === userId;
    // Note: For student access, you would check if their email matches attempt.student_email

    if (!isCreator) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get session info if available
    let courseName: string | undefined;
    if (attempt.session_id) {
      const { data: session } = await supabase
        .from('exam_sessions')
        .select('google_course_name')
        .eq('session_id', attempt.session_id)
        .single();
      courseName = session?.google_course_name;
    }

    // Calculate time spent
    let timeSpent: string | undefined;
    if (attempt.started_at && attempt.submitted_at) {
      const start = new Date(attempt.started_at);
      const end = new Date(attempt.submitted_at);
      const diffMs = end.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffSecs = Math.floor((diffMs % 60000) / 1000);
      timeSpent = `${diffMins}m ${diffSecs}s`;
    }

    // Parse answers and prepare question details
    const answers = attempt.answers || {};
    const items = exam.items || [];
    const questions: ReportData['questions'] = [];

    if (include_questions) {
      items.forEach((item: any, index: number) => {
        // Skip non-question items
        if (item.question_type === 'section_header' || item.question_type === 'page_break') {
          return;
        }

        const userAnswer = answers[item.question_id];
        const correctAnswer = item.correct_answer;
        let isCorrect = false;
        let userAnswerText = '';
        let correctAnswerText = '';

        // Format answers based on question type
        switch (item.question_type) {
          case 'multiple_choice':
          case 'dropdown':
            userAnswerText = userAnswer !== undefined && item.options
              ? item.options[userAnswer] || String(userAnswer)
              : '';
            correctAnswerText = correctAnswer !== undefined && item.options
              ? item.options[correctAnswer] || String(correctAnswer)
              : '';
            isCorrect = userAnswer === correctAnswer;
            break;

          case 'multiple_select':
            if (Array.isArray(userAnswer) && item.options) {
              userAnswerText = userAnswer.map((i: number) => item.options[i]).join(', ');
            }
            if (Array.isArray(correctAnswer) && item.options) {
              correctAnswerText = correctAnswer.map((i: number) => item.options[i]).join(', ');
              const userSorted = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
              const correctSorted = [...correctAnswer].sort();
              isCorrect = JSON.stringify(userSorted) === JSON.stringify(correctSorted);
            }
            break;

          case 'true_false':
            userAnswerText = userAnswer === true ? 'True' : userAnswer === false ? 'False' : '';
            correctAnswerText = correctAnswer === true ? 'True' : 'False';
            isCorrect = userAnswer === correctAnswer;
            break;

          case 'short_answer':
            userAnswerText = String(userAnswer || '');
            if (Array.isArray(correctAnswer)) {
              correctAnswerText = correctAnswer.join(' or ');
              isCorrect = correctAnswer.some(
                (ans: string) => String(ans).toLowerCase().trim() === userAnswerText.toLowerCase().trim()
              );
            } else {
              correctAnswerText = String(correctAnswer || '');
              isCorrect = correctAnswerText.toLowerCase().trim() === userAnswerText.toLowerCase().trim();
            }
            break;

          default:
            userAnswerText = String(userAnswer || '');
        }

        const points = item.points || 0;
        const earnedPoints = isCorrect ? points : 0;

        questions.push({
          number: questions.length + 1,
          text: item.question_text || '',
          points,
          earnedPoints,
          userAnswer: userAnswerText,
          correctAnswer: correctAnswerText,
          isCorrect,
        });
      });
    }

    // Prepare report data
    const percentage = exam.total_points > 0
      ? Math.round((attempt.score / exam.total_points) * 100)
      : 0;

    const reportData: ReportData = {
      examName: exam.exam_name,
      courseName,
      studentName: attempt.student_name || 'Unknown',
      studentEmail: attempt.student_email || 'Unknown',
      score: attempt.score || 0,
      totalPoints: exam.total_points || 0,
      percentage,
      passingScore: exam.passing_score,
      passed: percentage >= (exam.passing_score || 0),
      submittedAt: attempt.submitted_at || attempt.created_at,
      timeSpent,
      questions: include_questions ? questions : undefined,
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      <ExamReportPDF data={reportData} showQuestions={include_questions} />
    );

    // Convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(pdfBuffer);

    // Return as PDF
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="grade-report-${attempt_id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

// GET - Generate batch reports (returns download links)
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const examId = searchParams.get('examId');

    if (!sessionId && !examId) {
      return NextResponse.json(
        { error: 'Session ID or Exam ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    // Fetch completed attempts
    let query = supabase
      .from('exam_attempts')
      .select('attempt_id, student_name, student_email, score, submitted_at')
      .eq('status', 'completed')
      .not('submitted_at', 'is', null);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    } else if (examId) {
      query = query.eq('exam_id', examId);
    }

    const { data: attempts, error } = await query;

    if (error) {
      console.error('Error fetching attempts:', error);
      return NextResponse.json({ error: 'Failed to fetch attempts' }, { status: 500 });
    }

    // Return list of attempts that can be downloaded
    return NextResponse.json({
      success: true,
      data: attempts || [],
      count: attempts?.length || 0,
    });
  } catch (error) {
    console.error('Error in GET /api/exams/reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
