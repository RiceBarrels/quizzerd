import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

interface RouteParams {
  params: Promise<{ examId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    const { examId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = await createSupabaseClient();

    // Fetch exam data
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('exam_id', examId)
      .single();

    if (examError || !examData) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    // Check permission
    const hasPermission =
      examData.creator_id === userId ||
      examData.collaborator_ids?.includes(userId);

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch all attempts, violations, and sessions in parallel
    const [attemptsResult, violationsResult, sessionsResult] = await Promise.all([
      supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .order('created_at', { ascending: false }),

      supabase
        .from('exam_violations')
        .select('*')
        .eq('exam_id', examId),

      supabase
        .from('exam_sessions')
        .select('session_id, google_course_name, allowed_emails, status, created_at')
        .eq('exam_id', examId)
    ]);

    const attempts = attemptsResult.data || [];
    const violations = violationsResult.data || [];
    const sessions = sessionsResult.data || [];

    // Calculate overview stats
    const submittedAttempts = attempts.filter(a => a.status === 'submitted' || a.status === 'graded');
    const gradedAttempts = attempts.filter(a => a.status === 'graded' && a.score !== null);
    const inProgressAttempts = attempts.filter(a => a.status === 'in_progress');

    const averageScore = gradedAttempts.length > 0
      ? gradedAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / gradedAttempts.length
      : 0;

    const passRate = gradedAttempts.length > 0
      ? (gradedAttempts.filter(a => a.passed).length / gradedAttempts.length) * 100
      : 0;

    const averageTimeSeconds = submittedAttempts.length > 0
      ? submittedAttempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) / submittedAttempts.length
      : 0;

    // Score distribution (10-point buckets: 0-10, 10-20, ..., 90-100)
    const scoreDistribution = Array(10).fill(0);
    gradedAttempts.forEach(attempt => {
      const percentage = attempt.percentage || 0;
      const bucket = Math.min(Math.floor(percentage / 10), 9);
      scoreDistribution[bucket]++;
    });

    // Calculate question statistics
    const items = examData.items || [];
    const questionStats = items
      .filter((item: any) => item.question_type !== 'section_header' && item.question_type !== 'page_break')
      .map((item: any, index: number) => {
        const responses = submittedAttempts.map(a => a.responses?.[item.question_id]);
        const answered = responses.filter(r => r !== undefined && r !== null && r !== '').length;
        const unanswered = responses.length - answered;

        let correct = 0;
        let incorrect = 0;
        let partialCredit = 0;

        // Auto-gradable types
        if (['multiple_choice', 'true_false', 'dropdown'].includes(item.question_type) && item.correct_answer !== undefined) {
          responses.forEach(r => {
            if (r === item.correct_answer) correct++;
            else if (r !== undefined && r !== null && r !== '') incorrect++;
          });
        } else if (item.question_type === 'multiple_select' && Array.isArray(item.correct_answer)) {
          responses.forEach(r => {
            if (Array.isArray(r)) {
              const correctSet = new Set(item.correct_answer);
              const responseSet = new Set(r);
              if (correctSet.size === responseSet.size && [...correctSet].every(v => responseSet.has(v))) {
                correct++;
              } else if (r.length > 0) {
                // Check for partial credit
                const matchingAnswers = r.filter((ans: string) => correctSet.has(ans)).length;
                if (matchingAnswers > 0 && matchingAnswers < correctSet.size) {
                  partialCredit++;
                } else {
                  incorrect++;
                }
              }
            }
          });
        } else {
          // For non-auto-gradable types, mark as answered
          correct = answered;
        }

        const successRate = submittedAttempts.length > 0
          ? (correct / submittedAttempts.length) * 100
          : 0;

        // Determine difficulty based on success rate
        let difficulty: 'easy' | 'medium' | 'hard';
        if (successRate >= 70) difficulty = 'easy';
        else if (successRate >= 40) difficulty = 'medium';
        else difficulty = 'hard';

        return {
          questionNumber: index + 1,
          questionId: item.question_id,
          questionText: item.question_text,
          questionType: item.question_type,
          points: item.points || 1,
          stats: {
            correct,
            incorrect,
            partialCredit,
            unanswered,
            total: submittedAttempts.length,
            successRate: Math.round(successRate * 10) / 10,
            difficulty
          }
        };
      });

    // Identify problematic questions (low success rate)
    const problematicQuestions = questionStats
      .filter((q: any) => q.stats.successRate < 50 && q.stats.total >= 3)
      .sort((a: any, b: any) => a.stats.successRate - b.stats.successRate)
      .slice(0, 5);

    // Violation summary
    const violationSummary = {
      total: violations.length,
      byType: {
        console: violations.filter(v => v.violation_type === 'console').length,
        visibility: violations.filter(v => v.violation_type === 'visibility').length,
        translation: violations.filter(v => v.violation_type === 'translation').length,
        location: violations.filter(v => v.violation_type === 'location').length
      },
      studentsWithViolations: new Set(violations.map(v => v.student_id)).size
    };

    // Session summary
    const sessionSummary = sessions.map(session => ({
      sessionId: session.session_id,
      courseName: session.google_course_name,
      studentCount: session.allowed_emails?.length || 0,
      status: session.status,
      createdAt: session.created_at,
      attemptCount: attempts.filter(a => a.session_id === session.session_id).length
    }));

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentAttempts = attempts.filter(a => new Date(a.created_at) >= sevenDaysAgo);

    const activityByDay: Record<string, number> = {};
    recentAttempts.forEach(attempt => {
      const day = new Date(attempt.created_at).toISOString().split('T')[0];
      activityByDay[day] = (activityByDay[day] || 0) + 1;
    });

    // Create chart data for last 7 days
    const activityChartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayKey = date.toISOString().split('T')[0];
      activityChartData.push({
        date: dayKey,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        attempts: activityByDay[dayKey] || 0
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        exam: {
          examId: examData.exam_id,
          examName: examData.exam_name,
          totalPoints: examData.total_points,
          passingScore: examData.passing_score,
          questionCount: questionStats.length
        },
        overview: {
          totalAttempts: attempts.length,
          submittedCount: submittedAttempts.length,
          gradedCount: gradedAttempts.length,
          inProgressCount: inProgressAttempts.length,
          averageScore: Math.round(averageScore * 10) / 10,
          passRate: Math.round(passRate * 10) / 10,
          averageTimeSeconds: Math.round(averageTimeSeconds),
          uniqueStudents: new Set(attempts.map(a => a.student_id)).size
        },
        scoreDistribution: scoreDistribution.map((count, i) => ({
          range: `${i * 10}-${(i + 1) * 10}%`,
          count
        })),
        questionStats,
        problematicQuestions,
        violations: violationSummary,
        sessions: sessionSummary,
        activityChart: activityChartData,
        attempts: submittedAttempts.map(a => ({
          attemptId: a.attempt_id,
          studentId: a.student_id,
          attemptNumber: a.attempt_number,
          status: a.status,
          score: a.score,
          totalScore: a.total_score,
          percentage: a.percentage,
          passed: a.passed,
          timeSpentSeconds: a.time_spent_seconds,
          submittedAt: a.submitted_at,
          violationCount: violations.filter(v => v.attempt_id === a.attempt_id).length
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
