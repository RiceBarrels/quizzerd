# Google Forms Import Setup Guide

This guide explains how to configure Google OAuth in Clerk to enable Google Forms import functionality.

## Prerequisites

1. A Clerk account with your application configured
2. A Google Cloud Console project
3. Admin access to both Clerk and Google Cloud Console

## Step 1: Configure Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Google Drive API
   - Google Forms API (if available in your region)

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs from Clerk (found in Clerk Dashboard)

5. Copy your Client ID and Client Secret

## Step 2: Configure Clerk OAuth

1. Go to your [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to "User & Authentication" > "Social Connections"
3. Find and enable "Google"
4. Add your Google Client ID and Client Secret
5. Configure the required scopes:
   ```
   https://www.googleapis.com/auth/drive.readonly
   https://www.googleapis.com/auth/forms.body.readonly
   https://www.googleapis.com/auth/userinfo.email
   https://www.googleapis.com/auth/userinfo.profile
   ```

## Step 3: Update Environment Variables

Add these to your `.env.local`:

```bash
# Clerk Configuration (you should already have these)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Optional: For direct Google API access
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

## Step 4: Test the Integration

1. Sign in to your application
2. Go to the Exam page
3. Click "Import from Google Forms"
4. Choose "Browse My Forms"
5. Click "Sign in with Google"
6. Authorize the requested permissions
7. Your Google Forms should now be listed

## Features Available

### With Basic Setup (Drive API only)
- List Google Forms from user's Drive
- Basic form metadata (name, modified date, owner)
- Import creates a template exam with sample questions

### With Full Setup (Drive + Forms API)
- List Google Forms with full details
- Import actual questions from forms
- Support for various question types:
  - Multiple choice
  - Checkboxes
  - Short answer
  - Paragraph
  - Linear scale
  - Date/Time

## Troubleshooting

### "Google account not connected" error
- User needs to connect Google account in Clerk UserProfile
- Or implement OAuth flow in your app

### "Failed to fetch Google Forms" error
- Check if Google Drive API is enabled
- Verify OAuth scopes are correctly configured
- Check access token expiration

### Forms not showing up
- Ensure user has Google Forms in their Drive
- Check if forms are in trash (trashed forms are filtered out)
- Verify Drive API quota hasn't been exceeded

### Cannot read form questions
- Google Forms API might not be available in your region
- Check if Forms API is enabled in Google Cloud Console
- Verify the oauth_google token has forms.body.readonly scope

## Security Notes

1. Access tokens are short-lived (typically 1 hour)
2. Clerk handles token refresh automatically
3. Users can revoke access anytime from Google Account settings
4. Store sensitive credentials only in environment variables
5. Never expose access tokens to the client side

## Demo Mode

If Google OAuth is not configured, the application falls back to demo mode:
- Shows sample forms for testing
- Imports create example exams with mock questions
- Useful for development and testing

## Support

For issues with:
- Clerk OAuth: Check [Clerk Documentation](https://clerk.com/docs)
- Google APIs: See [Google Drive API docs](https://developers.google.com/drive)
- This implementation: Check the API endpoints in `/src/app/api/exams/`