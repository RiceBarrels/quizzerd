import { NextResponse } from 'next/server';
import { createSupabaseClient, createSupabaseAdminClient } from '@/lib/supabase';
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
    const { exam_id, class_ids, name, description, publish_at, due_at, access_at } = body;

    if (!exam_id || !class_ids || !Array.isArray(class_ids) || class_ids.length === 0) {
      return NextResponse.json(
        { error: 'Exam ID and at least one class ID are required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    // Check if user has permission to create assignments for these classes
    const { data: classesData, error: classesError } = await supabase
      .from('class')
      .select('class_id, admin_ids, teacher_ids, class_name')
      .in('class_id', class_ids);

    if (classesError || !classesData) {
      return NextResponse.json(
        { error: 'Failed to fetch classes' },
        { status: 500 }
      );
    }

    // Verify user has permission for all classes
    const unauthorizedClasses = classesData.filter(cls => {
      const isAdmin = cls.admin_ids?.includes(userId);
      const isTeacher = cls.teacher_ids?.includes(userId);
      return !isAdmin && !isTeacher;
    });

    if (unauthorizedClasses.length > 0) {
      return NextResponse.json(
        { error: 'You do not have permission to create assignments for all selected classes' },
        { status: 403 }
      );
    }

    // Verify exam exists and user has permission
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('exam_id, creator_id, collaborator_ids')
      .eq('exam_id', exam_id)
      .single();

    if (examError || !examData) {
      return NextResponse.json(
        { error: 'Exam not found' },
        { status: 404 }
      );
    }

    const hasExamPermission = 
      examData.creator_id === userId ||
      examData.collaborator_ids?.includes(userId);

    if (!hasExamPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to publish this exam' },
        { status: 403 }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();
    
    // Check which classes already have this exam assigned
    const { data: existingAssignments, error: checkError } = await supabaseAdmin
      .from('class_assignments')
      .select('exam_id, assignment')
      .eq('exam_id', exam_id);

    if (checkError) {
      console.error('Error checking existing assignments:', checkError);
    }

    // Get list of classes that already have this exam
    const existingAssignmentIds = existingAssignments?.map(a => a.assignment) || [];
    
    // Filter out classes that already have assignments
    const { data: existingClassData } = await supabaseAdmin
      .from('class')
      .select('class_id, assignments')
      .in('class_id', class_ids);

    const classesWithExistingAssignments: string[] = [];
    const classesToCreate: string[] = [];

    for (const cls of existingClassData || []) {
      const hasAssignment = cls.assignments?.some((assignId: string) => 
        existingAssignmentIds.includes(assignId)
      );
      
      if (hasAssignment) {
        classesWithExistingAssignments.push(cls.class_id);
      } else {
        classesToCreate.push(cls.class_id);
      }
    }

    console.log('Classes that already have this exam:', classesWithExistingAssignments);
    console.log('Classes to create assignments for:', classesToCreate);

    // If all classes already have the assignment
    if (classesToCreate.length === 0) {
      return NextResponse.json({
        error: 'This exam is already published to all selected classes',
        details: 'Cannot create duplicate assignments',
        alreadyPublishedTo: classesWithExistingAssignments
      }, { status: 400 });
    }

    // Create assignments only for classes that don't have them yet
    const assignments = classesToCreate.map(class_id => ({
      name: name || 'Untitled Assignment',
      description: description || null,
      exam_id: exam_id,
      student_attempt_data: {},
      student_public_chat: {},
      publish_at: publish_at || new Date().toISOString(),
      access_at: access_at || null,
      due_at: due_at || null,
    }));

    console.log('Creating assignments:', assignments);

    const { data: createdAssignments, error: insertError } = await supabaseAdmin
      .from('class_assignments')
      .insert(assignments)
      .select();

    if (insertError) {
      console.error('Error creating assignments:', insertError);
      return NextResponse.json(
        { error: 'Failed to create assignments', details: insertError.message },
        { status: 500 }
      );
    }

    console.log('✅ Successfully created assignments:', createdAssignments);

    // Update each class's assignments array with the new assignment IDs
    for (let i = 0; i < classesToCreate.length; i++) {
      const classId = classesToCreate[i];
      const assignmentId = createdAssignments[i].assignment;

      console.log(`📝 Updating class ${classId} with assignment ${assignmentId}`);

      // Fetch current class data
      const { data: classData, error: fetchError } = await supabaseAdmin
        .from('class')
        .select('assignments')
        .eq('class_id', classId)
        .single();

      if (fetchError) {
        console.error(`Error fetching class ${classId}:`, fetchError);
        continue; // Skip this class but continue with others
      }

      // Add new assignment ID to the assignments array
      const currentAssignments = classData.assignments || [];
      const updatedAssignments = [...currentAssignments, assignmentId];

      // Update the class with new assignments array
      const { error: updateError } = await supabaseAdmin
        .from('class')
        .update({ 
          assignments: updatedAssignments,
          updated_at: new Date().toISOString()
        })
        .eq('class_id', classId);

      if (updateError) {
        console.error(`Error updating class ${classId}:`, updateError);
      } else {
        console.log(`✅ Updated class ${classId} assignments array`);
      }
    }

    let message = `Successfully created ${createdAssignments.length} assignment(s)`;
    if (classesWithExistingAssignments.length > 0) {
      message += `. Skipped ${classesWithExistingAssignments.length} class(es) that already have this exam.`;
    }

    return NextResponse.json({
      success: true,
      data: createdAssignments,
      message,
      skippedClasses: classesWithExistingAssignments,
      createdForClasses: classesToCreate
    });

  } catch (error) {
    console.error('Error creating class assignments:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

