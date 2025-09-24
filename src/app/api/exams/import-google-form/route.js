import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { googleApiFetch } from '@/lib/google-auth';

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
    const { formUrl, formId, class_ids = [], is_public = false } = body;
    let { accessToken, expiresAt } = body;

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

    // If no access token provided, try to get it from Clerk
    if (!accessToken) {
      try {
        // Call our google-token endpoint to get access token from Clerk
        const tokenResponse = await fetch(new URL('/api/auth/google-token', request.url).href, {
          headers: {
            cookie: request.headers.get('cookie') || '',
          },
        });
        const tokenData = await tokenResponse.json();
        
        if (tokenData.success && tokenData.accessToken) {
          accessToken = tokenData.accessToken;
          expiresAt = tokenData.expiresAt;
          console.log('Got access token from Clerk, expires at:', new Date(expiresAt).toISOString());
        } else {
          console.log('Could not get token from Clerk:', tokenData.message);
        }
      } catch (error) {
        console.log('Error getting token from Clerk:', error.message);
      }
    }

    // Access token is required for importing from Google Forms
    if (!accessToken) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          message: 'No Google OAuth access token available. Please ensure your Google account is connected with Forms API permissions.'
        },
        { status: 401 }
      );
    }

    let formData = null;
    
    // Try to fetch actual form data if we have a valid access token
    if (accessToken) {
      try {
        // First try Google Forms API with automatic token refresh
        const formApiUrl = `https://forms.googleapis.com/v1/forms/${googleFormId}`;
        const formResponse = await googleApiFetch(
          formApiUrl,
          {},
          userId,
          accessToken,
          expiresAt
        );

        console.log("formApi response status:", formResponse.status);
        console.log("formApi response ok:", formResponse.ok);

        if (!formResponse.ok) {
          const errorText = await formResponse.text();
          console.error("Google Forms API error response:", errorText);
          
          if (formResponse.status === 401) {
            return NextResponse.json(
              { 
                error: 'Google Forms API authentication failed',
                message: 'The access token is invalid or expired. Please reconnect your Google account.',
                details: errorText
              },
              { status: 401 }
            );
          } else if (formResponse.status === 403) {
            return NextResponse.json(
              { 
                error: 'Google Forms API permission denied',
                message: 'You do not have permission to access this form. Please ensure Forms API scope is enabled.',
                details: errorText
              },
              { status: 403 }
            );
          }
        }

        if (formResponse.ok) {
          const googleFormData = await formResponse.json();

          console.log("googleFormData: ", JSON.stringify(googleFormData))
          
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
        console.error('Error fetching form from Google Forms API:', error.message);
        
        // If it's an authentication error, return a more specific message
        if (error.message.includes('401') || error.message.includes('unauthorized')) {
          return NextResponse.json(
            { 
              error: 'Google Forms API authorization failed',
              message: 'Unable to access the Google Form. Please ensure you have the necessary permissions and that Forms API scope is enabled.',
              details: error.message
            },
            { status: 401 }
          );
        }
        
        // For other errors, log and continue to fallback
        console.log('Forms API error, details:', error);
      }
    }
    
    // If we couldn't fetch form data, return error
    if (!formData) {
      return NextResponse.json(
        { 
          error: 'Failed to fetch form data',
          message: 'Could not retrieve form data from Google Forms. Please ensure you have proper permissions and the form ID is correct.'
        },
        { status: 400 }
      );
    }

    // Convert Google Forms questions to exam format
    const examItems = formData.questions.map(convertQuestion);
    const totalPoints = examItems.reduce((sum, q) => sum + q.points, 0);

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
        shuffle_items: false,
        show_results_immediately: true,
        passing_score: 70,
        items: examItems,
        total_points: totalPoints,
        status: 'draft',
        is_published: false,
        start_date: null,
        end_date: null
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
      message: 'Exam imported successfully from Google Forms'
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
export async function GET() {
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