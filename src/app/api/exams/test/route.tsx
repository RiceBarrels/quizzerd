import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createSupabaseClient();

    // Test if exams table exists
    const { data, error } = await supabase
      .from('exams')
      .select('exam_id')
      .limit(1);

    if (error) {
      // If table doesn't exist, provide instructions
      if (error.message.includes('relation "exams" does not exist')) {
        return NextResponse.json({
          error: 'Exams table not found',
          message: 'Please create the exams table using the schema in /supabaseSchema/exams.txt',
          details: error.message
        }, { status: 500 });
      }
      
      return NextResponse.json({
        error: 'Database error',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Exams table exists and is accessible',
      userId,
      sampleData: data
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
}