import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/profile(.*)',
  '/home(.*)',
  '/class(.*)',
  '/todos(.*)',
  '/calender(.*)',
  '/exam/(.*)/edit(.*)',
  '/exam/(.*)/response(.*)',
  '/api/user(.*)',
  '/api/classes(.*)',
  '/api/exams/create(.*)',
  '/api/exams/update(.*)',
  '/api/exams/delete(.*)',
  '/api/exams/publish(.*)',
  '/api/exams/import-google-form(.*)',
  '/api/exams/google-forms-list(.*)',
  '/api/exams/log-violation(.*)',
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

export default clerkMiddleware(async (auth, req) => {
  // Protect all routes that require authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
  
  // Redirect authenticated users away from auth pages
  const { userId } = await auth();
  const path = req.nextUrl.pathname;
  
  if (userId && (path === '/sign-in' || path === '/sign-up')) {
    const homeUrl = new URL('/home', req.url);
    return Response.redirect(homeUrl);
  }
  
  // // Redirect unauthenticated users to sign-in from root
  // if (!userId && path === '/') {
  //   const signInUrl = new URL('/sign-in', req.url);
  //   return Response.redirect(signInUrl);
  // }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};