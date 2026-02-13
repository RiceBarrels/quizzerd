'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { PageParams } from '@/app/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2,
  ArrowLeft,
  Clock,
  Copy,
  Globe,
  FileText,
  ListChecks,
  Target,
  Award,
  Eye,
  CheckCircle,
  Lock,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { ExamItem } from '@/types/exam';
import { toast } from 'sonner';
import VariableContent from '@/components/ui/variable-content';
import { cn } from '@/lib/utils';
import '@/components/editors/text-editor.css';

interface ExamData {
  exam_id: string;
  exam_name: string;
  exam_description: string;
  duration_minutes: number;
  items: ExamItem[];
  total_points: number;
  passing_score: number;
  attempts_allowed: number;
  shuffle_questions: boolean;
  is_public: boolean;
  status: string;
  created_at: string;
  creator_id: string;
  creator_name?: string;
}

export default function PublicExamPage({ params }: { params: Promise<PageParams> }) {
  const router = useRouter();
  const { examId } = use(params);
  const { isSignedIn } = useUser();

  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [copying, setCopying] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExam();
  }, [examId]);

  const fetchExam = async () => {
    try {
      const response = await fetch(`/api/exams/get?examId=${examId}`);
      const result = await response.json();

      if (result.success) {
        // Check if exam is public
        if (!result.data.is_public) {
          setError('This exam is not publicly available.');
          setExamData(null);
        } else {
          setExamData(result.data);
        }
      } else {
        setError(result.error || 'Failed to load exam');
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
      setError('Failed to load exam');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyExam = async () => {
    if (!isSignedIn) {
      toast.error('Please sign in to copy this exam');
      router.push('/sign-in');
      return;
    }

    if (!examData) return;

    setCopying(true);
    try {
      // Create a copy of the exam with all its items
      const duplicatedExam = {
        exam_name: `${examData.exam_name} (Copy)`,
        exam_description: examData.exam_description,
        duration_minutes: examData.duration_minutes,
        attempts_allowed: examData.attempts_allowed,
        passing_score: examData.passing_score,
        shuffle_questions: examData.shuffle_questions,
        show_results_immediately: true,
        is_public: false, // Default to private for the copy
        status: 'draft',
        items: examData.items || [], // Pass items directly, API will generate new IDs
      };

      const response = await fetch('/api/exams/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatedExam),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Exam copied successfully! Redirecting to editor...');
        setShowCopyDialog(false);
        router.push(`/exam/${data.data.exam_id}/edit`);
      } else {
        toast.error(data.error || 'Failed to copy exam');
      }
    } catch (error) {
      console.error('Error copying exam:', error);
      toast.error('Failed to copy exam');
    } finally {
      setCopying(false);
    }
  };

  const handleShareLink = () => {
    const publicUrl = `${window.location.origin}/exam/${examId}/public`;
    navigator.clipboard.writeText(publicUrl);
    toast.success('Public link copied to clipboard');
  };

  // Get question type counts
  const getQuestionTypeCounts = () => {
    if (!examData?.items) return {};
    const typeCounts: Record<string, number> = {};
    examData.items.forEach((item) => {
      if (item.question_type !== 'page_break' && item.question_type !== 'section_header') {
        typeCounts[item.question_type] = (typeCounts[item.question_type] || 0) + 1;
      }
    });
    return typeCounts;
  };

  const questionTypeCounts = getQuestionTypeCounts();
  const questionCount = examData?.items?.filter(
    (i) => i.question_type !== 'page_break' && i.question_type !== 'section_header'
  ).length || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !examData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">
            {error || 'Exam Not Found'}
          </h1>
          <p className="text-muted-foreground mb-6">
            This exam may be private or no longer available.
          </p>
          <Button onClick={() => router.push('/exam')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Browse Public Exams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        .ProseMirror-readonly {
          outline: none;
        }
        .ProseMirror-readonly p {
          margin: 0;
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={() => router.push('/exam')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Exams
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleShareLink}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Badge variant="secondary" className="gap-1">
                  <Globe className="h-3 w-3" />
                  Public Exam
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Exam Header Card */}
          <Card className="mb-8 shadow-lg overflow-hidden">
            <div className="h-2 w-full bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
            <CardHeader className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="gap-1">
                      <Globe className="h-3 w-3" />
                      Public
                    </Badge>
                    <Badge
                      variant={examData.status === 'published' ? 'default' : 'secondary'}
                      className="gap-1"
                    >
                      <CheckCircle className="h-3 w-3" />
                      {examData.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-3xl mb-3">{examData.exam_name}</CardTitle>
                  {examData.exam_description && (
                    <CardDescription className="text-base">
                      <div className="ProseMirror-readonly">
                        <VariableContent htmlContent={examData.exam_description} />
                      </div>
                    </CardDescription>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <Button
                    size="lg"
                    onClick={() => setShowCopyDialog(true)}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy to My Exams
                  </Button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t">
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                    <Clock className="h-4 w-4" />
                    <span className="text-xs font-medium">Duration</span>
                  </div>
                  <p className="text-lg font-bold">{examData.duration_minutes} min</p>
                </div>

                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                    <ListChecks className="h-4 w-4" />
                    <span className="text-xs font-medium">Questions</span>
                  </div>
                  <p className="text-lg font-bold">{questionCount}</p>
                </div>

                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                    <Target className="h-4 w-4" />
                    <span className="text-xs font-medium">Total Points</span>
                  </div>
                  <p className="text-lg font-bold">{examData.total_points || 0}</p>
                </div>

                <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                  <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                    <Award className="h-4 w-4" />
                    <span className="text-xs font-medium">Pass Score</span>
                  </div>
                  <p className="text-lg font-bold">{examData.passing_score || 70}%</p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Exam Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Exam Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Attempts Allowed</span>
                  <span className="font-medium">{examData.attempts_allowed || 1}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Question Order</span>
                  <span className="font-medium">
                    {examData.shuffle_questions ? 'Shuffled' : 'Fixed'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Created</span>
                  <span className="font-medium">
                    {new Date(examData.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Question Types Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Question Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(questionTypeCounts).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(questionTypeCounts).map(([type, count]) => (
                      <Badge key={type} variant="secondary" className="gap-1 px-3 py-1.5">
                        <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                        <span className="text-xs bg-primary/20 px-1.5 py-0.5 rounded-full ml-1">
                          {count}
                        </span>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No questions in this exam</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Questions Preview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Questions Preview
              </CardTitle>
              <CardDescription>
                Preview the questions in this exam before copying
              </CardDescription>
            </CardHeader>
            <CardContent>
              {examData.items && examData.items.length > 0 ? (
                <div className="space-y-4">
                  {examData.items
                    .filter((item) => item.question_type !== 'page_break')
                    .map((item) => {
                      if (item.question_type === 'section_header') {
                        return (
                          <div key={item.question_id} className="pt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline">Section</Badge>
                            </div>
                            <h3 className="text-lg font-semibold">
                              <div className="ProseMirror-readonly">
                                <VariableContent htmlContent={item.question_text} />
                              </div>
                            </h3>
                            <Separator className="mt-3" />
                          </div>
                        );
                      }

                      const questionNumber = examData.items
                        .slice(0, examData.items.indexOf(item))
                        .filter(
                          (i) =>
                            i.question_type !== 'page_break' &&
                            i.question_type !== 'section_header'
                        ).length + 1;

                      return (
                        <div
                          key={item.question_id}
                          className="p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                              {questionNumber}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {item.question_type?.replace(/_/g, ' ')}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {item.points} pts
                                </Badge>
                                {item.required && (
                                  <Badge variant="destructive" className="text-xs">
                                    Required
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm font-medium line-clamp-2 ProseMirror-readonly">
                                <VariableContent htmlContent={item.question_text} />
                              </div>
                              {item.options && item.options.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {item.options.slice(0, 3).map((option: string, oIndex: number) => (
                                    <div
                                      key={oIndex}
                                      className="flex items-center gap-2 text-xs text-muted-foreground"
                                    >
                                      <div
                                        className={cn(
                                          'w-3 h-3 border flex-shrink-0',
                                          item.question_type === 'multiple_choice'
                                            ? 'rounded-full'
                                            : 'rounded-sm'
                                        )}
                                      />
                                      <span className="line-clamp-1">{option}</span>
                                    </div>
                                  ))}
                                  {item.options.length > 3 && (
                                    <span className="text-xs text-muted-foreground/70">
                                      +{item.options.length - 3} more options
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No questions in this exam yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Copy CTA */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Like this exam?</h3>
                  <p className="text-sm text-muted-foreground">
                    Copy it to your account and customize it for your needs
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={() => setShowCopyDialog(true)}
                  className="gap-2 w-full sm:w-auto"
                >
                  <Copy className="h-4 w-4" />
                  Copy to My Exams
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Copy Confirmation Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Copy Exam
            </DialogTitle>
            <DialogDescription>
              This will create a copy of &quot;{examData.exam_name}&quot; in your account.
              The copy will be private by default.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Questions</span>
                <span className="font-medium">{questionCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Points</span>
                <span className="font-medium">{examData.total_points || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{examData.duration_minutes} minutes</span>
              </div>
            </div>

            {!isSignedIn && (
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-900 dark:text-orange-200">
                  You need to sign in to copy this exam to your account.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCopyDialog(false)}
              disabled={copying}
            >
              Cancel
            </Button>
            <Button onClick={handleCopyExam} disabled={copying}>
              {copying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Copying...
                </>
              ) : isSignedIn ? (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Exam
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Sign In to Copy
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
