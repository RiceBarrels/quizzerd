import { createPublicSupabaseClient } from '@/lib/supabase';
import ExamPageClient from './ExamPageClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Exams | QuizZerd',
  description: 'Browse and take public exams on QuizZerd - the educational platform for testing and learning.',
  openGraph: {
    title: 'Exams | QuizZerd',
    description: 'Browse and take public exams on QuizZerd - the educational platform for testing and learning.',
    type: 'website',
  },
};

// Fetch public exams server-side for SEO
async function getPublicExams() {
  try {
    const supabase = createPublicSupabaseClient();
    const limit = 12;
    const page = 1;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('exams')
      .select('*', { count: 'exact' })
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Server-side Supabase error:', error);
      return { exams: [], pagination: null };
    }

    return {
      exams: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: offset + limit < (count || 0)
      }
    };
  } catch (error) {
    console.error('Error fetching public exams server-side:', error);
    return { exams: [], pagination: null };
  }
}

export default async function ExamPage() {
  // Fetch public exams server-side for initial render (SEO)
  const { exams, pagination } = await getPublicExams();

  return (
    <ExamPageClient
      initialExams={exams}
      initialPagination={pagination}
    />
  );
}
