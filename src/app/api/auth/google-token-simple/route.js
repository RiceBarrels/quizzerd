import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Simplified endpoint that returns demo token for testing
// In production, implement full OAuth flow
export async function GET(request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // For demo/development: Return a mock token
    // This allows testing the UI without full OAuth setup
    return NextResponse.json({
      success: true,
      accessToken: 'demo_access_token_' + Date.now(),
      isDemo: true,
      message: 'Demo mode active. Configure Google OAuth in production.',
      provider: 'demo',
      expiresIn: 3600
    });

  } catch (error) {
    console.error('Error in google-token-simple:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}