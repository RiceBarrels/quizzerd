'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Loader2, AlertTriangle, Users, CheckCircle, Clock,
    AlertCircle, FileText, ChevronDown, ChevronUp,
    Copy, ExternalLink, Pencil, Save, XCircle, HelpCircle,
    Sparkles, Wand2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PageParams {
    sessionId: string;
}

interface SessionData {
    session_id: string;
    google_course_name: string;
    start_date: string | null;
    end_date: string | null;
    status: string;
    allowed_emails?: string[];
}

interface ExamData {
    exam_id: string;
    exam_name: string;
    exam_description: string;
    total_points: number;
    items: any[];
}

interface Attempt {
    attempt_id: string;
    student_id: string;
    status: string;
    start_time: string;
    end_time: string | null;
    score: number | null;
    percentage: number | null;
    feedback: string | null;
    responses: Record<string, any>;
    user?: {
        email: string;
        img_url: string | null;
        full_name: string | null;
    };
}

interface Violation {
    violation_id: string;
    attempt_id: string;
    student_id: string;
    violation_type: string;
    timestamp: string;
    details?: Record<string, any>;
}

export default function SessionAdminPage({ params }: { params: Promise<PageParams> }) {
    const router = useRouter();
    const { user, isLoaded } = useUser();
    const { sessionId } = use(params);

    const [loading, setLoading] = useState(true);
    const [redirecting, setRedirecting] = useState(false);
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [examData, setExamData] = useState<ExamData | null>(null);
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [violations, setViolations] = useState<Violation[]>([]);
    const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Grade editing state
    const [editingAttempt, setEditingAttempt] = useState<Attempt | null>(null);
    const [editScore, setEditScore] = useState<string>('');
    const [editFeedback, setEditFeedback] = useState<string>('');
    const [savingGrade, setSavingGrade] = useState(false);

    // Per-question manual scores: { attemptId: { questionId: score } }
    const [manualScores, setManualScores] = useState<Record<string, Record<string, number>>>({});

    // Check if this session is migrated to a class and redirect
    useEffect(() => {
        const checkRedirect = async () => {
            try {
                const response = await fetch(`/api/classes/lookup-session?sessionId=${sessionId}`);
                const data = await response.json();

                if (data.success && data.data?.class_id) {
                    setRedirecting(true);
                    // Redirect to class grades page
                    router.replace(`/classes/${data.data.class_id}`);
                }
            } catch (error) {
                // If lookup fails, continue showing the session page
                console.log('No class redirect found for session');
            }
        };

        checkRedirect();
    }, [sessionId, router]);

    // AI grading state: { attemptId_questionId: { loading, feedback } }
    const [aiGrading, setAiGrading] = useState<Record<string, { loading: boolean; feedback?: string }>>({});

    // AI Grade a single question
    const aiGradeQuestion = async (attempt: Attempt, item: any) => {
        const key = `${attempt.attempt_id}_${item.question_id}`;
        const response = attempt.responses?.[item.question_id];

        if (!response) {
            toast.error('No answer to grade');
            return;
        }

        setAiGrading(prev => ({ ...prev, [key]: { loading: true } }));

        try {
            const res = await fetch('/api/ai/grade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: item.question_text?.replace(/<[^>]*>/g, '') || '',
                    correctAnswer: item.correct_answer || item.answer || '',
                    studentAnswer: typeof response === 'object' ? JSON.stringify(response) : String(response),
                    maxPoints: item.points || 10,
                    questionType: item.question_type
                })
            });

            const result = await res.json();

            if (result.success) {
                // Update manual score with AI suggestion
                updateManualScore(attempt.attempt_id, item.question_id, result.score, item.points);
                setAiGrading(prev => ({
                    ...prev,
                    [key]: { loading: false, feedback: result.feedback }
                }));
                toast.success(`AI suggests ${result.score}/${item.points} points`);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('AI grading error:', error);
            toast.error('AI grading failed');
            setAiGrading(prev => ({ ...prev, [key]: { loading: false } }));
        }
    };

    // AI Grade all questions that need review for an attempt
    const aiGradeAllQuestions = async (attempt: Attempt) => {
        const questionsNeedingReview = examData?.items?.filter(item => {
            if (item.question_type === 'section_header' || item.question_type === 'page_break') return false;
            const response = attempt.responses?.[item.question_id];
            return checkAnswerCorrectness(item, response) === 'needs_review';
        }) || [];

        if (questionsNeedingReview.length === 0) {
            toast.info('No questions need AI grading');
            return;
        }

        toast.info(`AI grading ${questionsNeedingReview.length} question(s)...`);

        for (const item of questionsNeedingReview) {
            await aiGradeQuestion(attempt, item);
        }

        toast.success('AI grading complete!');
    };

    useEffect(() => {
        if (isLoaded) {
            fetchSessionData();
        }
    }, [sessionId, isLoaded]);

    const fetchSessionData = async () => {
        try {
            const response = await fetch(`/api/exams/sessions/${sessionId}`);
            const result = await response.json();

            if (result.success && result.isTeacher) {
                setSessionData(result.session);
                setExamData(result.exam);
                setAttempts(result.attempts || []);
                setViolations(result.violations || []);
            } else if (!result.isTeacher) {
                setError('You do not have permission to view this page');
            } else {
                setError(result.error || 'Failed to load session data');
            }
        } catch (err) {
            console.error('Error fetching session:', err);
            setError('Failed to load session data');
        } finally {
            setLoading(false);
        }
    };

    const openGradeDialog = (attempt: Attempt, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingAttempt(attempt);
        setEditScore(attempt.score?.toString() || '');
        setEditFeedback(attempt.feedback || '');
    };

    const saveGrade = async () => {
        if (!editingAttempt) return;

        const score = parseFloat(editScore);
        if (isNaN(score) || score < 0) {
            toast.error('Please enter a valid score');
            return;
        }

        if (examData && score > examData.total_points) {
            toast.error(`Score cannot exceed ${examData.total_points} points`);
            return;
        }

        setSavingGrade(true);
        try {
            const response = await fetch('/api/exams/attempts/grade', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attemptId: editingAttempt.attempt_id,
                    score,
                    feedback: editFeedback || null
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Grade saved successfully');
                // Update local state
                setAttempts(prev => prev.map(a =>
                    a.attempt_id === editingAttempt.attempt_id
                        ? { ...a, score, percentage: (score / (examData?.total_points || 100)) * 100, feedback: editFeedback, status: 'graded' }
                        : a
                ));
                setEditingAttempt(null);
            } else {
                toast.error(result.error || 'Failed to save grade');
            }
        } catch (err) {
            console.error('Error saving grade:', err);
            toast.error('Failed to save grade');
        } finally {
            setSavingGrade(false);
        }
    };

    const getViolationsForAttempt = (attemptId: string) => {
        return violations.filter(v => v.attempt_id === attemptId);
    };

    // Check if a response is correct for auto-gradable questions
    const checkAnswerCorrectness = (item: any, response: any): 'correct' | 'incorrect' | 'needs_review' | 'no_answer' => {
        // No response
        if (response === undefined || response === null || response === '') {
            return 'no_answer';
        }

        const questionType = item.question_type;

        // Questions that need manual review
        if (['coding', 'long_answer', 'short_answer', 'essay', 'file_upload'].includes(questionType)) {
            return 'needs_review';
        }

        // Multiple choice - single answer
        if (questionType === 'multiple_choice') {
            const correctAnswer = item.correct_answer;
            if (correctAnswer !== undefined) {
                // correct_answer might be the option text or index
                if (typeof correctAnswer === 'number') {
                    // It's an index
                    const correctOption = item.options?.[correctAnswer]?.text || item.options?.[correctAnswer];
                    return response === correctOption || response === correctAnswer ? 'correct' : 'incorrect';
                }
                return String(response).toLowerCase() === String(correctAnswer).toLowerCase() ? 'correct' : 'incorrect';
            }
            // Check options with is_correct flag
            if (item.options && Array.isArray(item.options)) {
                const correctOption = item.options.find((opt: any) => opt.is_correct || opt.isCorrect);
                if (correctOption) {
                    const correctText = correctOption.text || correctOption.value || correctOption;
                    return String(response).toLowerCase() === String(correctText).toLowerCase() ? 'correct' : 'incorrect';
                }
            }
            return 'needs_review';
        }

        // Checkbox / Multiple select
        if (questionType === 'checkbox' || questionType === 'multi_select') {
            if (!Array.isArray(response)) return 'incorrect';
            const correctAnswers = item.correct_answers ||
                item.options?.filter((opt: any) => opt.is_correct || opt.isCorrect)
                    .map((opt: any) => opt.text || opt.value || opt) || [];

            if (correctAnswers.length === 0) return 'needs_review';

            const responseSet = new Set(response.map((r: string) => String(r).toLowerCase()));
            const correctSet = new Set(correctAnswers.map((a: string) => String(a).toLowerCase()));

            if (responseSet.size !== correctSet.size) return 'incorrect';
            for (const ans of responseSet) {
                if (!correctSet.has(ans)) return 'incorrect';
            }
            return 'correct';
        }

        // True/False
        if (questionType === 'true_false') {
            const correctAnswer = item.correct_answer;
            if (correctAnswer !== undefined) {
                const normalizedResponse = String(response).toLowerCase();
                const normalizedCorrect = String(correctAnswer).toLowerCase();
                return normalizedResponse === normalizedCorrect ? 'correct' : 'incorrect';
            }
            return 'needs_review';
        }

        // Fill in the blank
        if (questionType === 'fill_blank' || questionType === 'fill_in_blank') {
            const correctAnswer = item.correct_answer || item.answer;
            if (correctAnswer) {
                const acceptableAnswers = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
                const isCorrect = acceptableAnswers.some(
                    (ans: string) => String(response).toLowerCase().trim() === String(ans).toLowerCase().trim()
                );
                return isCorrect ? 'correct' : 'incorrect';
            }
            return 'needs_review';
        }

        // Matching questions
        if (questionType === 'matching') {
            if (typeof response !== 'object') return 'incorrect';
            const correctPairs = item.correct_pairs || item.pairs;
            if (!correctPairs) return 'needs_review';

            for (const [key, value] of Object.entries(correctPairs)) {
                if (response[key] !== value) return 'incorrect';
            }
            return 'correct';
        }

        // Default - needs review
        return 'needs_review';
    };

    // Get correctness badge component
    const CorrectnessIndicator = ({ status }: { status: 'correct' | 'incorrect' | 'needs_review' | 'no_answer' }) => {
        switch (status) {
            case 'correct':
                return (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-600 gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Correct
                    </Badge>
                );
            case 'incorrect':
                return (
                    <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Incorrect
                    </Badge>
                );
            case 'needs_review':
                return (
                    <Badge variant="secondary" className="gap-1">
                        <HelpCircle className="h-3 w-3" />
                        Needs Review
                    </Badge>
                );
            case 'no_answer':
                return (
                    <Badge variant="outline" className="text-muted-foreground gap-1">
                        <AlertCircle className="h-3 w-3" />
                        No Answer
                    </Badge>
                );
        }
    };

    // Calculate auto-graded score for an attempt
    const calculateAutoScore = (attempt: Attempt) => {
        if (!examData?.items) return { earned: 0, total: 0, autoGradable: 0, manualEarned: 0, manualTotal: 0 };

        let earned = 0;
        let total = 0;
        let autoGradable = 0;
        let manualEarned = 0;
        let manualTotal = 0;

        const attemptManualScores = manualScores[attempt.attempt_id] || {};

        examData.items
            .filter(item => item.question_type !== 'section_header' && item.question_type !== 'page_break')
            .forEach(item => {
                const points = item.points || 0;
                total += points;

                const response = attempt.responses?.[item.question_id];
                const correctness = checkAnswerCorrectness(item, response);

                if (correctness === 'correct') {
                    earned += points;
                    autoGradable += points;
                } else if (correctness === 'incorrect' || correctness === 'no_answer') {
                    autoGradable += points;
                } else if (correctness === 'needs_review') {
                    manualTotal += points;
                    // Check if there's a manual score for this question
                    if (attemptManualScores[item.question_id] !== undefined) {
                        manualEarned += attemptManualScores[item.question_id];
                    }
                }
            });

        return { earned, total, autoGradable, manualEarned, manualTotal };
    };

    // Update manual score for a question
    const updateManualScore = (attemptId: string, questionId: string, score: number, maxPoints: number) => {
        const clampedScore = Math.max(0, Math.min(score, maxPoints));
        setManualScores(prev => ({
            ...prev,
            [attemptId]: {
                ...prev[attemptId],
                [questionId]: clampedScore
            }
        }));
    };

    // Save all grades for an attempt (auto + manual)
    const saveAllGrades = async (attempt: Attempt) => {
        const { earned, manualEarned, manualTotal } = calculateAutoScore(attempt);
        const attemptManualScores = manualScores[attempt.attempt_id] || {};

        // Check if all manual questions are graded
        const questionsNeedingReview = examData?.items?.filter(item => {
            if (item.question_type === 'section_header' || item.question_type === 'page_break') return false;
            const response = attempt.responses?.[item.question_id];
            return checkAnswerCorrectness(item, response) === 'needs_review';
        }) || [];

        const ungradedCount = questionsNeedingReview.filter(
            item => attemptManualScores[item.question_id] === undefined
        ).length;

        if (ungradedCount > 0) {
            toast.error(`Please grade all ${ungradedCount} question(s) that need review`);
            return;
        }

        const totalScore = earned + manualEarned;

        setSavingGrade(true);
        try {
            const response = await fetch('/api/exams/attempts/grade', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attemptId: attempt.attempt_id,
                    score: totalScore,
                    feedback: null
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success('Grade saved successfully');
                // Update local state
                setAttempts(prev => prev.map(a =>
                    a.attempt_id === attempt.attempt_id
                        ? { ...a, score: totalScore, percentage: (totalScore / (examData?.total_points || 100)) * 100, status: 'graded' }
                        : a
                ));
            } else {
                toast.error(result.error || 'Failed to save grade');
            }
        } catch (err) {
            console.error('Error saving grade:', err);
            toast.error('Failed to save grade');
        } finally {
            setSavingGrade(false);
        }
    };

    const formatViolationType = (type: string) => {
        const types: Record<string, string> = {
            'console': 'Console Access',
            'visibility': 'Tab Switch',
            'translation': 'Translation',
            'location': 'Location Violation',
            'context_menu': 'Right Click'
        };
        return types[type] || type;
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString();
    };

    const getInitials = (name: string | null, email: string) => {
        if (name) {
            return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
        return email.slice(0, 2).toUpperCase();
    };

    const copySessionLink = () => {
        const link = `${window.location.origin}/exam/session/${sessionId}`;
        navigator.clipboard.writeText(link);
        toast.success('Session link copied to clipboard');
    };

    if (loading || !isLoaded || redirecting) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="h-8 w-8 animate-spin" />
                {redirecting && (
                    <p className="text-sm text-muted-foreground">Redirecting to class...</p>
                )}
            </div>
        );
    }

    if (!user) {
        router.push('/sign-in');
        return null;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertCircle className="h-16 w-16 text-destructive" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">{error}</p>
                <Button onClick={() => router.push('/exam')}>Back to Exams</Button>
            </div>
        );
    }

    if (!examData || !sessionData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertCircle className="h-16 w-16 text-muted-foreground" />
                <h1 className="text-2xl font-bold">Session Not Found</h1>
                <Button onClick={() => router.push('/exam')}>Back to Exams</Button>
            </div>
        );
    }

    const submittedAttempts = attempts.filter(a => a.status === 'submitted' || a.status === 'graded');
    const inProgressAttempts = attempts.filter(a => a.status === 'in_progress');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{examData.exam_name}</h1>
                    <p className="text-muted-foreground mt-1">
                        {sessionData.google_course_name || 'Exam Session'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge variant={sessionData.status === 'active' ? 'default' : 'secondary'}>
                            {sessionData.status}
                        </Badge>
                        {sessionData.start_date && (
                            <span className="text-sm text-muted-foreground">
                                {formatDate(sessionData.start_date)} - {formatDate(sessionData.end_date)}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copySessionLink}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push(`/exam/${examData.exam_id}/edit`)}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Edit Exam
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <Users className="h-8 w-8 text-muted-foreground" />
                            <div>
                                <div className="text-2xl font-bold">{attempts.length}</div>
                                <p className="text-sm text-muted-foreground">Total Attempts</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                            <div>
                                <div className="text-2xl font-bold">{submittedAttempts.length}</div>
                                <p className="text-sm text-muted-foreground">Submitted</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <Clock className="h-8 w-8 text-blue-600" />
                            <div>
                                <div className="text-2xl font-bold">{inProgressAttempts.length}</div>
                                <p className="text-sm text-muted-foreground">In Progress</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-8 w-8 text-red-600" />
                            <div>
                                <div className="text-2xl font-bold">{violations.length}</div>
                                <p className="text-sm text-muted-foreground">Violations</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="attempts" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="attempts">Student Attempts</TabsTrigger>
                    <TabsTrigger value="violations" className="gap-2">
                        Violations
                        {violations.length > 0 && (
                            <Badge variant="destructive" className="ml-1">{violations.length}</Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="attempts">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Attempts</CardTitle>
                            <CardDescription>
                                Click on an attempt to view details. Click the edit button to grade.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {attempts.length === 0 ? (
                                <div className="text-center py-12">
                                    <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                                    <p className="text-muted-foreground">No attempts yet</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Students will appear here once they start the exam
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {attempts.map((attempt) => {
                                        const attemptViolations = getViolationsForAttempt(attempt.attempt_id);
                                        const isExpanded = selectedAttempt?.attempt_id === attempt.attempt_id;

                                        return (
                                            <div
                                                key={attempt.attempt_id}
                                                className={cn(
                                                    "border rounded-lg transition-all",
                                                    isExpanded && "ring-2 ring-primary"
                                                )}
                                            >
                                                <div
                                                    className="p-4 cursor-pointer hover:bg-muted/50"
                                                    onClick={() => setSelectedAttempt(isExpanded ? null : attempt)}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-10 w-10">
                                                                <AvatarImage src={attempt.user?.img_url || undefined} />
                                                                <AvatarFallback>
                                                                    {getInitials(attempt.user?.full_name || null, attempt.user?.email || '')}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <div className="font-medium">
                                                                    {attempt.user?.full_name || 'Unknown'}
                                                                </div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {attempt.user?.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {attemptViolations.length > 0 && (
                                                                <Badge variant="destructive" className="gap-1">
                                                                    <AlertTriangle className="h-3 w-3" />
                                                                    {attemptViolations.length}
                                                                </Badge>
                                                            )}
                                                            <Badge variant={
                                                                attempt.status === 'graded' ? 'default' :
                                                                attempt.status === 'submitted' ? 'secondary' :
                                                                'outline'
                                                            }>
                                                                {attempt.status}
                                                            </Badge>
                                                            <div className="text-right min-w-[80px]">
                                                                <div className="font-bold">
                                                                    {attempt.score !== null ? attempt.score : '-'}/{examData.total_points}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {attempt.percentage !== null ? `${attempt.percentage.toFixed(1)}%` : '-'}
                                                                </div>
                                                            </div>
                                                            {(attempt.status === 'submitted' || attempt.status === 'graded') && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={(e) => openGradeDialog(attempt, e)}
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                            {isExpanded ? (
                                                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                                            ) : (
                                                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-2">
                                                        Started: {formatDate(attempt.start_time)}
                                                        {attempt.end_time && ` | Submitted: ${formatDate(attempt.end_time)}`}
                                                    </div>
                                                </div>

                                                {/* Expanded Content */}
                                                {isExpanded && (
                                                    <div className="px-4 pb-4 pt-0 border-t space-y-4">
                                                        {/* Feedback */}
                                                        {attempt.feedback && (
                                                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                                                                <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">Feedback</div>
                                                                <div className="text-sm text-blue-700 dark:text-blue-300">{attempt.feedback}</div>
                                                            </div>
                                                        )}

                                                        {/* Violations */}
                                                        {attemptViolations.length > 0 && (
                                                            <div className="mt-4">
                                                                <h4 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                                                                    <AlertTriangle className="h-4 w-4" />
                                                                    Violations ({attemptViolations.length})
                                                                </h4>
                                                                <div className="space-y-1">
                                                                    {attemptViolations.map((v, i) => (
                                                                        <div key={i} className="text-sm flex items-center justify-between p-2 bg-red-50 dark:bg-red-950/20 rounded">
                                                                            <span>{formatViolationType(v.violation_type)}</span>
                                                                            <span className="text-xs text-muted-foreground">
                                                                                {formatDate(v.timestamp)}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Answers */}
                                                        {attempt.responses && Object.keys(attempt.responses).length > 0 && (
                                                            <div className="mt-4">
                                                                <h4 className="font-medium mb-2 flex items-center gap-2">
                                                                    <FileText className="h-4 w-4" />
                                                                    Answers
                                                                </h4>
                                                                {/* Auto-score summary */}
                                                                {(() => {
                                                                    const { earned, total, autoGradable, manualEarned, manualTotal } = calculateAutoScore(attempt);
                                                                    const attemptManualScores = manualScores[attempt.attempt_id] || {};
                                                                    const questionsNeedingReview = examData?.items?.filter(item => {
                                                                        if (item.question_type === 'section_header' || item.question_type === 'page_break') return false;
                                                                        const response = attempt.responses?.[item.question_id];
                                                                        return checkAnswerCorrectness(item, response) === 'needs_review';
                                                                    }) || [];
                                                                    const gradedManualCount = questionsNeedingReview.filter(
                                                                        item => attemptManualScores[item.question_id] !== undefined
                                                                    ).length;
                                                                    const allManualGraded = gradedManualCount === questionsNeedingReview.length && questionsNeedingReview.length > 0;
                                                                    const totalScore = earned + manualEarned;

                                                                    return (
                                                                        <div className="mb-3 p-3 bg-muted rounded-lg space-y-2">
                                                                            <div className="flex items-center justify-between text-sm">
                                                                                <span>
                                                                                    Auto-graded: <span className="font-semibold">{earned}/{autoGradable}</span> pts
                                                                                </span>
                                                                                {manualTotal > 0 && (
                                                                                    <span>
                                                                                        Manual: <span className="font-semibold">{manualEarned}/{manualTotal}</span> pts
                                                                                        <span className="text-muted-foreground ml-1">
                                                                                            ({gradedManualCount}/{questionsNeedingReview.length} graded)
                                                                                        </span>
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center justify-between border-t pt-2">
                                                                                <span className="font-semibold">
                                                                                    Total: {totalScore}/{total} pts
                                                                                    {allManualGraded && (
                                                                                        <span className="text-muted-foreground font-normal ml-2">
                                                                                            ({((totalScore / total) * 100).toFixed(1)}%)
                                                                                        </span>
                                                                                    )}
                                                                                </span>
                                                                                <div className="flex items-center gap-2">
                                                                                    {manualTotal > 0 && !allManualGraded && (
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="outline"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                aiGradeAllQuestions(attempt);
                                                                                            }}
                                                                                            className="gap-1"
                                                                                        >
                                                                                            <Wand2 className="h-4 w-4" />
                                                                                            AI Grade All
                                                                                        </Button>
                                                                                    )}
                                                                                    {manualTotal > 0 && (
                                                                                        <Button
                                                                                            size="sm"
                                                                                            onClick={(e) => {
                                                                                                e.stopPropagation();
                                                                                                saveAllGrades(attempt);
                                                                                            }}
                                                                                            disabled={savingGrade || !allManualGraded}
                                                                                        >
                                                                                            {savingGrade ? (
                                                                                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                                                                            ) : (
                                                                                                <Save className="h-4 w-4 mr-1" />
                                                                                            )}
                                                                                            Save Grade
                                                                                        </Button>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}
                                                                <div className="space-y-3">
                                                                    {examData.items
                                                                        .filter(item => item.question_type !== 'section_header' && item.question_type !== 'page_break')
                                                                        .map((item, index) => {
                                                                            const response = attempt.responses[item.question_id];
                                                                            const correctness = checkAnswerCorrectness(item, response);

                                                                            // Get correct answer for display
                                                                            const getCorrectAnswerDisplay = () => {
                                                                                if (item.correct_answer !== undefined) {
                                                                                    if (typeof item.correct_answer === 'number' && item.options) {
                                                                                        return item.options[item.correct_answer]?.text || item.options[item.correct_answer] || String(item.correct_answer);
                                                                                    }
                                                                                    return String(item.correct_answer);
                                                                                }
                                                                                if (item.options && Array.isArray(item.options)) {
                                                                                    const correctOpt = item.options.find((opt: any) => opt.is_correct || opt.isCorrect);
                                                                                    if (correctOpt) return correctOpt.text || correctOpt.value || String(correctOpt);
                                                                                }
                                                                                if (item.correct_answers) {
                                                                                    return Array.isArray(item.correct_answers) ? item.correct_answers.join(', ') : String(item.correct_answers);
                                                                                }
                                                                                return null;
                                                                            };

                                                                            const correctAnswerDisplay = getCorrectAnswerDisplay();

                                                                            return (
                                                                                <div
                                                                                    key={item.question_id}
                                                                                    className={cn(
                                                                                        "p-3 rounded-lg border",
                                                                                        correctness === 'correct' && "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900",
                                                                                        correctness === 'incorrect' && "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900",
                                                                                        correctness === 'needs_review' && "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900",
                                                                                        correctness === 'no_answer' && "bg-muted/50 border-muted"
                                                                                    )}
                                                                                >
                                                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <div className="text-sm font-medium">
                                                                                                Q{index + 1}: {item.question_text?.replace(/<[^>]*>/g, '').substring(0, 100)}
                                                                                                {item.question_text?.length > 100 ? '...' : ''}
                                                                                            </div>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2 shrink-0">
                                                                                            {correctness === 'needs_review' ? (
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <Button
                                                                                                        variant="outline"
                                                                                                        size="sm"
                                                                                                        className="h-8 gap-1"
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            aiGradeQuestion(attempt, item);
                                                                                                        }}
                                                                                                        disabled={aiGrading[`${attempt.attempt_id}_${item.question_id}`]?.loading}
                                                                                                    >
                                                                                                        {aiGrading[`${attempt.attempt_id}_${item.question_id}`]?.loading ? (
                                                                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                                                                        ) : (
                                                                                                            <Sparkles className="h-3 w-3" />
                                                                                                        )}
                                                                                                        AI
                                                                                                    </Button>
                                                                                                    <Input
                                                                                                        type="number"
                                                                                                        min="0"
                                                                                                        max={item.points}
                                                                                                        className="w-16 h-8 text-center"
                                                                                                        placeholder="0"
                                                                                                        value={manualScores[attempt.attempt_id]?.[item.question_id] ?? ''}
                                                                                                        onClick={(e) => e.stopPropagation()}
                                                                                                        onChange={(e) => {
                                                                                                            const val = e.target.value;
                                                                                                            if (val === '') {
                                                                                                                // Clear the score
                                                                                                                setManualScores(prev => {
                                                                                                                    const newScores = { ...prev };
                                                                                                                    if (newScores[attempt.attempt_id]) {
                                                                                                                        delete newScores[attempt.attempt_id][item.question_id];
                                                                                                                    }
                                                                                                                    return newScores;
                                                                                                                });
                                                                                                            } else {
                                                                                                                updateManualScore(attempt.attempt_id, item.question_id, parseFloat(val), item.points);
                                                                                                            }
                                                                                                        }}
                                                                                                    />
                                                                                                    <span className="text-sm text-muted-foreground">/ {item.points}</span>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <>
                                                                                                    <CorrectnessIndicator status={correctness} />
                                                                                                    <Badge variant="outline">
                                                                                                        {correctness === 'correct' ? item.points : 0}/{item.points} pts
                                                                                                    </Badge>
                                                                                                </>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* Student's answer */}
                                                                                    <div className="text-sm mt-2">
                                                                                        <span className="text-muted-foreground">Answer: </span>
                                                                                        {response !== undefined && response !== null && response !== '' ? (
                                                                                            item.question_type === 'coding' && Array.isArray(response) ? (
                                                                                                <div className="font-mono text-xs bg-background p-2 rounded max-h-48 overflow-y-auto mt-1">
                                                                                                    {response.map((file: any, fi: number) => (
                                                                                                        <div key={fi} className="mb-2">
                                                                                                            <div className="text-muted-foreground font-semibold">{file.name}:</div>
                                                                                                            <pre className="whitespace-pre-wrap mt-1">{file.content}</pre>
                                                                                                        </div>
                                                                                                    ))}
                                                                                                </div>
                                                                                            ) : Array.isArray(response) ? (
                                                                                                <span className={correctness === 'correct' ? 'text-green-700 dark:text-green-400' : correctness === 'incorrect' ? 'text-red-700 dark:text-red-400' : 'text-primary'}>
                                                                                                    {response.join(', ')}
                                                                                                </span>
                                                                                            ) : typeof response === 'object' ? (
                                                                                                <span className={correctness === 'correct' ? 'text-green-700 dark:text-green-400' : correctness === 'incorrect' ? 'text-red-700 dark:text-red-400' : 'text-primary'}>
                                                                                                    {JSON.stringify(response)}
                                                                                                </span>
                                                                                            ) : (
                                                                                                <span className={correctness === 'correct' ? 'text-green-700 dark:text-green-400' : correctness === 'incorrect' ? 'text-red-700 dark:text-red-400' : 'text-primary'}>
                                                                                                    {String(response)}
                                                                                                </span>
                                                                                            )
                                                                                        ) : (
                                                                                            <span className="text-muted-foreground italic">No answer</span>
                                                                                        )}
                                                                                    </div>

                                                                                    {/* Show correct answer if incorrect */}
                                                                                    {correctness === 'incorrect' && correctAnswerDisplay && (
                                                                                        <div className="text-sm mt-1 pt-1 border-t border-red-200 dark:border-red-900">
                                                                                            <span className="text-muted-foreground">Correct answer: </span>
                                                                                            <span className="text-green-700 dark:text-green-400 font-medium">{correctAnswerDisplay}</span>
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Show AI feedback */}
                                                                                    {aiGrading[`${attempt.attempt_id}_${item.question_id}`]?.feedback && (
                                                                                        <div className="text-sm mt-2 p-2 bg-purple-50 dark:bg-purple-950/20 rounded border border-purple-200 dark:border-purple-900">
                                                                                            <div className="flex items-center gap-1 text-purple-700 dark:text-purple-400 font-medium mb-1">
                                                                                                <Sparkles className="h-3 w-3" />
                                                                                                AI Feedback
                                                                                            </div>
                                                                                            <p className="text-purple-700 dark:text-purple-300">
                                                                                                {aiGrading[`${attempt.attempt_id}_${item.question_id}`].feedback}
                                                                                            </p>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {(!attempt.responses || Object.keys(attempt.responses).length === 0) && (
                                                            <div className="mt-4 text-center py-4 text-muted-foreground">
                                                                No answers submitted yet
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="violations">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                                All Violations
                            </CardTitle>
                            <CardDescription>
                                Suspicious activity detected during the exam
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {violations.length === 0 ? (
                                <div className="text-center py-12">
                                    <CheckCircle className="h-12 w-12 mx-auto text-green-600/50 mb-4" />
                                    <p className="text-muted-foreground">No violations detected</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        All students are following exam rules
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {violations.map((violation, index) => {
                                        const attempt = attempts.find(a => a.attempt_id === violation.attempt_id);
                                        return (
                                            <div
                                                key={violation.violation_id || index}
                                                className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={attempt?.user?.img_url || undefined} />
                                                        <AvatarFallback className="text-xs">
                                                            {getInitials(attempt?.user?.full_name || null, attempt?.user?.email || '')}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="destructive">
                                                                {formatViolationType(violation.violation_type)}
                                                            </Badge>
                                                            <span className="font-medium text-sm">
                                                                {attempt?.user?.full_name || attempt?.user?.email || 'Unknown'}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            {attempt?.user?.email}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-sm text-muted-foreground">
                                                    {formatDate(violation.timestamp)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Grade Edit Dialog */}
            <Dialog open={!!editingAttempt} onOpenChange={(open) => !open && setEditingAttempt(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Grade</DialogTitle>
                        <DialogDescription>
                            {editingAttempt?.user?.full_name || editingAttempt?.user?.email}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="score">Score (out of {examData?.total_points})</Label>
                            <Input
                                id="score"
                                type="number"
                                min="0"
                                max={examData?.total_points}
                                value={editScore}
                                onChange={(e) => setEditScore(e.target.value)}
                                placeholder="Enter score"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="feedback">Feedback (optional)</Label>
                            <Textarea
                                id="feedback"
                                value={editFeedback}
                                onChange={(e) => setEditFeedback(e.target.value)}
                                placeholder="Add feedback for the student..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingAttempt(null)}>
                            Cancel
                        </Button>
                        <Button onClick={saveGrade} disabled={savingGrade}>
                            {savingGrade ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Grade
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
