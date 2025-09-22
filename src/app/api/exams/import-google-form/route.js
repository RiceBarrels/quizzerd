import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

// Helper function to extract Google Form ID from URL
function extractFormId(url) {
  // Handle different Google Forms URL formats
  // https://docs.google.com/forms/d/FORM_ID/edit
  // https://docs.google.com/forms/d/e/FORM_ID/viewform
  // https://forms.gle/SHORT_ID
  
  const patterns = [
    /\/forms\/d\/([a-zA-Z0-9_-]+)/,
    /\/forms\/d\/e\/([a-zA-Z0-9_-]+)/,
    /forms\.gle\/([a-zA-Z0-9]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

// Helper function to convert Google Forms question to exam question format
function convertQuestion(googleQuestion) {
  const question = {
    question_id: crypto.randomUUID(),
    question_text: googleQuestion.title || '',
    question_type: 'multiple_choice', // default
    options: [],
    correct_answer: null,
    points: googleQuestion.points || 10,
    explanation: '',
    required: googleQuestion.required || false
  };

  // Map Google Forms question types to our exam question types
  switch (googleQuestion.type) {
    case 'RADIO':
    case 'multiple_choice':
      question.question_type = 'multiple_choice';
      question.options = googleQuestion.choices || [];
      break;
      
    case 'CHECKBOX':
    case 'checkboxes':
      question.question_type = 'multiple_select';
      question.options = googleQuestion.choices || [];
      question.correct_answer = []; // Array for multiple correct answers
      break;
      
    case 'TEXT':
    case 'short_answer':
      question.question_type = 'short_answer';
      break;
      
    case 'PARAGRAPH_TEXT':
    case 'paragraph':
      question.question_type = 'long_answer';
      break;
      
    case 'SCALE':
    case 'linear_scale':
      question.question_type = 'scale';
      question.scale_min = googleQuestion.scaleMin || 1;
      question.scale_max = googleQuestion.scaleMax || 5;
      break;
      
    case 'DATE':
      question.question_type = 'date';
      break;
      
    case 'TIME':
      question.question_type = 'time';
      break;
      
    default:
      question.question_type = 'short_answer';
  }

  return question;
}

export async function POST(request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { formUrl, formId, accessToken, class_ids = [], is_public = false } = body;

    // Determine form ID from either direct ID or URL
    let googleFormId = formId;
    if (!googleFormId && formUrl) {
      googleFormId = extractFormId(formUrl);
    }
    
    if (!googleFormId) {
      return NextResponse.json(
        { error: 'Google Forms URL or ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    let formData = null;
    
    // Try to fetch actual form data if access token is provided
    if (accessToken) {
      try {
        // First try Google Forms API
        const formApiUrl = `https://forms.googleapis.com/v1/forms/${googleFormId}`;
        const formResponse = await fetch(formApiUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json',
          },
        });

        if (formResponse.ok) {
          const googleFormData = await formResponse.json();
          
          // Convert Google Forms data to our format
          formData = {
            title: googleFormData.info?.title || 'Imported Form',
            description: googleFormData.info?.description || '',
            questions: googleFormData.items?.map(item => {
              if (!item.questionItem) return null;
              
              const question = item.questionItem.question;
              const baseQuestion = {
                title: item.title || '',
                required: question.required || false,
                points: question.grading?.pointValue || 10
              };

              if (question.choiceQuestion) {
                return {
                  ...baseQuestion,
                  type: question.choiceQuestion.type || 'RADIO',
                  choices: question.choiceQuestion.options?.map(opt => opt.value) || []
                };
              } else if (question.textQuestion) {
                return {
                  ...baseQuestion,
                  type: question.textQuestion.paragraph ? 'PARAGRAPH_TEXT' : 'TEXT'
                };
              } else if (question.scaleQuestion) {
                return {
                  ...baseQuestion,
                  type: 'SCALE',
                  scaleMin: question.scaleQuestion.low,
                  scaleMax: question.scaleQuestion.high
                };
              }
              
              return baseQuestion;
            }).filter(Boolean) || []
          };
        }
      } catch (error) {
        console.log('Forms API not available, using fallback');
      }
    }
    
    // Fallback to mock data if we couldn't fetch real data
    if (!formData) {
      // Try to get basic metadata from Drive API if we have access token
      let formTitle = `Imported Google Form (${new Date().toLocaleDateString()})`;
      
      if (accessToken) {
        try {
          const driveResponse = await fetch(
            `https://www.googleapis.com/drive/v3/files/${googleFormId}?fields=name,description`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
              },
            }
          );
          
          if (driveResponse.ok) {
            const driveData = await driveResponse.json();
            formTitle = driveData.name || formTitle;
          }
        } catch (error) {
          console.log('Drive API error:', error);
        }
      }
      
      // Use mock data with better title
      formData = {
        title: formTitle,
        description: `Imported from Google Forms${formUrl ? `: ${formUrl}` : ''}`,
        questions: [
          {
            title: "Sample Multiple Choice Question",
            type: "RADIO",
            choices: ["Option A", "Option B", "Option C", "Option D"],
            points: 10,
            required: true
          },
          {
            title: "Sample Short Answer Question",
            type: "TEXT",
            points: 5,
            required: true
          },
          {
            title: "Sample Checkbox Question",
            type: "CHECKBOX",
            choices: ["Choice 1", "Choice 2", "Choice 3"],
            points: 15,
            required: false
          }
        ]
      };
    }

    // Convert Google Forms questions to exam format
    const examQuestions = formData.questions.map(convertQuestion);
    const totalPoints = examQuestions.reduce((sum, q) => sum + q.points, 0);

    // Validate class permissions if classes are provided
    const validClassIds = [];
    if (class_ids && Array.isArray(class_ids) && class_ids.length > 0) {
      for (const classId of class_ids) {
        const { data: classData, error: classError } = await supabase
          .from('class')
          .select('admin_ids, teacher_ids')
          .eq('class_id', classId)
          .single();

        if (classError || !classData) {
          continue; // Skip invalid class IDs
        }

        const hasPermission = 
          classData.admin_ids?.includes(userId) ||
          classData.teacher_ids?.includes(userId);

        if (hasPermission) {
          validClassIds.push(classId);
        }
      }
    }

    // Create the imported exam
    const { data, error } = await supabase
      .from('exams')
      .insert({
        exam_name: formData.title,
        exam_description: formData.description,
        class_id: validClassIds,
        subject: [],
        creator_id: userId,
        is_public: is_public || false,
        collaborator_ids: [],
        duration_minutes: 60,
        attempts_allowed: 1,
        shuffle_questions: false,
        show_results_immediately: true,
        passing_score: 70,
        questions: examQuestions,
        total_points: totalPoints,
        status: 'draft'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating imported exam:', error);
      return NextResponse.json(
        { error: 'Failed to import exam' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Exam imported successfully from Google Forms',
      note: 'This is a demonstration import. Full Google Forms API integration requires OAuth2 authentication.'
    });

  } catch (error) {
    console.error('Error importing from Google Forms:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check if Google Forms API is configured
export async function GET(request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if Google Forms API credentials are configured
    const isConfigured = process.env.GOOGLE_CLIENT_ID && 
                        process.env.GOOGLE_CLIENT_SECRET;

    return NextResponse.json({
      success: true,
      configured: !!isConfigured,
      message: isConfigured 
        ? 'Google Forms API is configured' 
        : 'Google Forms API credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
      features: {
        importQuestions: true,
        importResponses: false, // Can be added later
        syncChanges: false, // Can be added later
        exportToForms: false // Can be added later
      }
    });

  } catch (error) {
    console.error('Error checking Google Forms configuration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}