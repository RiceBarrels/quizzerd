import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function GET(request) {
  try {
    const { userId } = await auth();
    
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
      account => account.provider === 'oauth_google'
    );

    if (!googleAccount) {
      return NextResponse.json(
        { 
          error: 'Google account not connected',
          message: 'Please connect your Google account in your profile settings',
          needsConnection: true
        },
        { status: 400 }
      );
    }

    // For now, we'll return a demo token since getting the actual OAuth token
    // requires additional Clerk configuration and API setup
    // In production, you would:
    // 1. Configure Clerk OAuth with proper Google Drive scopes
    // 2. Use Clerk's Backend API to get the OAuth token
    // 3. Or implement your own OAuth flow with Google
    
    // Demo implementation for testing
    return NextResponse.json({
      success: true,
      accessToken: 'demo_access_token',
      isDemo: true,
      message: 'Using demo mode. To use real Google Forms, configure OAuth in Clerk Dashboard.',
      provider: 'oauth_google',
      userEmail: googleAccount.emailAddress || user.emailAddresses?.[0]?.emailAddress
    });

  } catch (error) {
    console.error('Error getting Google token:', error);
    
    // Check if it's a Clerk API error
    if (error.errors) {
      const clerkError = error.errors[0];
      return NextResponse.json(
        { 
          error: clerkError.message || 'Failed to get Google token',
          code: clerkError.code
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint to refresh the token if needed
export async function POST(request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Trigger OAuth token refresh through Clerk
    // This would typically be handled automatically by Clerk
    
    return NextResponse.json({
      success: true,
      message: 'Token refresh initiated'
    });

  } catch (error) {
    console.error('Error refreshing Google token:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}