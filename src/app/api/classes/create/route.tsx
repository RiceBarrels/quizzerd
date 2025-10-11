import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      className,
      description,
      periodStart, 
      periodEnd,
      classSettings = { themeFont: "default", themeColor: "#bc6a4a" }
    } = body;

    if (!className) {
      return NextResponse.json(
        { error: 'Class name is required' },
        { status: 400 }
      );
    }

    // Convert time strings to timetz format (HH:MM:SS+TZ)
    const formatTimeWithTimezone = (timeString: string) => {
      if (!timeString) return null;
      // Add seconds and timezone offset
      // Using UTC timezone (+00) as default
      return `${timeString}:00+00`;
    };

    // Create Supabase client
    const supabase = await createSupabaseClient();

    // Insert new class into database
    const { data, error } = await supabase
      .from('class')
      .insert({
        class_name: className,
        description: description,
        admin_ids: [userId], // Current user is the admin
        teacher_ids: [],
        student_ids: [],
        period_start: formatTimeWithTimezone(periodStart),
        period_end: formatTimeWithTimezone(periodEnd),
        class_settings: classSettings,
        assignments: [],
        is_archived: false
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to create class' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      data 
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating class:', error);
    return NextResponse.json(
      { error: 'Failed to create class' },
      { status: 500 }
    );
  }
}