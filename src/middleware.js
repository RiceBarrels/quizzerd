import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/profile(.*)',
  '/home(.*)',
  '/class(.*)',
  '/exam(.*)',
  '/todos(.*)',
  '/calender(.*)',
  '/api/user(.*)',
  '/api/classes(.*)',
  '/api/exams(.*)',
]);

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/',
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