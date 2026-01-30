import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { rateLimit, getClientIdentifier, getRateLimitConfig, rateLimitHeaders } from './lib/rate-limit';

const isProtectedRoute = createRouteMatcher([
  '/profile(.*)',
  '/todos(.*)',
  '/calender(.*)',
  '/sessions(.*)',
  '/exam/(.*)/edit(.*)',
  '/exam/(.*)/response(.*)',
  '/exam/(.*)/analytics(.*)',
  '/api/user(.*)',
  '/api/exams/create(.*)',
  '/api/exams/update(.*)',
  '/api/exams/delete(.*)',
  '/api/exams/publish(.*)',
  '/api/exams/import-google-form(.*)',
  '/api/exams/google-forms-list(.*)',
  '/api/exams/log-violation(.*)',
  '/api/exam(.*)',
]);

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/',
  '/api/exams/public(.*)',
  '/api/exams/get(.*)',
  '/exam/(.*)/public(.*)',
  '/exam/(.*)/preview(.*)',
  '/exam(.*)',
]);

const isApiRoute = createRouteMatcher([
  '/api/(.*)',
]);

const isRateLimitExempt = createRouteMatcher([
  '/api/webhooks/(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname;

  // Apply rate limiting to API routes (except webhooks)
  if (isApiRoute(req) && !isRateLimitExempt(req)) {
    const identifier = getClientIdentifier(req);
    const config = getRateLimitConfig(path);
    const result = rateLimit(`${identifier}:${path}`, config);

    if (!result.success) {
      const headers = rateLimitHeaders(result);
      headers.set('Content-Type', 'application/json');

      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests',
          message: 'You have exceeded the rate limit. Please try again later.',
          retryAfter: result.reset - Math.floor(Date.now() / 1000),
        }),
        {
          status: 429,
          headers,
        }
      );
    }
  }

  // Protect all routes that require authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Redirect authenticated users away from auth pages
  const { userId } = await auth();

  if (userId && (path === '/sign-in' || path === '/sign-up')) {
    const dashboardUrl = new URL('/exam', req.url);
    return Response.redirect(dashboardUrl);
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};

