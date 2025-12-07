'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { PageParams } from "@/app/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Star, Heart, ThumbsUp, Loader2, ArrowLeft, Clock, Calendar, Upload, Heading, Eye, EyeOff, Code2, ChevronDown, ChevronUp } from 'lucide-react';
import { ExamItem } from '@/types/exam';
import { toast } from 'sonner';
import VariableContent from '@/components/ui/variable-content';
import { cn } from '@/lib/utils';
import CodeEditor from '@/components/editors/CodeEditor';
import CheatingDetection from '@/components/ui/cheating-detection';
import '@/components/editors/text-editor.css';

interface ExamData {
    exam_name: string;
    exam_description: string;
    duration_minutes: number;
    items: ExamItem[];
    total_points: number;
    start_date: string | null;
    end_date: string | null;
    // Cheating detection settings
    console_detection?: boolean;
    translation_detection?: boolean;
    allow_word_by_word_translation?: boolean;
    allow_word_by_word_definition?: boolean;
    visibility_change_detection?: boolean;
    location_detection?: boolean;
}

export default function ExamPreviewPage({ params }: { params: Promise<PageParams> }) {
    const router = useRouter();
    const { examId } = use(params);
    const [loading, setLoading] = useState(true);
    const [examData, setExamData] = useState<ExamData | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [showExplanations, setShowExplanations] = useState(false);
    const [expandedCodeEditors, setExpandedCodeEditors] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchExam();
    }, [examId]);

    const fetchExam = async () => {
        try {
            const response = await fetch(`/api/exams/get?examId=${examId}`);
            const result = await response.json();
            
            if (result.success) {
                setExamData(result.data);
            } else {
                toast.error('Failed to load exam');
                router.push('/exam');
            }
        } catch (error) {
            console.error('Error fetching exam:', error);
            toast.error('Failed to load exam');
            router.push('/exam');
        } finally {
            setLoading(false);
        }
    };

    const renderQuestionInput = (item: ExamItem, index: number, showAnswers: boolean) => {
        switch (item.question_type) {
            case 'multiple_choice':
                return (
                    <RadioGroup className="space-y-3">
                        {item.options?.map((option, optionIndex) => {
                            const isCorrect = item.correct_answer === optionIndex;
                            return (
                                <div 
                                    key={optionIndex} 
                                    className={cn(
                                        "flex items-start space-x-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer",
                                        showAnswers && isCorrect && "bg-green-50 dark:bg-green-950/30 border-green-500 dark:border-green-700"
                                    )}
                                >
                                    <RadioGroupItem value={optionIndex.toString()} id={`q${index}-opt${optionIndex}`} className="mt-1.5 shrink-0" />
                                    <Label htmlFor={`q${index}-opt${optionIndex}`} className="flex-1 cursor-pointer font-normal">
                                        <div className="flex items-start gap-2">
                                            <div className="flex-1 ProseMirror-readonly">
                                                <VariableContent htmlContent={option} />
                                            </div>
                                            {showAnswers && isCorrect && (
                                                <Badge variant="default" className="bg-green-600 shrink-0">Correct</Badge>
                                            )}
                                        </div>
                                    </Label>
                                </div>
                            );
                        })}
                    </RadioGroup>
                );

            case 'multiple_select':
                return (
                    <div className="space-y-3">
                        {item.options?.map((option, optionIndex) => {
                            const correctAnswers = Array.isArray(item.correct_answer) ? item.correct_answer as number[] : [];
                            const isCorrect = correctAnswers.includes(optionIndex);
                            return (
                                <div 
                                    key={optionIndex} 
                                    className={cn(
                                        "flex items-start space-x-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer",
                                        showAnswers && isCorrect && "bg-green-50 dark:bg-green-950/30 border-green-500 dark:border-green-700"
                                    )}
                                >
                                    <Checkbox id={`q${index}-opt${optionIndex}`} className="mt-1.5 shrink-0" />
                                    <Label htmlFor={`q${index}-opt${optionIndex}`} className="flex-1 cursor-pointer font-normal">
                                        <div className="flex items-start gap-2">
                                            <div className="flex-1 ProseMirror-readonly">
                                                <VariableContent htmlContent={option} />
                                            </div>
                                            {showAnswers && isCorrect && (
                                                <Badge variant="default" className="bg-green-600 shrink-0">Correct</Badge>
                                            )}
                                        </div>
                                    </Label>
                                </div>
                            );
                        })}
                    </div>
                );

            case 'short_answer':
                return (
                    <div className="space-y-2">
                        <Input 
                            placeholder="Enter your answer" 
                            className="max-w-xl"
                        />
                        {showAnswers && item.correct_answer && (
                            <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-500 dark:border-green-700 rounded-lg">
                                <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">Acceptable Answer(s):</p>
                                <div className="text-sm text-green-800 dark:text-green-200">
                                    {Array.isArray(item.correct_answer) 
                                        ? (item.correct_answer as string[]).join(', ')
                                        : String(item.correct_answer)
                                    }
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'long_answer':
                return (
                    <Textarea 
                        placeholder="Enter your answer" 
                        className="min-h-[150px]"
                    />
                );

            case 'true_false':
                return (
                    <RadioGroup className="space-y-3">
                        <div className={cn(
                            "flex items-center space-x-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer",
                            showAnswers && item.correct_answer === true && "bg-green-50 dark:bg-green-950/30 border-green-500 dark:border-green-700"
                        )}>
                            <RadioGroupItem value="true" id={`q${index}-true`} />
                            <Label htmlFor={`q${index}-true`} className="flex-1 cursor-pointer font-normal flex items-center justify-between">
                                <span>True</span>
                                {showExplanations && item.correct_answer === true && (
                                    <Badge variant="default" className="bg-green-600">Correct</Badge>
                                )}
                            </Label>
                        </div>
                        <div className={cn(
                            "flex items-center space-x-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer",
                            showAnswers && item.correct_answer === false && "bg-green-50 dark:bg-green-950/30 border-green-500 dark:border-green-700"
                        )}>
                            <RadioGroupItem value="false" id={`q${index}-false`} />
                            <Label htmlFor={`q${index}-false`} className="flex-1 cursor-pointer font-normal flex items-center justify-between">
                                <span>False</span>
                                {showExplanations && item.correct_answer === false && (
                                    <Badge variant="default" className="bg-green-600">Correct</Badge>
                                )}
                            </Label>
                        </div>
                    </RadioGroup>
                );

            case 'dropdown':
                return (
                    <Select>
                        <SelectTrigger className="max-w-md">
                            <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                            {item.options?.map((option, optionIndex) => (
                                <SelectItem key={optionIndex} value={optionIndex.toString()}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );

            case 'scale':
                return (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-muted-foreground">{item.scale_min_label || item.scale_min || 1}</span>
                            <div className="flex gap-2 flex-1 justify-center">
                                {Array.from({ length: (item.scale_max || 5) - (item.scale_min || 1) + 1 }, (_, i) => i + (item.scale_min || 1)).map((value) => (
                                    <Button key={value} variant="outline" className="w-12 h-12">
                                        {value}
                                    </Button>
                                ))}
                            </div>
                            <span className="text-sm text-muted-foreground">{item.scale_max_label || item.scale_max || 5}</span>
                        </div>
                    </div>
                );

            case 'date':
                return (
                    <div className="flex gap-4 items-center max-w-md">
                        <Input type="date" className="flex-1" />
                        {item.include_time && <Input type="time" className="flex-1" />}
                    </div>
                );

            case 'time':
                return (
                    <Input type="time" className="max-w-xs" />
                );

            case 'file_upload':
                return (
                    <div className="space-y-2">
                        <div className="border-2 border-dashed rounded-lg p-8 text-center hover:bg-accent/50 transition-colors cursor-pointer">
                            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground mb-2">
                                Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {item.allowed_types?.join(', ') || 'Any file type'} 
                                {item.max_file_size && ` (Max ${Math.round(item.max_file_size / 1048576)}MB)`}
                            </p>
                            {item.max_files && item.max_files > 1 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                    Up to {item.max_files} files
                                </p>
                            )}
                        </div>
                    </div>
                );

            case 'rating':
                const RatingIcon = item.rating_icon === 'HEART' ? Heart : 
                                  item.rating_icon === 'THUMB' ? ThumbsUp : Star;
                return (
                    <div className="flex gap-2">
                        {Array.from({ length: item.rating_scale || 5 }, (_, i) => i + 1).map((value) => (
                            <Button key={value} variant="outline" size="icon" className="w-12 h-12">
                                <RatingIcon className="h-5 w-5" />
                            </Button>
                        ))}
                    </div>
                );

            case 'coding':
                const isExpanded = expandedCodeEditors.has(item.question_id);
                return (
                    <div className="space-y-2">
                        {!isExpanded ? (
                            <Button
                                variant="outline"
                                className="w-full h-24 flex flex-col items-center justify-center gap-2 hover:bg-accent"
                                onClick={() => {
                                    setExpandedCodeEditors(prev => {
                                        const next = new Set(prev);
                                        next.add(item.question_id);
                                        return next;
                                    });
                                }}
                            >
                                <Code2 className="h-8 w-8" />
                                <div className="text-sm font-medium">Click to Show Code Editor</div>
                                <div className="text-xs text-muted-foreground">
                                    {item.starter_files?.length || 1} file(s)
                                </div>
                            </Button>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Code2 className="h-4 w-4" />
                                        <span>Code Editor</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setExpandedCodeEditors(prev => {
                                                const next = new Set(prev);
                                                next.delete(item.question_id);
                                                return next;
                                            });
                                        }}
                                    >
                                        <ChevronUp className="h-4 w-4 mr-1" />
                                        Hide Editor
                                    </Button>
                                </div>
                                <CodeEditor
                                    key={`preview-code-${item.question_id}`}
                                    files={item.starter_files || [{ name: 'index.html', content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Document</title>\n</head>\n<body>\n    \n</body>\n</html>\n' }]}
                                    onChange={() => {}} // Read-only in preview
                                    height="400px"
                                />
                            </div>
                        )}
                        {item.test_cases && (
                            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                                <p className="text-sm font-medium mb-2">Test Cases:</p>
                                <div className="text-sm">
                                    <VariableContent htmlContent={item.test_cases} />
                                </div>
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    // Split items by page breaks
    const getPages = () => {
        if (!examData) return [];
        const pages: ExamItem[][] = [[]];
        let currentPageIndex = 0;

        examData.items.forEach((item) => {
            if (item.question_type === 'page_break') {
                currentPageIndex++;
                pages[currentPageIndex] = [];
            } else {
                pages[currentPageIndex].push(item);
            }
        });

        return pages.filter(page => page.length > 0);
    };

    const pages = getPages();
    const hasMultiplePages = pages.length > 1;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!examData) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Exam not found</p>
            </div>
        );
    }

    const currentPageItems = hasMultiplePages ? pages[currentPage] : examData.items.filter(item => item.question_type !== 'page_break');

    return (
        <>
        <style jsx global>{`
            .ProseMirror-readonly {
                outline: none;
            }
            .ProseMirror-readonly p {
                margin: 0;
            }
            .ProseMirror-readonly ul,
            .ProseMirror-readonly ol {
                margin: 0.5em 0;
                padding-left: 1.5em;
            }
            .ProseMirror-readonly h1,
            .ProseMirror-readonly h2,
            .ProseMirror-readonly h3 {
                margin: 0.5em 0;
            }
            .ProseMirror-readonly code {
                background-color: rgba(150, 150, 150, 0.1);
                padding: 0.1em 0.3em;
                border-radius: 0.25em;
                font-family: 'Courier New', monospace;
            }
            .ProseMirror-readonly pre {
                background-color: rgba(150, 150, 150, 0.1);
                padding: 0.75em;
                border-radius: 0.375em;
                overflow-x: auto;
            }
            .ProseMirror-readonly blockquote {
                border-left: 3px solid rgba(150, 150, 150, 0.3);
                padding-left: 1em;
                margin-left: 0;
                font-style: italic;
            }
        `}</style>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => router.push(`/exam/${examId}/edit`)}
                                className="gap-2"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Editor
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            {examData && examData.items.some(item => item.question_type === 'coding') && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const codingQuestions = examData.items.filter(item => item.question_type === 'coding');
                                        const allExpanded = codingQuestions.every(item => expandedCodeEditors.has(item.question_id));
                                        
                                        if (allExpanded) {
                                            // Collapse all
                                            setExpandedCodeEditors(new Set());
                                        } else {
                                            // Expand all
                                            setExpandedCodeEditors(new Set(codingQuestions.map(item => item.question_id)));
                                        }
                                    }}
                                    className="gap-2"
                                >
                                    <Code2 className="h-4 w-4" />
                                    {expandedCodeEditors.size === 0 ? 'Show All Editors' : 'Hide All Editors'}
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowExplanations(!showExplanations)}
                                className="gap-2"
                            >
                                {showExplanations ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                {showExplanations ? 'Hide' : 'Show'} Explanations
                            </Button>
                            
                            {/* Cheating Detection Status */}
                            {examData && (
                                examData.console_detection ||
                                examData.translation_detection ||
                                examData.visibility_change_detection ||
                                examData.location_detection
                            ) && (
                                <Badge variant="outline" className="text-sm gap-1.5 border-orange-500 text-orange-700 dark:text-orange-400">
                                    🔒 Detection Active
                                </Badge>
                            )}
                            
                            <Badge variant="secondary" className="text-sm">
                                Preview Mode
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            {/* Exam Content */}
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Exam Header */}
                <Card className="mb-8 shadow-lg">
                    <CardHeader className="space-y-4">
                        <div>
                            <CardTitle className="text-3xl mb-2">{examData.exam_name}</CardTitle>
                            {examData.exam_description && (
                                <CardDescription className="text-base mt-2">
                                    <div className="ProseMirror-readonly">
                                        <VariableContent htmlContent={examData.exam_description} />
                                    </div>
                                </CardDescription>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-4 pt-4 border-t">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>{examData.duration_minutes} minutes</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline">{examData.total_points} points</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Badge variant="outline">{examData.items.filter(i => i.question_type !== 'page_break' && i.question_type !== 'section_header').length} questions</Badge>
                            </div>
                        </div>
                        {hasMultiplePages && (
                            <div className="flex items-center justify-center gap-2 pt-4">
                                <span className="text-sm text-muted-foreground">
                                    Page {currentPage + 1} of {pages.length}
                                </span>
                            </div>
                        )}
                    </CardHeader>
                </Card>

                {/* Cheating Detection Info */}
                {examData && (
                    examData.console_detection ||
                    examData.translation_detection ||
                    examData.visibility_change_detection ||
                    examData.location_detection ||
                    !examData.allow_word_by_word_translation ||
                    !examData.allow_word_by_word_definition
                ) && (
                    <Card className="mb-6 border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                🔒 Cheating Detection Enabled
                            </CardTitle>
                            <CardDescription className="text-base">
                                The following security measures are active for this exam:
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {examData.console_detection && (
                                    <div className="flex items-start gap-2 text-sm">
                                        <Badge variant="secondary" className="mt-0.5">✓</Badge>
                                        <div>
                                            <p className="font-medium">Developer Console Detection</p>
                                            <p className="text-muted-foreground text-xs">Opening DevTools will trigger a warning</p>
                                        </div>
                                    </div>
                                )}
                                {examData.visibility_change_detection && (
                                    <div className="flex items-start gap-2 text-sm">
                                        <Badge variant="secondary" className="mt-0.5">✓</Badge>
                                        <div>
                                            <p className="font-medium">Tab Switch Detection</p>
                                            <p className="text-muted-foreground text-xs">Switching tabs will be logged</p>
                                        </div>
                                    </div>
                                )}
                                {examData.translation_detection && (
                                    <div className="flex items-start gap-2 text-sm">
                                        <Badge variant="secondary" className="mt-0.5">✓</Badge>
                                        <div>
                                            <p className="font-medium">Translation Detection</p>
                                            <p className="text-muted-foreground text-xs">Translation tools will be detected</p>
                                        </div>
                                    </div>
                                )}
                                {examData.location_detection && (
                                    <div className="flex items-start gap-2 text-sm">
                                        <Badge variant="secondary" className="mt-0.5">✓</Badge>
                                        <div>
                                            <p className="font-medium">Location Tracking</p>
                                            <p className="text-muted-foreground text-xs">Physical location will be monitored</p>
                                        </div>
                                    </div>
                                )}
                                {!examData.allow_word_by_word_translation && (
                                    <div className="flex items-start gap-2 text-sm">
                                        <Badge variant="secondary" className="mt-0.5">✓</Badge>
                                        <div>
                                            <p className="font-medium">Word Translation Disabled</p>
                                            <p className="text-muted-foreground text-xs">Text selection for translation blocked</p>
                                        </div>
                                    </div>
                                )}
                                {!examData.allow_word_by_word_definition && (
                                    <div className="flex items-start gap-2 text-sm">
                                        <Badge variant="secondary" className="mt-0.5">✓</Badge>
                                        <div>
                                            <p className="font-medium">Word Definitions Disabled</p>
                                            <p className="text-muted-foreground text-xs">Text selection for definitions blocked</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-md border border-yellow-300 dark:border-yellow-800">
                                <p className="text-sm text-yellow-900 dark:text-yellow-200">
                                    <strong>Preview Mode:</strong> Try triggering these detections to see how warnings appear to students. Violations are logged in testing mode but not saved.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Questions */}
                <div className="space-y-6">
                    {currentPageItems.map((item, index) => {
                        const actualIndex = examData.items.indexOf(item);
                        
                        if (item.question_type === 'section_header') {
                            return (
                                <div key={item.question_id} className="space-y-2">
                                    <div className="flex items-start gap-3">
                                        <Heading className="h-6 w-6 text-primary mt-1 shrink-0" />
                                        <div className="flex-1">
                                            <h2 className="text-2xl font-semibold mb-2">
                                                <div className="ProseMirror-readonly">
                                                    <VariableContent htmlContent={item.question_text} />
                                                </div>
                                            </h2>
                                            {item.description && (
                                                <div className="text-muted-foreground ProseMirror-readonly">
                                                    <VariableContent htmlContent={item.description} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Separator className="mt-4" />
                                </div>
                            );
                        }

                        const questionNumber = examData.items
                            .slice(0, actualIndex)
                            .filter(i => i.question_type !== 'page_break' && i.question_type !== 'section_header')
                            .length + 1;

                        return (
                            <Card key={item.question_id} className="shadow-md hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge variant="outline">Question {questionNumber}</Badge>
                                                {item.required && (
                                                    <Badge variant="destructive" className="text-xs">Required</Badge>
                                                )}
                                                <Badge variant="secondary" className="text-xs">{item.points} pts</Badge>
                                            </div>
                                            <CardTitle className="text-xl font-medium leading-relaxed">
                                                <div className="ProseMirror-readonly">
                                                    <VariableContent htmlContent={item.question_text} />
                                                </div>
                                            </CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {renderQuestionInput(item, actualIndex, showExplanations)}
                                    
                                    {/* Explanation Section */}
                                    {showExplanations && item.explanation && (
                                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                                            <div className="flex items-start gap-2">
                                                <div className="shrink-0 mt-0.5">
                                                    <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Explanation</p>
                                                    <div className="text-sm text-blue-800 dark:text-blue-200 ProseMirror-readonly">
                                                        <VariableContent htmlContent={item.explanation} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Pagination for multi-page exams */}
                {hasMultiplePages && (
                    <div className="flex justify-between items-center mt-8 py-6">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                            disabled={currentPage === 0}
                        >
                            Previous Page
                        </Button>
                        <div className="flex gap-2">
                            {pages.map((_, index) => (
                                <Button
                                    key={index}
                                    variant={currentPage === index ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCurrentPage(index)}
                                    className="w-10"
                                >
                                    {index + 1}
                                </Button>
                            ))}
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(prev => Math.min(pages.length - 1, prev + 1))}
                            disabled={currentPage === pages.length - 1}
                        >
                            Next Page
                        </Button>
                    </div>
                )}

                {/* Submit Button */}
                <div className="mt-8 pb-8">
                    <Card className="p-6 bg-accent/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Ready to submit?</p>
                                <p className="text-sm text-muted-foreground">This is a preview. Students will see a submit button here.</p>
                            </div>
                            <Button size="lg" disabled>
                                Submit Exam
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>

        {/* Cheating Detection in Testing/Preview Mode */}
        {examData && (
            <CheatingDetection
                isTesting={true}
                consoleDetection={examData.console_detection || false}
                translationDetection={examData.translation_detection || false}
                allowWordByWordTranslation={examData.allow_word_by_word_translation || false}
                allowWordByWordDefinition={examData.allow_word_by_word_definition || false}
                visibilityChangeDetection={examData.visibility_change_detection || false}
                locationDetection={examData.location_detection || false}
                examLanguage="en-US"
            />
        )}
        </>
    );
}
