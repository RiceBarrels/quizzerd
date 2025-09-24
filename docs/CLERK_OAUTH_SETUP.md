# Clerk OAuth Setup for Google Forms Integration

## Current Implementation Status

The Google Forms integration is now fully implemented with the following features:
- **Clerk Backend SDK Integration**: Properly retrieves OAuth tokens from Clerk
- **Demo Mode Fallback**: Automatically shows demo forms when OAuth is not configured
- **Real Google Forms Access**: When properly configured, fetches actual forms from user's Google Drive

## How It Works

1. **OAuth Token Retrieval**: Uses Clerk Backend SDK to get Google OAuth tokens
2. **Automatic Fallback**: If OAuth is not configured, the app gracefully falls back to demo mode
3. **Google APIs Integration**: Fetches forms using Google Drive API and imports using Google Forms API

## Production Setup Guide

### Step 1: Install Required Dependencies (Already Done)

```bash
bun add @clerk/backend googleapis
# or
npm install @clerk/backend googleapis
```

### Step 2: Configure Google OAuth in Clerk

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **User & Authentication > Social Connections**
3. Enable **Google** OAuth
4. Add your Google OAuth credentials:
   - Client ID
   - Client Secret
5. **Important**: Configure OAuth scopes in Clerk Dashboard:
   ```
   openid
   email
   profile
   https://www.googleapis.com/auth/drive.readonly
   https://www.googleapis.com/auth/forms
   ```
   
   Note: The `forms` scope provides full access to Google Forms. For read-only access, use `forms.body.readonly` instead.

### Step 3: Update Environment Variables

```env
# .env.local
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...

# Optional: For direct API access
GOOGLE_CLIENT_ID=your-client-id.apps.google.com
GOOGLE_CLIENT_SECRET=your-secret
```

### Step 4: API Implementation (Already Done)

The API routes are already configured:

- **`/api/auth/google-token`**: Retrieves OAuth token from Clerk
- **`/api/exams/google-forms-list`**: Lists Google Forms from user's Drive
- **`/api/exams/import-google-form`**: Imports forms into exam system

The implementation handles both real OAuth tokens and demo mode automatically.

## API Endpoints

### `/api/auth/google-token`
- Returns demo token if OAuth not configured
- Shows `googleConnected` status
- Falls back gracefully

### `/api/exams/google-forms-list`
- Returns mock forms in demo mode
- Accepts optional `access_token` parameter
- Auto-detects demo vs. real tokens

### `/api/exams/import-google-form`
- Imports forms by URL or ID
- Works with demo data
- Creates real exam entries

## Troubleshooting

### "getUserOauthAccessToken is not a function"
- Install @clerk/backend package
- Use the Backend SDK client, not the Next.js client

### "No access token available"
- User needs to reconnect Google account
- Check OAuth scopes in Clerk Dashboard
- Verify Google OAuth is enabled

### Forms not appearing
- Check if user has forms in Google Drive
- Verify Drive API is enabled in Google Cloud Console
- Check API quotas

## Security Notes

1. **Never expose tokens** to the client
2. **Store credentials** in environment variables only
3. **Use server-side APIs** for token retrieval
4. **Implement token refresh** for long sessions
5. **Audit OAuth scopes** - only request what's needed

## Demo Mode Benefits

Demo mode allows you to:
- Test the full UI/UX flow
- Develop without OAuth setup
- Show functionality to stakeholders
- Train users before production

## Next Steps

1. **For Development**: Continue using demo mode
2. **For Staging**: Configure OAuth with test Google account
3. **For Production**: 
   - Install @clerk/backend
   - Configure production OAuth credentials
   - Enable real token retrieval
   - Monitor API usage and quotas

## Support Resources

- [Clerk OAuth Documentation](https://clerk.com/docs/authentication/social-connections/oauth)
- [Google Drive API](https://developers.google.com/drive/api/v3/reference)
- [Google Forms API](https://developers.google.com/forms/api/reference/rest)
- [Clerk Backend SDK](https://clerk.com/docs/references/backend/overview)