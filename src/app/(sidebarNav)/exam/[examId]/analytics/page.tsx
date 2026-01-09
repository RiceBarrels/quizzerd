'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Loader2, ArrowLeft, Users, Trophy, Clock, BarChart3,
    CheckCircle2, XCircle, AlertTriangle, TrendingUp, TrendingDown,
    Eye, Download, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PageParams {
    examId: string;
}

interface ExamData {
    exam_id: string;
    exam_name: string;
    creator_id: string;
    total_points: number;
    passing_score: number;
    items: any[];
}

interface AttemptData {
    attempt_id: string;
    student_id: string;
    attempt_number: number;
    status: string;
    score: number | null;
    percentage: number | null;
    passed: boolean | null;
    time_spent_seconds: number | null;
    start_time: string;
    end_time: string | null;
    submitted_at: string | null;
    responses: Record<string, any>;
    graded_at: string | null;
    created_at: string;
}

interface ViolationData {
    violation_id: string;
    student_id: string;
    attempt_id: string;
    violation_type: string;
    timestamp: string;
    details: Record<string, any>;
}

interface QuestionStats {
    question_id: string;
    question_text: string;
    question_type: string;
    points: number;
    correct_count: number;
    incorrect_count: number;
    unanswered_count: number;
    total_attempts: number;
    success_rate: number;
}

export default function ExamAnalyticsPage({ params }: { params: Promise<PageParams> }) {
    const router = useRouter();
    const { user, isLoaded } = useUser();
    const { examId } = use(params);

    const [loading, setLoading] = useState(true);
    const [examData, setExamData] = useState<ExamData | null>(null);
    const [attempts, setAttempts] = useState<AttemptData[]>([]);
    const [violations, setViolations] = useState<ViolationData[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (isLoaded && user) {
            fetchData();
        }
    }, [examId, isLoaded, user]);

    const fetchData = async () => {
        try {
            // Fetch exam data
            const examRes = await fetch(`/api/exams/get?examId=${examId}`);
            const examResult = await examRes.json();

            if (!examResult.success) {
                toast.error('Failed to load exam');
                router.push('/exam');
                return;
            }

            // Check if user is the creator
            if (examResult.data.creator_id !== user?.id) {
                toast.error('You do not have permission to view analytics');
                router.push('/exam');
                return;
            }

            setExamData(examResult.data);

            // Fetch attempts
            const attemptsRes = await fetch(`/api/exams/attempts/list?examId=${examId}`);
            const attemptsResult = await attemptsRes.json();
            if (attemptsResult.success) {
                setAttempts(attemptsResult.attempts || []);
            }

            // Fetch violations
            const violationsRes = await fetch(`/api/exams/log-violation?examId=${examId}`);
            const violationsResult = await violationsRes.json();
            if (violationsResult.success) {
                setViolations(violationsResult.data || []);
            }

        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    // Calculate statistics
    const submittedAttempts = attempts.filter(a => a.status === 'submitted' || a.status === 'graded');
    const gradedAttempts = attempts.filter(a => a.status === 'graded' && a.score !== null);

    const totalSubmissions = submittedAttempts.length;
    const averageScore = gradedAttempts.length > 0
        ? gradedAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / gradedAttempts.length
        : 0;
    const passRate = gradedAttempts.length > 0
        ? (gradedAttempts.filter(a => a.passed).length / gradedAttempts.length) * 100
        : 0;
    const averageTime = submittedAttempts.length > 0
        ? submittedAttempts.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0) / submittedAttempts.length
        : 0;

    // Calculate question statistics
    const questionStats: QuestionStats[] = examData?.items
        .filter(item => item.question_type !== 'section_header' && item.question_type !== 'page_break')
        .map(item => {
            const responses = submittedAttempts.map(a => a.responses?.[item.question_id]);
            const answered = responses.filter(r => r !== undefined && r !== null && r !== '').length;
            const unanswered = responses.length - answered;

            // Calculate correct answers for auto-gradable types
            let correct = 0;
            let incorrect = 0;

            if (['multiple_choice', 'true_false', 'dropdown'].includes(item.question_type) && item.correct_answer !== undefined) {
                responses.forEach(r => {
                    if (r === item.correct_answer) correct++;
                    else if (r !== undefined && r !== null && r !== '') incorrect++;
                });
            } else if (item.question_type === 'multiple_select' && Array.isArray(item.correct_answer)) {
                responses.forEach(r => {
                    if (Array.isArray(r)) {
                        const correctSet = new Set(item.correct_answer);
                        const responseSet = new Set(r);
                        if (correctSet.size === responseSet.size && [...correctSet].every(v => responseSet.has(v))) {
                            correct++;
                        } else if (r.length > 0) {
                            incorrect++;
                        }
                    }
                });
            } else {
                // For non-auto-gradable, just count as answered
                correct = answered;
            }

            return {
                question_id: item.question_id,
                question_text: item.question_text,
                question_type: item.question_type,
                points: item.points,
                correct_count: correct,
                incorrect_count: incorrect,
                unanswered_count: unanswered,
                total_attempts: submittedAttempts.length,
                success_rate: submittedAttempts.length > 0 ? (correct / submittedAttempts.length) * 100 : 0
            };
        }) || [];

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}m ${secs}s`;
    };

    const formatDate = (dateStr: string): string => {
        return new Date(dateStr).toLocaleString();
    };

    const stripHtml = (html: string): string => {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    if (loading || !isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!examData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <h1 className="text-2xl font-bold">Exam Not Found</h1>
                <Button onClick={() => router.push('/exam')}>Go Back</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                onClick={() => router.push(`/exam/${examId}/edit`)}
                                className="gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Editor
                            </Button>
                            <Separator orientation="vertical" className="h-6" />
                            <h1 className="font-semibold text-lg">{examData.exam_name}</h1>
                            <Badge variant="secondary">Analytics</Badge>
                        </div>
                        <Button
                            variant="outline"
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="gap-2"
                        >
                            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                            Refresh
                        </Button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalSubmissions}</div>
                            <p className="text-xs text-muted-foreground">
                                {attempts.filter(a => a.status === 'in_progress').length} in progress
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{averageScore.toFixed(1)}%</div>
                            <p className="text-xs text-muted-foreground">
                                of {examData.total_points} total points
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                            <Trophy className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{passRate.toFixed(1)}%</div>
                            <p className="text-xs text-muted-foreground">
                                {gradedAttempts.filter(a => a.passed).length} of {gradedAttempts.length} passed
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatTime(averageTime)}</div>
                            <p className="text-xs text-muted-foreground">
                                average completion time
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Violations Alert */}
                {violations.length > 0 && (
                    <Card className="mb-8 border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                                <AlertTriangle className="h-5 w-5" />
                                Cheating Violations Detected
                            </CardTitle>
                            <CardDescription>
                                {violations.length} violation(s) detected across all attempts
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {['console', 'visibility', 'translation', 'location'].map(type => {
                                    const count = violations.filter(v => v.violation_type === type).length;
                                    if (count === 0) return null;
                                    return (
                                        <Badge key={type} variant="outline" className="bg-orange-100 dark:bg-orange-900/30">
                                            {type}: {count}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Student Results Table */}
                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Student Results</CardTitle>
                        <CardDescription>
                            Individual submission details
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {submittedAttempts.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No submissions yet
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student ID</TableHead>
                                        <TableHead>Attempt</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Score</TableHead>
                                        <TableHead>Time Spent</TableHead>
                                        <TableHead>Submitted</TableHead>
                                        <TableHead>Violations</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {submittedAttempts.map(attempt => {
                                        const attemptViolations = violations.filter(v => v.attempt_id === attempt.attempt_id);
                                        return (
                                            <TableRow key={attempt.attempt_id}>
                                                <TableCell className="font-mono text-sm">
                                                    {attempt.student_id.slice(0, 12)}...
                                                </TableCell>
                                                <TableCell>#{attempt.attempt_number}</TableCell>
                                                <TableCell>
                                                    <Badge variant={attempt.status === 'graded' ? 'default' : 'secondary'}>
                                                        {attempt.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {attempt.score !== null ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn(
                                                                "font-semibold",
                                                                attempt.passed ? "text-green-600" : "text-red-600"
                                                            )}>
                                                                {attempt.percentage?.toFixed(1)}%
                                                            </span>
                                                            {attempt.passed ? (
                                                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                            ) : (
                                                                <XCircle className="h-4 w-4 text-red-600" />
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">Pending</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {attempt.time_spent_seconds
                                                        ? formatTime(attempt.time_spent_seconds)
                                                        : '-'}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {attempt.submitted_at
                                                        ? formatDate(attempt.submitted_at)
                                                        : '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {attemptViolations.length > 0 ? (
                                                        <Badge variant="destructive">
                                                            {attemptViolations.length}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-green-600">
                                                            None
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {/* Question Performance */}
                <Card>
                    <CardHeader>
                        <CardTitle>Question Performance</CardTitle>
                        <CardDescription>
                            Success rate for each question
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {questionStats.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No questions to analyze
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {questionStats.map((stat, index) => (
                                    <div key={stat.question_id} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">Q{index + 1}</Badge>
                                                <span className="text-sm font-medium truncate max-w-md">
                                                    {typeof stat.question_text === 'string'
                                                        ? stripHtml(stat.question_text).slice(0, 50)
                                                        : 'Question'}
                                                    {stripHtml(stat.question_text).length > 50 && '...'}
                                                </span>
                                                <Badge variant="secondary" className="text-xs">
                                                    {stat.question_type.replace('_', ' ')}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-green-600">
                                                    {stat.correct_count} correct
                                                </span>
                                                <span className="text-red-600">
                                                    {stat.incorrect_count} incorrect
                                                </span>
                                                <span className="font-semibold">
                                                    {stat.success_rate.toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                        <Progress
                                            value={stat.success_rate}
                                            className={cn(
                                                "h-2",
                                                stat.success_rate >= 70 ? "[&>div]:bg-green-500" :
                                                stat.success_rate >= 40 ? "[&>div]:bg-yellow-500" :
                                                "[&>div]:bg-red-500"
                                            )}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
