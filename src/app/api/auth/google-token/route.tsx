import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/backend';

// Endpoint to get Google OAuth token from Clerk
export async function GET() {
  try {
    const { userId } = await auth();
    
    console.log("userId", userId);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the current user from Clerk
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find Google OAuth account
    const googleAccount = user.externalAccounts?.find(
      account => account.provider === 'oauth_google' || account.provider === 'google'
    );

    if (!googleAccount) {
      return NextResponse.json({
        success: false,
        message: 'Google account not connected',
        accessToken: null
      });
    }

    // Try to get the OAuth token using Clerk Backend SDK
    try {
      if (!process.env.CLERK_SECRET_KEY) {
        console.error('CLERK_SECRET_KEY is not set');
        return NextResponse.json({
          success: false,
          message: 'Server configuration error: CLERK_SECRET_KEY not set',
          accessToken: null
        });
      }

      const clerk = createClerkClient({ 
        secretKey: process.env.CLERK_SECRET_KEY 
      });
      
      // Try to get OAuth access token
      let tokens;
      try {
        // Try without oauth_ prefix first (new format)
        console.log('Attempting to get OAuth token for user:', userId);
        tokens = await clerk.users.getUserOauthAccessToken(
          userId,
          'google'
        );
        console.log('Token retrieval successful with "google" provider');
      } catch (error) {
        console.log('Failed with "google", trying "oauth_google"...', error instanceof Error ? error.message : String(error));
        // Fallback to oauth_google if google doesn't work
        try {
          tokens = await clerk.users.getUserOauthAccessToken(
            userId,
            'oauth_google'
          );
          console.log('Token retrieval successful with "oauth_google" provider');
        } catch (secondError) {
          console.error('Both token retrieval methods failed:', secondError instanceof Error ? secondError.message : String(secondError));
          tokens = null;
        }
      }
      
      console.log('Tokens result:', tokens);

      // Handle the response structure from Clerk Backend SDK
      // It returns { data: [...], totalCount: n }
      const tokenList: any = tokens?.data || tokens;
      
      if (tokenList && Array.isArray(tokenList) && tokenList.length > 0 && tokenList[0].token) {
        const tokenData = tokenList[0];
        const accessToken = tokenData.token;
        const expiresAt = tokenData.expiresAt;
        
        // Mask the access token for logging
        const maskedToken = accessToken ? `${accessToken.substring(0, 10)}...${accessToken.substring(accessToken.length - 10)}` : 'null';
        console.log('Successfully retrieved OAuth token (masked):', maskedToken);
        console.log('Token expires at:', new Date(expiresAt).toISOString());
        console.log('Token scopes:', tokenData.scopes);
        
        return NextResponse.json({
          success: true,
          accessToken,
          expiresAt,
          googleConnected: true,
          email: googleAccount.emailAddress,
          message: 'Google OAuth token retrieved successfully'
        });
      } else {
        console.log('No OAuth tokens available from Clerk');
        // Return success false but with helpful information
        return NextResponse.json({
          success: false,
          message: 'Google account is connected but OAuth token is not available. This usually means the account needs to be reconnected with the proper scopes (Drive and Forms API).',
          accessToken: null,
          googleConnected: true,
          email: googleAccount.emailAddress,
          hint: 'To fix this: 1) Disconnect Google in your Clerk profile, 2) Reconnect and ensure Drive/Forms scopes are selected'
        });
      }
    } catch (tokenError) {
      console.error('Error retrieving OAuth token:', tokenError);
      return NextResponse.json({
        success: false,
        message: 'Failed to retrieve OAuth token. User may need to reconnect Google account.',
        accessToken: null,
        googleConnected: true,
        email: googleAccount.emailAddress,
        error: tokenError instanceof Error ? tokenError.message : String(tokenError)
      });
    }

  } catch (error) {
    console.error('Error in auth check:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}