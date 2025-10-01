import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { googleApiFetch } from '@/lib/google-auth';

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
    let accessToken = searchParams.get('access_token');
    let expiresAt = searchParams.get('expires_at') ? parseInt(searchParams.get('expires_at')) : null;
    const pageToken = searchParams.get('pageToken');
    const searchQuery = searchParams.get('q') || '';

    // If no access token provided, try to get it from Clerk
    if (!accessToken) {
      try {
        // Call our google-token endpoint to check if user has Google connected
        const tokenResponse = await fetch(new URL('/api/auth/google-token', request.url).href, {
          headers: {
            cookie: request.headers.get('cookie') || '',
          },
        });
        const tokenData = await tokenResponse.json();
        
        if (tokenData.success && tokenData.accessToken) {
          accessToken = tokenData.accessToken;
          expiresAt = tokenData.expiresAt;
        }
      } catch (error) {
        console.log('Could not get token from Clerk:', error.message);
      }
    }

    // If still no access token, return empty forms with message
    if (!accessToken) {
      return NextResponse.json({
        success: true,
        forms: [],
        nextPageToken: null,
        totalForms: 0,
        message: 'No Google access token available. Please provide a token to fetch your forms.'
      });
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

    // Fetch forms from Google Drive with automatic token refresh
    let response;
    try {
      response = await googleApiFetch(
        driveApiUrl.toString(),
        {},
        userId,
        accessToken,
        expiresAt
      );
    } catch (error) {
      console.error('Error calling Google API:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch Google Forms',
        message: error.message,
        forms: []
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Google Drive API error:', errorData);
      
      if (response.status === 401) {
        return NextResponse.json({
          success: false,
          error: 'Invalid or expired access token',
          message: 'The provided access token is invalid or expired. Please provide a valid token.',
          forms: []
        });
      }
      
      return NextResponse.json({
        success: false,
        error: errorData.error?.message || 'Failed to fetch Google Forms',
        forms: []
      });
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

    const result = {
      success: true,
      forms,
      nextPageToken: data.nextPageToken || null,
      totalForms: forms.length
    };

    // Include new token info if it was refreshed
    if (response.newAccessToken) {
      result.newAccessToken = response.newAccessToken;
      result.newExpiresAt = response.newExpiresAt;
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error listing Google Forms:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      forms: []
    });
  }
}