'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { SimpleBarChart } from '@/components/ui/simple-bar-chart';
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
    Eye, Download, RefreshCw, AlertCircle, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PageParams {
    examId: string;
}

interface AnalyticsData {
    exam: {
        examId: string;
        examName: string;
        totalPoints: number;
        passingScore: number;
        questionCount: number;
    };
    overview: {
        totalAttempts: number;
        submittedCount: number;
        gradedCount: number;
        inProgressCount: number;
        averageScore: number;
        passRate: number;
        averageTimeSeconds: number;
        uniqueStudents: number;
    };
    scoreDistribution: { range: string; count: number }[];
    questionStats: {
        questionNumber: number;
        questionId: string;
        questionText: string;
        questionType: string;
        points: number;
        stats: {
            correct: number;
            incorrect: number;
            partialCredit: number;
            unanswered: number;
            total: number;
            successRate: number;
            difficulty: 'easy' | 'medium' | 'hard';
        };
    }[];
    problematicQuestions: any[];
    violations: {
        total: number;
        byType: Record<string, number>;
        studentsWithViolations: number;
    };
    sessions: {
        sessionId: string;
        courseName: string;
        studentCount: number;
        status: string;
        attemptCount: number;
    }[];
    activityChart: { date: string; label: string; attempts: number }[];
    attempts: {
        attemptId: string;
        studentId: string;
        attemptNumber: number;
        status: string;
        score: number | null;
        percentage: number | null;
        passed: boolean | null;
        timeSpentSeconds: number | null;
        submittedAt: string | null;
        violationCount: number;
    }[];
}

export default function ExamAnalyticsPage({ params }: { params: Promise<PageParams> }) {
    const router = useRouter();
    const { user, isLoaded } = useUser();
    const { examId } = use(params);

    const [loading, setLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (isLoaded && user) {
            fetchData();
        }
    }, [examId, isLoaded, user]);

    const fetchData = async () => {
        try {
            const response = await fetch(`/api/exams/${examId}/analytics`);
            const result = await response.json();

            if (!result.success) {
                if (response.status === 403) {
                    toast.error('You do not have permission to view analytics');
                } else {
                    toast.error(result.error || 'Failed to load analytics');
                }
                router.push('/exam');
                return;
            }

            setAnalyticsData(result.data);
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

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}m ${secs}s`;
    };

    const formatDate = (dateStr: string): string => {
        return new Date(dateStr).toLocaleString();
    };

    const stripHtml = (html: string): string => {
        if (typeof window === 'undefined') return html;
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    };

    const getDifficultyBadge = (difficulty: 'easy' | 'medium' | 'hard') => {
        switch (difficulty) {
            case 'easy':
                return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Easy</Badge>;
            case 'medium':
                return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Medium</Badge>;
            case 'hard':
                return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Hard</Badge>;
        }
    };

    if (loading || !isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!analyticsData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <h1 className="text-2xl font-bold">Exam Not Found</h1>
                <Button onClick={() => router.push('/exam')}>Go Back</Button>
            </div>
        );
    }

    const { exam, overview, scoreDistribution, questionStats, problematicQuestions, violations, sessions, activityChart, attempts } = analyticsData;

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
                            <h1 className="font-semibold text-lg">{exam.examName}</h1>
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
                            <div className="text-2xl font-bold">{overview.submittedCount}</div>
                            <p className="text-xs text-muted-foreground">
                                {overview.inProgressCount} in progress
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{overview.averageScore}%</div>
                            <p className="text-xs text-muted-foreground">
                                of {exam.totalPoints} total points
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                            <Trophy className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{overview.passRate}%</div>
                            <p className="text-xs text-muted-foreground">
                                {overview.uniqueStudents} unique students
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatTime(overview.averageTimeSeconds)}</div>
                            <p className="text-xs text-muted-foreground">
                                average completion time
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts Row */}
                {(overview.submittedCount > 0 || activityChart.some(d => d.attempts > 0)) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Score Distribution */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Score Distribution</CardTitle>
                                <CardDescription>How students scored on this exam</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SimpleBarChart
                                    data={scoreDistribution.map(d => ({
                                        label: d.range.split('-')[0],
                                        value: d.count
                                    }))}
                                    height={160}
                                />
                            </CardContent>
                        </Card>

                        {/* Activity Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Recent Activity</CardTitle>
                                <CardDescription>Attempts over the last 7 days</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <SimpleBarChart
                                    data={activityChart.map(d => ({
                                        label: d.label,
                                        value: d.attempts
                                    }))}
                                    height={160}
                                />
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Problematic Questions Alert */}
                {problematicQuestions.length > 0 && (
                    <Card className="mb-8 border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                                <HelpCircle className="h-5 w-5" />
                                Questions Needing Attention
                            </CardTitle>
                            <CardDescription>
                                These questions have low success rates and may need review
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {problematicQuestions.map((q: any) => (
                                    <div key={q.questionId} className="flex items-center justify-between p-2 rounded-lg bg-yellow-100/50 dark:bg-yellow-900/20">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">Q{q.questionNumber}</Badge>
                                            <span className="text-sm truncate max-w-xs">
                                                {stripHtml(q.questionText).slice(0, 40)}...
                                            </span>
                                        </div>
                                        <Badge variant="destructive">{q.stats.successRate}% success</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Violations Alert */}
                {violations.total > 0 && (
                    <Card className="mb-8 border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
                                <AlertTriangle className="h-5 w-5" />
                                Cheating Violations Detected
                            </CardTitle>
                            <CardDescription>
                                {violations.total} violation(s) from {violations.studentsWithViolations} student(s)
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(violations.byType).map(([type, count]) => {
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
                        {attempts.length === 0 ? (
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
                                    {attempts.map(attempt => (
                                        <TableRow key={attempt.attemptId}>
                                            <TableCell className="font-mono text-sm">
                                                {attempt.studentId.slice(0, 12)}...
                                            </TableCell>
                                            <TableCell>#{attempt.attemptNumber}</TableCell>
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
                                                {attempt.timeSpentSeconds
                                                    ? formatTime(attempt.timeSpentSeconds)
                                                    : '-'}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {attempt.submittedAt
                                                    ? formatDate(attempt.submittedAt)
                                                    : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {attempt.violationCount > 0 ? (
                                                    <Badge variant="destructive">
                                                        {attempt.violationCount}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-green-600">
                                                        None
                                                    </Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
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
                            Success rate and difficulty for each question
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {questionStats.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No questions to analyze
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {questionStats.map((stat) => (
                                    <div key={stat.questionId} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">Q{stat.questionNumber}</Badge>
                                                <span className="text-sm font-medium truncate max-w-md">
                                                    {typeof stat.questionText === 'string'
                                                        ? stripHtml(stat.questionText).slice(0, 50)
                                                        : 'Question'}
                                                    {stripHtml(stat.questionText).length > 50 && '...'}
                                                </span>
                                                <Badge variant="secondary" className="text-xs">
                                                    {stat.questionType.replace('_', ' ')}
                                                </Badge>
                                                {getDifficultyBadge(stat.stats.difficulty)}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-green-600">
                                                    {stat.stats.correct} correct
                                                </span>
                                                <span className="text-red-600">
                                                    {stat.stats.incorrect} incorrect
                                                </span>
                                                <span className="font-semibold">
                                                    {stat.stats.successRate}%
                                                </span>
                                            </div>
                                        </div>
                                        <Progress
                                            value={stat.stats.successRate}
                                            className={cn(
                                                "h-2",
                                                stat.stats.successRate >= 70 ? "[&>div]:bg-green-500" :
                                                stat.stats.successRate >= 40 ? "[&>div]:bg-yellow-500" :
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
