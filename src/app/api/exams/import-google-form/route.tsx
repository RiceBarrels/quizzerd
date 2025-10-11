import { NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';
import { googleApiFetch } from '@/lib/google-auth';

// Helper function to extract Google Form ID from URL
function extractFormId(url: string) {
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

// Helper function to convert Google Forms item to exam question format
function convertGoogleFormItem(item: any) {
  // Handle non-question items
  if (item.textItem) {
    // Section header/description
    return {
      question_id: crypto.randomUUID(),
      question_type: 'section_header',
      question_text: item.title || '',
      description: item.description || '',
      points: 0,
      required: false
    };
  }
  
  if (item.pageBreakItem) {
    // Page break
    return {
      question_id: crypto.randomUUID(),
      question_type: 'page_break',
      question_text: item.title || 'Page Break',
      points: 0,
      required: false
    };
  }

  // Handle grid questions (multiple choice grid or checkbox grid)
  if (item.questionGroupItem) {
    const group = item.questionGroupItem;
    const gridType = group.grid?.columns?.type;
    const columnOptions = group.grid?.columns?.options?.map((opt: any) => opt.value) || [];
    
    // Convert each row into a separate question
    return (group.questions || []).map((gridQuestion: any) => {
      const question = {
        question_id: crypto.randomUUID(),
        question_text: `${item.title || 'Grid Question'}: ${gridQuestion.rowQuestion?.title || ''}`,
        question_type: gridType === 'CHECKBOX' ? 'multiple_select' : 'multiple_choice',
        options: columnOptions,
        correct_answer: null,
        points: gridQuestion.grading?.pointValue || 10,
        required: gridQuestion.required || false,
        grid_parent: item.title || 'Grid Question',
        shuffle: group.grid?.shuffleQuestions || false
      };
      
      // Set correct answer if available
      if (gridQuestion.grading?.correctAnswers?.answers) {
        const correctValues = gridQuestion.grading.correctAnswers.answers.map((a: any) => a.value);
        question.correct_answer = gridType === 'CHECKBOX' ? correctValues : correctValues[0];
      }
      
      return question;
    });
  }

  // Handle regular question items
  if (item.questionItem) {
    const questionData = item.questionItem.question;
    const baseQuestion = {
      question_id: crypto.randomUUID(),
      question_text: item.title || '',
      points: questionData.grading?.pointValue || 10,
      required: questionData.required || false,
      explanation: questionData.grading?.generalFeedback?.text || '',
      correct_answer: null
    };

    // Extract correct answers if available
    if (questionData.grading?.correctAnswers?.answers) {
      const correctValues = questionData.grading.correctAnswers.answers.map((a: any) => a.value);
      baseQuestion.correct_answer = correctValues.length === 1 ? correctValues[0] : correctValues;
    }

    // Handle different question types
    if (questionData.choiceQuestion) {
      const choiceType = questionData.choiceQuestion.type;
      const options = questionData.choiceQuestion.options?.map((opt: any) => opt.value) || [];
      
      if (choiceType === 'RADIO') {
        return {
          ...baseQuestion,
          question_type: 'multiple_choice',
          options,
          shuffle: questionData.choiceQuestion.shuffle || false
        };
      } else if (choiceType === 'CHECKBOX') {
        return {
          ...baseQuestion,
          question_type: 'multiple_select',
          options,
          correct_answer: baseQuestion.correct_answer || [],
          shuffle: questionData.choiceQuestion.shuffle || false
        };
      } else if (choiceType === 'DROP_DOWN') {
        return {
          ...baseQuestion,
          question_type: 'dropdown',
          options,
          shuffle: questionData.choiceQuestion.shuffle || false
        };
      }
    }
    
    if (questionData.textQuestion) {
      return {
        ...baseQuestion,
        question_type: questionData.textQuestion.paragraph ? 'long_answer' : 'short_answer'
      };
    }
    
    if (questionData.scaleQuestion) {
      return {
        ...baseQuestion,
        question_type: 'scale',
        scale_min: questionData.scaleQuestion.low || 1,
        scale_max: questionData.scaleQuestion.high || 5,
        scale_min_label: questionData.scaleQuestion.lowLabel || '',
        scale_max_label: questionData.scaleQuestion.highLabel || ''
      };
    }
    
    if (questionData.dateQuestion) {
      return {
        ...baseQuestion,
        question_type: 'date',
        include_time: questionData.dateQuestion.includeTime || false,
        include_year: questionData.dateQuestion.includeYear || false
      };
    }
    
    if (questionData.timeQuestion) {
      return {
        ...baseQuestion,
        question_type: 'time',
        duration: questionData.timeQuestion.duration || false
      };
    }
    
    if (questionData.fileUploadQuestion) {
      return {
        ...baseQuestion,
        question_type: 'file_upload',
        folder_id: questionData.fileUploadQuestion.folderId || '',
        max_files: questionData.fileUploadQuestion.maxFiles || 1,
        max_file_size: questionData.fileUploadQuestion.maxFileSize || '10485760',
        allowed_types: questionData.fileUploadQuestion.types || ['ANY']
      };
    }
    
    if (questionData.ratingQuestion) {
      return {
        ...baseQuestion,
        question_type: 'rating',
        rating_scale: questionData.ratingQuestion.ratingScaleLevel || 5,
        rating_icon: questionData.ratingQuestion.iconType || 'STAR'
      };
    }
    
    // Default to short answer if type is unknown
    return {
      ...baseQuestion,
      question_type: 'short_answer'
    };
  }
  
  // Return null for unrecognized items
  return null;
}

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
        console.log('Error getting token from Clerk:', error instanceof Error ? error.message : String(error));
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
            documentTitle: googleFormData.info?.documentTitle || '',
            isQuiz: googleFormData.settings?.quizSettings?.isQuiz || false,
            items: googleFormData.items || []
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

    // Convert Google Forms items to exam format
    const examItems = [];
    for (const item of formData.items) {
      const converted = convertGoogleFormItem(item);
      if (converted) {
        // Handle grid questions that return an array
        if (Array.isArray(converted)) {
          examItems.push(...converted);
        } else {
          examItems.push(converted);
        }
      }
    }
    
    // Filter out non-question items for total points calculation
    const scorableItems = examItems.filter(item => 
      item.question_type !== 'section_header' && 
      item.question_type !== 'page_break'
    );
    const totalPoints = scorableItems.reduce((sum, q) => sum + (q.points || 0), 0);

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
        show_results_immediately: formData.isQuiz || false,
        passing_score: 70,
        items: examItems,
        total_points: totalPoints,
        status: 'draft',
        is_published: false,
        is_quiz: formData.isQuiz || false,
        google_form_id: googleFormId,
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