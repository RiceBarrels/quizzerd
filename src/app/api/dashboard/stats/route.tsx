import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabase = await createSupabaseClient();

    // Fetch all stats in parallel for better performance
    const [
      examsResult,
      sessionsResult,
      attemptsResult,
      recentActivityResult
    ] = await Promise.all([
      // Get exam counts
      supabase
        .from('exams')
        .select('exam_id, status, created_at', { count: 'exact' })
        .or(`creator_id.eq.${userId},collaborator_ids.cs.{${userId}}`),

      // Get session counts
      supabase
        .from('exam_sessions')
        .select('session_id, status, allowed_emails, created_at', { count: 'exact' })
        .eq('created_by', userId),

      // Get attempt stats - first get all exams by this user
      supabase
        .from('exams')
        .select('exam_id')
        .or(`creator_id.eq.${userId},collaborator_ids.cs.{${userId}}`),

      // Get recent activity (last 30 days)
      supabase
        .from('exam_sessions')
        .select('created_at')
        .eq('created_by', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: true })
    ]);

    // Get all attempt counts for user's exams
    let totalAttempts = 0;
    let completedAttempts = 0;
    let averageScore = 0;
    let attemptsByDay: Record<string, number> = {};

    if (attemptsResult.data && attemptsResult.data.length > 0) {
      const examIds = attemptsResult.data.map(e => e.exam_id);

      const { data: attempts } = await supabase
        .from('exam_attempts')
        .select('attempt_id, status, score, total_score, created_at')
        .in('exam_id', examIds);

      if (attempts) {
        totalAttempts = attempts.length;
        completedAttempts = attempts.filter(a => a.status === 'completed').length;

        // Calculate average score
        const scoredAttempts = attempts.filter(a => a.score !== null && a.total_score !== null && a.total_score > 0);
        if (scoredAttempts.length > 0) {
          const totalPercentage = scoredAttempts.reduce((sum, a) => {
            return sum + ((a.score || 0) / (a.total_score || 1)) * 100;
          }, 0);
          averageScore = Math.round(totalPercentage / scoredAttempts.length);
        }

        // Group attempts by day (last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        attempts.forEach(attempt => {
          const date = new Date(attempt.created_at);
          if (date >= sevenDaysAgo) {
            const dayKey = date.toISOString().split('T')[0];
            attemptsByDay[dayKey] = (attemptsByDay[dayKey] || 0) + 1;
          }
        });
      }
    }

    // Calculate stats
    const exams = examsResult.data || [];
    const sessions = sessionsResult.data || [];

    const totalExams = examsResult.count || 0;
    const publishedExams = exams.filter(e => e.status === 'published').length;
    const draftExams = exams.filter(e => e.status === 'draft').length;

    const totalSessions = sessionsResult.count || 0;
    const activeSessions = sessions.filter(s => s.status === 'active').length;

    // Total unique students across all sessions
    const allStudentEmails = new Set<string>();
    sessions.forEach(session => {
      if (session.allowed_emails && Array.isArray(session.allowed_emails)) {
        session.allowed_emails.forEach((email: string) => allStudentEmails.add(email));
      }
    });
    const totalStudents = allStudentEmails.size;

    // Prepare chart data for last 7 days
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayKey = date.toISOString().split('T')[0];
      chartData.push({
        date: dayKey,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        attempts: attemptsByDay[dayKey] || 0
      });
    }

    // Calculate completion rate
    const completionRate = totalAttempts > 0
      ? Math.round((completedAttempts / totalAttempts) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        exams: {
          total: totalExams,
          published: publishedExams,
          draft: draftExams
        },
        sessions: {
          total: totalSessions,
          active: activeSessions
        },
        attempts: {
          total: totalAttempts,
          completed: completedAttempts,
          completionRate
        },
        students: {
          total: totalStudents
        },
        performance: {
          averageScore
        },
        chartData
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
