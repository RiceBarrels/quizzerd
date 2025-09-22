import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Google Forms MIME type
const GOOGLE_FORMS_MIMETYPE = 'application/vnd.google-apps.form';

export async function GET(request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('access_token');
    const pageToken = searchParams.get('pageToken');
    const searchQuery = searchParams.get('q') || '';

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Google access token required' },
        { status: 400 }
      );
    }

    // Build the query for Google Drive API
    let q = `mimeType='${GOOGLE_FORMS_MIMETYPE}'`;
    
    // Add search query if provided
    if (searchQuery) {
      q += ` and name contains '${searchQuery}'`;
    }
    
    // Add filter to exclude trashed files
    q += ' and trashed=false';

    // Build the request URL
    const driveApiUrl = new URL('https://www.googleapis.com/drive/v3/files');
    driveApiUrl.searchParams.append('q', q);
    driveApiUrl.searchParams.append('fields', 'nextPageToken, files(id, name, createdTime, modifiedTime, owners, webViewLink, iconLink, thumbnailLink)');
    driveApiUrl.searchParams.append('orderBy', 'modifiedTime desc');
    driveApiUrl.searchParams.append('pageSize', '20');
    
    if (pageToken) {
      driveApiUrl.searchParams.append('pageToken', pageToken);
    }

    // Fetch forms from Google Drive
    const response = await fetch(driveApiUrl.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Google Drive API error:', errorData);
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Google authentication expired. Please re-authenticate.' },
          { status: 401 }
        );
      }
      
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to fetch Google Forms' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Format the response
    const forms = data.files?.map(file => ({
      id: file.id,
      name: file.name,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      owner: file.owners?.[0]?.displayName || 'Unknown',
      ownerEmail: file.owners?.[0]?.emailAddress,
      webViewLink: file.webViewLink,
      iconLink: file.iconLink || 'https://ssl.gstatic.com/docs/doclist/images/icon_11_form_list.png',
      thumbnailLink: file.thumbnailLink,
      // Generate different URL formats for the form
      editUrl: `https://docs.google.com/forms/d/${file.id}/edit`,
      viewUrl: `https://docs.google.com/forms/d/e/${file.id}/viewform`,
      responseUrl: `https://docs.google.com/forms/d/${file.id}/responses`
    })) || [];

    return NextResponse.json({
      success: true,
      forms,
      nextPageToken: data.nextPageToken || null,
      totalForms: forms.length
    });

  } catch (error) {
    console.error('Error listing Google Forms:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint to get form details using Google Forms API
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
    const { formId, accessToken } = body;

    if (!formId || !accessToken) {
      return NextResponse.json(
        { error: 'Form ID and access token are required' },
        { status: 400 }
      );
    }

    // Get form metadata using Google Forms API
    const formApiUrl = `https://forms.googleapis.com/v1/forms/${formId}`;
    
    const response = await fetch(formApiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Google Forms API error:', errorData);
      
      // If Forms API is not available, try to get basic info from Drive API
      if (response.status === 403 || response.status === 404) {
        // Fallback to Drive API for basic metadata
        const driveResponse = await fetch(
          `https://www.googleapis.com/drive/v3/files/${formId}?fields=id,name,description,createdTime,modifiedTime,owners`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json',
            },
          }
        );

        if (driveResponse.ok) {
          const driveData = await driveResponse.json();
          return NextResponse.json({
            success: true,
            formData: {
              formId: driveData.id,
              title: driveData.name,
              description: driveData.description || '',
              documentTitle: driveData.name,
              items: [], // No access to questions without Forms API
              requiresFormsApi: true,
              driveMetadata: driveData
            },
            message: 'Forms API not available. Using Drive API metadata only.'
          });
        }
      }
      
      return NextResponse.json(
        { error: errorData.error?.message || 'Failed to fetch form details' },
        { status: response.status }
      );
    }

    const formData = await response.json();

    // Extract questions from the form
    const questions = formData.items?.map(item => {
      if (!item.questionItem) return null;
      
      const question = item.questionItem.question;
      const questionData = {
        id: item.itemId,
        title: item.title || '',
        description: item.description || '',
        required: question.required || false,
        type: question.choiceQuestion ? 'choice' : 
              question.textQuestion ? 'text' :
              question.scaleQuestion ? 'scale' :
              question.dateQuestion ? 'date' :
              question.timeQuestion ? 'time' : 'unknown',
        questionDetails: {}
      };

      // Extract type-specific details
      if (question.choiceQuestion) {
        questionData.questionDetails = {
          type: question.choiceQuestion.type, // RADIO, CHECKBOX, DROP_DOWN
          options: question.choiceQuestion.options?.map(opt => ({
            value: opt.value,
            image: opt.image,
            goToAction: opt.goToAction
          })) || [],
          shuffle: question.choiceQuestion.shuffle || false
        };
      } else if (question.textQuestion) {
        questionData.questionDetails = {
          paragraph: question.textQuestion.paragraph || false
        };
      } else if (question.scaleQuestion) {
        questionData.questionDetails = {
          low: question.scaleQuestion.low,
          high: question.scaleQuestion.high,
          lowLabel: question.scaleQuestion.lowLabel,
          highLabel: question.scaleQuestion.highLabel
        };
      }

      // Check if question has grading (for quiz mode)
      if (question.grading) {
        questionData.points = question.grading.pointValue || 0;
        questionData.correctAnswer = question.grading.correctAnswers;
        questionData.feedback = question.grading.feedback;
      }

      return questionData;
    }).filter(Boolean) || [];

    return NextResponse.json({
      success: true,
      formData: {
        formId: formData.formId,
        title: formData.info?.title || '',
        description: formData.info?.description || '',
        documentTitle: formData.info?.documentTitle || formData.info?.title || '',
        questions,
        settings: formData.settings,
        isQuiz: formData.settings?.quizSettings?.isQuiz || false,
        totalPoints: questions.reduce((sum, q) => sum + (q.points || 0), 0)
      }
    });

  } catch (error) {
    console.error('Error fetching form details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}