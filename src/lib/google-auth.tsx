import { createClerkClient } from '@clerk/backend';

/**
 * Check if a token is expired or about to expire
 * @param {number} expiresAt - Token expiration timestamp in milliseconds
 * @param {number} bufferMinutes - Buffer time in minutes before actual expiration (default 5)
 * @returns {boolean} - True if token is expired or about to expire
 */
export function isTokenExpired(expiresAt: number | null, bufferMinutes: number = 5): boolean {
  if (!expiresAt) return true;
  
  const now = Date.now();
  const bufferTime = bufferMinutes * 60 * 1000;
  return now >= (expiresAt - bufferTime);
}

/**
 * Get a valid Google OAuth access token, refreshing if necessary
 * @param {string} userId - The user ID from Clerk auth
 * @param {string} currentToken - The current token (optional)
 * @param {number} expiresAt - Token expiration timestamp (optional)
 * @returns {Promise<{success: boolean, accessToken: string|null, expiresAt: number|null, error?: string}>}
 */
export async function getValidGoogleToken(userId: string, currentToken: string | null = null, expiresAt: number | null = null) {
  try {
    // Check if current token is still valid
    if (currentToken && expiresAt && !isTokenExpired(expiresAt)) {
      return {
        success: true,
        accessToken: currentToken,
        expiresAt: expiresAt,
        cached: true
      };
    }

    // Get fresh token from Clerk
    if (!process.env.CLERK_SECRET_KEY) {
      console.error('CLERK_SECRET_KEY is not set');
      return {
        success: false,
        accessToken: null,
        error: 'Server configuration error: CLERK_SECRET_KEY not set'
      };
    }

    const clerk = createClerkClient({ 
      secretKey: process.env.CLERK_SECRET_KEY 
    });

    // Try to get OAuth access token
    let tokens;
    try {
      // Try without oauth_ prefix first (new format)
      tokens = await clerk.users.getUserOauthAccessToken(userId, 'google');
    } catch (error) {
      // Fallback to oauth_google if google doesn't work
      try {
        tokens = await clerk.users.getUserOauthAccessToken(userId, 'oauth_google');
      } catch (secondError) {
        console.error('Failed to get OAuth token:', secondError instanceof Error ? secondError.message : 'Unknown error');
        return {
          success: false,
          accessToken: null,
          error: 'Failed to get OAuth token from Clerk'
        };
      }
    }

    // Extract token from response
    const tokenList = tokens?.data || tokens;
    if (tokenList && tokenList.length > 0 && tokenList[0].token) {
      const tokenData = tokenList[0];
      return {
        success: true,
        accessToken: tokenData.token,
        expiresAt: tokenData.expiresAt,
        refreshed: true
      };
    }

    return {
      success: false,
      accessToken: null,
      error: 'No OAuth tokens available from Clerk'
    };

  } catch (error) {
    console.error('Error getting valid Google token:', error);
    return {
      success: false,
      accessToken: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Make an authenticated request to Google API with automatic token refresh
 * @param {string} url - The Google API URL
 * @param {object} options - Fetch options
 * @param {string} userId - The user ID from Clerk auth
 * @param {string} accessToken - The current access token
 * @param {number} expiresAt - Token expiration timestamp
 * @returns {Promise<Response>}
 */
export async function googleApiFetch(url: string, options: RequestInit = {}, userId: string, accessToken: string | null, expiresAt: number | null) {
  // Get a valid token (refresh if needed)
  const tokenResult = await getValidGoogleToken(userId, accessToken, expiresAt);
  
  if (!tokenResult.success || !tokenResult.accessToken) {
    throw new Error(tokenResult.error || 'Failed to get valid access token');
  }

  // Make the API request with the valid token
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${tokenResult.accessToken}`,
      'Accept': 'application/json',
    },
  });

  // If we get a 401, try one more time with a fresh token
  if (response.status === 401) {
    console.log('Got 401, attempting to refresh token and retry...');
    const freshTokenResult = await getValidGoogleToken(userId, null, null); // Force refresh
    
    if (freshTokenResult.success && freshTokenResult.accessToken) {
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${freshTokenResult.accessToken}`,
          'Accept': 'application/json',
        },
      });
      
      // Attach token info to response for client to cache
      (retryResponse as any).newAccessToken = freshTokenResult.accessToken;
      (retryResponse as any).newExpiresAt = freshTokenResult.expiresAt;
      return retryResponse;
    }
  }

  // Attach token info if it was refreshed
  if (tokenResult.refreshed) {
    (response as any).newAccessToken = tokenResult.accessToken;
    (response as any).newExpiresAt = tokenResult.expiresAt;
  }

  return response;
}