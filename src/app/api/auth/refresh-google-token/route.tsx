import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { createClerkClient } from '@clerk/backend';

// Endpoint to refresh Google OAuth token from Clerk
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
    const { currentToken } = body;

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

    // Create Clerk client
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
    
    // Get fresh OAuth access token from Clerk
    // Clerk automatically handles token refresh when calling this method
    let tokens;
    try {
      // Try without oauth_ prefix first (new format)
      console.log('Attempting to refresh OAuth token for user:', userId);
      tokens = await clerk.users.getUserOauthAccessToken(
        userId,
        'google'
      );
      console.log('Token refresh successful with "google" provider');
    } catch (error) {
      console.log('Failed with "google", trying "oauth_google"...', error.message);
      // Fallback to oauth_google if google doesn't work
      try {
        tokens = await clerk.users.getUserOauthAccessToken(
          userId,
          'oauth_google'
        );
        console.log('Token refresh successful with "oauth_google" provider');
      } catch (secondError) {
        console.error('Both token refresh methods failed:', secondError.message);
        return NextResponse.json({
          success: false,
          message: 'Failed to refresh OAuth token',
          error: secondError.message
        }, { status: 500 });
      }
    }

    // Handle the response structure from Clerk Backend SDK
    const tokenList = tokens?.data || tokens;
    
    if (tokenList && tokenList.length > 0 && tokenList[0].token) {
      const tokenData = tokenList[0];
      const accessToken = tokenData.token;
      const expiresAt = tokenData.expiresAt;
      
      // Check if this is actually a new token
      const isNewToken = currentToken !== accessToken;
      
      // Mask the access token for logging
      const maskedToken = accessToken ? `${accessToken.substring(0, 10)}...${accessToken.substring(accessToken.length - 10)}` : 'null';
      console.log('OAuth token retrieved (masked):', maskedToken);
      console.log('Token expires at:', new Date(expiresAt).toISOString());
      console.log('Is new token:', isNewToken);
      
      return NextResponse.json({
        success: true,
        accessToken,
        expiresAt,
        isNewToken,
        googleConnected: true,
        email: googleAccount.emailAddress,
        message: isNewToken ? 'Google OAuth token refreshed successfully' : 'Token is still valid'
      });
    } else {
      console.log('No OAuth tokens available from Clerk');
      return NextResponse.json({
        success: false,
        message: 'No OAuth tokens available. User may need to reconnect Google account.',
        accessToken: null,
        googleConnected: true,
        email: googleAccount.emailAddress
      });
    }

  } catch (error) {
    console.error('Error refreshing token:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check token expiration status
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
    const expiresAt = searchParams.get('expiresAt');

    if (!expiresAt) {
      return NextResponse.json({
        success: false,
        message: 'expiresAt parameter is required'
      }, { status: 400 });
    }

    const expirationTime = parseInt(expiresAt);
    const now = Date.now();
    
    // Check if token is expired or will expire in the next 5 minutes
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    const isExpired = now >= expirationTime;
    const willExpireSoon = now >= (expirationTime - bufferTime);

    return NextResponse.json({
      success: true,
      isExpired,
      willExpireSoon,
      expiresAt: expirationTime,
      expiresIn: Math.max(0, expirationTime - now),
      expiresInMinutes: Math.max(0, Math.floor((expirationTime - now) / 60000)),
      message: isExpired 
        ? 'Token is expired' 
        : willExpireSoon 
          ? 'Token will expire soon' 
          : 'Token is valid'
    });

  } catch (error) {
    console.error('Error checking token expiration:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}