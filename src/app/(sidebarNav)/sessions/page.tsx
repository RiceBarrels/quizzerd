'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

/**
 * @deprecated This page is deprecated. Sessions have been replaced by Classes.
 * This page will redirect users to the new Classes page.
 */
export default function SessionsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to classes page after a short delay
    const timer = setTimeout(() => {
      router.replace('/classes');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Sessions is now Classes</CardTitle>
          <CardDescription className="space-y-2">
            <p>
              We've upgraded Sessions to a new Classes system, similar to Google Classroom.
            </p>
            <p className="text-sm">
              Redirecting you automatically...
            </p>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Redirecting to Classes...</span>
          </div>
          <Button asChild className="w-full">
            <Link href="/classes">
              Go to Classes Now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
