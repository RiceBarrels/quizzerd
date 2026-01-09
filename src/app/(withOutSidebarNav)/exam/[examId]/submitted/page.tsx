'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, Home, FileText } from 'lucide-react';

interface PageParams {
    examId: string;
}

export default function ExamSubmittedPage({ params }: { params: Promise<PageParams> }) {
    const router = useRouter();
    const { examId } = use(params);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/20 p-4">
            <Card className="max-w-md w-full text-center shadow-lg">
                <CardHeader className="space-y-4">
                    <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                        <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                    </div>
                    <CardTitle className="text-2xl">Exam Submitted!</CardTitle>
                    <CardDescription className="text-base">
                        Your exam has been successfully submitted. Your instructor will review your responses.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        You will receive your results once your instructor has graded your exam.
                    </p>

                    <div className="flex flex-col gap-3 pt-4">
                        <Button
                            onClick={() => router.push('/')}
                            className="w-full"
                        >
                            <Home className="h-4 w-4 mr-2" />
                            Go to Home
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push('/exam')}
                            className="w-full"
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            View All Exams
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
