'use client';

import { useState, useEffect, use, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
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
import { Progress } from '@/components/ui/progress';
import {
    Star, Heart, ThumbsUp, Loader2, Clock, Upload, Heading,
    Code2, ChevronUp, MapPin, Terminal, Languages, Monitor,
    Shield, FileText, AlertTriangle, Ban, Lock, CheckCircle2,
    Timer, Send, Save, AlertCircle
} from 'lucide-react';
import { ExamItem } from '@/types/exam';
import { toast } from 'sonner';
import VariableContent from '@/components/ui/variable-content';
import { cn } from '@/lib/utils';
import CodeEditor from '@/components/editors/CodeEditor';
import CheatingDetection from '@/components/ui/cheating-detection';
import '@/components/editors/text-editor.css';
import dynamic from 'next/dynamic';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Dynamically import Leaflet components with SSR disabled
const MapContainer = dynamic(
    () => import('@/components/ui/leaflet-components').then((mod) => mod.MapContainer),
    { ssr: false }
);

const TileLayer = dynamic(
    () => import('@/components/ui/leaflet-components').then((mod) => mod.TileLayer),
    { ssr: false }
);

const Circle = dynamic(
    () => import('@/components/ui/leaflet-components').then((mod) => mod.Circle),
    { ssr: false }
);

const Marker = dynamic(
    () => import('@/components/ui/leaflet-components').then((mod) => mod.Marker),
    { ssr: false }
);

const MapCenterHandler = dynamic(
    () => import('@/components/ui/leaflet-components').then((mod) => ({ default: mod.MapCenterHandler })),
    { ssr: false }
);

interface PageParams {
    sessionId: string;
}

interface SessionData {
    session_id: string;
    google_course_name: string;
    start_date: string | null;
    end_date: string | null;
    status: string;
}

interface ExamData {
    exam_id: string;
    exam_name: string;
    exam_description: string;
    duration_minutes: number;
    items: ExamItem[];
    total_points: number;
    start_date: string | null;
    end_date: string | null;
    is_published: boolean;
    shuffle_items: boolean;
    show_results_immediately: boolean;
    attempts_allowed: number;
    passing_score: number;
    // Access control
    allowed_emails?: string[];
    is_public?: boolean;
    // Cheating detection settings
    console_detection?: boolean;
    translation_detection?: boolean;
    allow_word_by_word_translation?: boolean;
    allow_word_by_word_definition?: boolean;
    visibility_change_detection?: boolean;
    location_detection?: boolean;
    location?: {
        coordinates?: string;
        rangeInMeters?: string;
    };
}

type ResponseValue = string | number | number[] | boolean | null | Array<{ name: string; content: string }>;

interface Responses {
    [questionId: string]: ResponseValue;
}

export default function SessionExamPage({ params }: { params: Promise<PageParams> }) {
    const router = useRouter();
    const { user, isLoaded } = useUser();
    const { sessionId } = use(params);

    // State
    const [loading, setLoading] = useState(true);
    const [sessionData, setSessionData] = useState<SessionData | null>(null);
    const [examData, setExamData] = useState<ExamData | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [responses, setResponses] = useState<Responses>({});
    const [expandedCodeEditors, setExpandedCodeEditors] = useState<Set<string>>(new Set());
    const [mounted, setMounted] = useState(false);

    // Exam state
    const [showExam, setShowExam] = useState(false);
    const [examStarted, setExamStarted] = useState(false);
    const [attemptId, setAttemptId] = useState<string | null>(null);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSubmitDialog, setShowSubmitDialog] = useState(false);
    const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);

    // Location state
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [locationPermission, setLocationPermission] = useState<'prompt' | 'granted' | 'denied' | 'checking'>('checking');
    const [locationVerified, setLocationVerified] = useState<boolean>(false);

    const watchIdRef = useRef<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<Date | null>(null);

    useEffect(() => {
        setMounted(true);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (autoSaveRef.current) clearInterval(autoSaveRef.current);
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, []);

    useEffect(() => {
        if (isLoaded) {
            fetchSession();
        }
    }, [sessionId, isLoaded]);

    // Timer effect
    useEffect(() => {
        if (examStarted && timeRemaining !== null && timeRemaining > 0) {
            timerRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev === null || prev <= 1) {
                        // Time's up - auto submit
                        handleSubmit(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => {
                if (timerRef.current) clearInterval(timerRef.current);
            };
        }
    }, [examStarted]);

    // Auto-save effect
    useEffect(() => {
        if (examStarted && attemptId) {
            autoSaveRef.current = setInterval(() => {
                saveResponses();
            }, 30000); // Auto-save every 30 seconds

            return () => {
                if (autoSaveRef.current) clearInterval(autoSaveRef.current);
            };
        }
    }, [examStarted, attemptId, responses]);

    // Location permission check
    const checkLocationPermission = async (): Promise<'granted' | 'denied' | 'prompt'> => {
        if (!navigator.permissions) return 'prompt';
        try {
            const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
            return result.state as 'granted' | 'denied' | 'prompt';
        } catch {
            return 'prompt';
        }
    };

    const requestLocationAccess = useCallback(async (): Promise<void> => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser.');
            setLocationPermission('denied');
            return;
        }

        setLocationPermission('checking');
        setLocationError(null);

        const permissionStatus = await checkLocationPermission();
        setLocationPermission(permissionStatus);

        if (permissionStatus === 'denied') {
            setLocationError('Location access denied. Please enable location permissions.');
            return;
        }

        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                });
            });

            setCurrentLocation({
                lat: position.coords.latitude,
                lon: position.coords.longitude
            });
            setLocationError(null);
            setLocationPermission('granted');
        } catch (error: any) {
            let errorMessage = 'Failed to get location.';
            if (error.code === error.PERMISSION_DENIED) {
                errorMessage = 'Location access denied.';
                setLocationPermission('denied');
            }
            setLocationError(errorMessage);
        }
    }, []);

    // Calculate distance between coordinates
    const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c * 1000;
    }, []);

    // Location verification
    useEffect(() => {
        if (!examData?.location_detection) {
            setLocationVerified(true);
            return;
        }

        if (!currentLocation) {
            setLocationVerified(false);
            return;
        }

        if (!examData.location?.coordinates) {
            setLocationVerified(true);
            return;
        }

        const coords = examData.location.coordinates.split(',').map(Number);
        if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
            setLocationVerified(true);
            return;
        }

        const rangeInMeters = examData.location.rangeInMeters ? parseFloat(examData.location.rangeInMeters) : 100;
        const distance = calculateDistance(coords[0], coords[1], currentLocation.lat, currentLocation.lon);
        setLocationVerified(distance <= rangeInMeters);
    }, [examData?.location_detection, examData?.location, currentLocation, calculateDistance]);

    // Request location when needed
    useEffect(() => {
        if (!mounted || !examData?.location_detection) return;
        requestLocationAccess();
    }, [mounted, examData?.location_detection, requestLocationAccess]);

    const fetchSession = async () => {
        try {
            const response = await fetch(`/api/exams/sessions/${sessionId}`);
            const result = await response.json();

            if (result.success) {
                setSessionData(result.session);
                setExamData(result.exam);
            } else {
                toast.error(result.error || 'Failed to load exam session');
                router.push('/');
            }
        } catch (error) {
            console.error('Error fetching exam:', error);
            toast.error('Failed to load exam');
            router.push('/');
        } finally {
            setLoading(false);
        }
    };

    const startExam = async () => {
        if (!user) {
            toast.error('Please sign in to take this exam');
            router.push('/sign-in');
            return;
        }

        try {
            const response = await fetch('/api/exams/attempts/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, userId: user.id })
            });

            const result = await response.json();

            if (result.success) {
                setAttemptId(result.attemptId);
                setTimeRemaining(examData!.duration_minutes * 60);
                setExamStarted(true);
                startTimeRef.current = new Date();
                toast.success('Exam started! Good luck!');
            } else {
                toast.error(result.error || 'Failed to start exam');
            }
        } catch (error) {
            console.error('Error starting exam:', error);
            toast.error('Failed to start exam');
        }
    };

    const saveResponses = async () => {
        if (!attemptId) return;

        setAutoSaveStatus('saving');
        try {
            const response = await fetch('/api/exams/attempts/save', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ attemptId, responses })
            });

            if (response.ok) {
                setAutoSaveStatus('saved');
                setTimeout(() => setAutoSaveStatus(null), 2000);
            } else {
                setAutoSaveStatus('error');
            }
        } catch (error) {
            console.error('Error saving responses:', error);
            setAutoSaveStatus('error');
        }
    };

    const handleSubmit = async (autoSubmit = false) => {
        if (!attemptId) return;

        if (!autoSubmit) {
            // Check for unanswered required questions
            const unansweredRequired = examData?.items.filter(item =>
                item.required &&
                item.question_type !== 'section_header' &&
                item.question_type !== 'page_break' &&
                !responses[item.question_id]
            );

            if (unansweredRequired && unansweredRequired.length > 0) {
                toast.error(`Please answer all required questions (${unansweredRequired.length} remaining)`);
                return;
            }
        }

        setIsSubmitting(true);
        setShowSubmitDialog(false);

        try {
            const timeSpent = startTimeRef.current
                ? Math.floor((new Date().getTime() - startTimeRef.current.getTime()) / 1000)
                : 0;

            const response = await fetch('/api/exams/attempts/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attemptId,
                    responses,
                    timeSpent,
                    autoSubmitted: autoSubmit
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success(autoSubmit ? 'Time\'s up! Exam submitted.' : 'Exam submitted successfully!');

                if (examData?.show_results_immediately) {
                    router.push(`/exam/${examData?.exam_id}/results/${attemptId}`);
                } else {
                    router.push(`/exam/${examData?.exam_id}/submitted`);
                }
            } else {
                toast.error(result.error || 'Failed to submit exam');
                setIsSubmitting(false);
            }
        } catch (error) {
            console.error('Error submitting exam:', error);
            toast.error('Failed to submit exam');
            setIsSubmitting(false);
        }
    };

    const updateResponse = (questionId: string, value: ResponseValue) => {
        setResponses(prev => ({ ...prev, [questionId]: value }));
    };

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const renderQuestionInput = (item: ExamItem) => {
        const value = responses[item.question_id];

        switch (item.question_type) {
            case 'multiple_choice':
                return (
                    <RadioGroup
                        className="space-y-3"
                        value={value?.toString() || ''}
                        onValueChange={(v) => updateResponse(item.question_id, parseInt(v))}
                    >
                        {item.options?.map((option, optionIndex) => (
                            <div
                                key={optionIndex}
                                className={cn(
                                    "flex items-start space-x-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer",
                                    value === optionIndex && "bg-primary/10 border-primary"
                                )}
                            >
                                <RadioGroupItem value={optionIndex.toString()} id={`q${item.question_id}-opt${optionIndex}`} className="mt-1.5 shrink-0" />
                                <Label htmlFor={`q${item.question_id}-opt${optionIndex}`} className="flex-1 cursor-pointer font-normal">
                                    <div className="ProseMirror-readonly">
                                        <VariableContent htmlContent={option} />
                                    </div>
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                );

            case 'multiple_select':
                const selectedValues = (Array.isArray(value) ? value : []) as number[];
                return (
                    <div className="space-y-3">
                        {item.options?.map((option, optionIndex) => {
                            const isSelected = selectedValues.includes(optionIndex);
                            return (
                                <div
                                    key={optionIndex}
                                    className={cn(
                                        "flex items-start space-x-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer",
                                        isSelected && "bg-primary/10 border-primary"
                                    )}
                                    onClick={() => {
                                        const newValue = isSelected
                                            ? selectedValues.filter(v => v !== optionIndex)
                                            : [...selectedValues, optionIndex];
                                        updateResponse(item.question_id, newValue);
                                    }}
                                >
                                    <Checkbox
                                        id={`q${item.question_id}-opt${optionIndex}`}
                                        className="mt-1.5 shrink-0"
                                        checked={isSelected}
                                        onCheckedChange={() => {
                                            const newValue = isSelected
                                                ? selectedValues.filter(v => v !== optionIndex)
                                                : [...selectedValues, optionIndex];
                                            updateResponse(item.question_id, newValue);
                                        }}
                                    />
                                    <Label htmlFor={`q${item.question_id}-opt${optionIndex}`} className="flex-1 cursor-pointer font-normal">
                                        <div className="ProseMirror-readonly">
                                            <VariableContent htmlContent={option} />
                                        </div>
                                    </Label>
                                </div>
                            );
                        })}
                    </div>
                );

            case 'short_answer':
                return (
                    <Input
                        placeholder="Enter your answer"
                        className="max-w-xl"
                        value={(value as string) || ''}
                        onChange={(e) => updateResponse(item.question_id, e.target.value)}
                    />
                );

            case 'long_answer':
                return (
                    <Textarea
                        placeholder="Enter your answer"
                        className="min-h-[150px]"
                        value={(value as string) || ''}
                        onChange={(e) => updateResponse(item.question_id, e.target.value)}
                    />
                );

            case 'true_false':
                return (
                    <RadioGroup
                        className="space-y-3"
                        value={value === true ? 'true' : value === false ? 'false' : ''}
                        onValueChange={(v) => updateResponse(item.question_id, v === 'true')}
                    >
                        <div className={cn(
                            "flex items-center space-x-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer",
                            value === true && "bg-primary/10 border-primary"
                        )}>
                            <RadioGroupItem value="true" id={`q${item.question_id}-true`} />
                            <Label htmlFor={`q${item.question_id}-true`} className="flex-1 cursor-pointer font-normal">
                                True
                            </Label>
                        </div>
                        <div className={cn(
                            "flex items-center space-x-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer",
                            value === false && "bg-primary/10 border-primary"
                        )}>
                            <RadioGroupItem value="false" id={`q${item.question_id}-false`} />
                            <Label htmlFor={`q${item.question_id}-false`} className="flex-1 cursor-pointer font-normal">
                                False
                            </Label>
                        </div>
                    </RadioGroup>
                );

            case 'dropdown':
                return (
                    <Select
                        value={value?.toString() || ''}
                        onValueChange={(v) => updateResponse(item.question_id, parseInt(v))}
                    >
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
                const scaleValue = value as number | null;
                return (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-muted-foreground">{item.scale_min_label || item.scale_min || 1}</span>
                            <div className="flex gap-2 flex-1 justify-center">
                                {Array.from({ length: (item.scale_max || 5) - (item.scale_min || 1) + 1 }, (_, i) => i + (item.scale_min || 1)).map((v) => (
                                    <Button
                                        key={v}
                                        variant={scaleValue === v ? "default" : "outline"}
                                        className="w-12 h-12"
                                        onClick={() => updateResponse(item.question_id, v)}
                                    >
                                        {v}
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
                        <Input
                            type="date"
                            className="flex-1"
                            value={(value as string) || ''}
                            onChange={(e) => updateResponse(item.question_id, e.target.value)}
                        />
                        {item.include_time && (
                            <Input
                                type="time"
                                className="flex-1"
                                onChange={(e) => {
                                    const currentDate = (value as string)?.split('T')[0] || '';
                                    updateResponse(item.question_id, `${currentDate}T${e.target.value}`);
                                }}
                            />
                        )}
                    </div>
                );

            case 'time':
                return (
                    <Input
                        type="time"
                        className="max-w-xs"
                        value={(value as string) || ''}
                        onChange={(e) => updateResponse(item.question_id, e.target.value)}
                    />
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
                        </div>
                    </div>
                );

            case 'rating':
                const RatingIcon = item.rating_icon === 'HEART' ? Heart :
                                  item.rating_icon === 'THUMB' ? ThumbsUp : Star;
                const ratingValue = value as number | null;
                return (
                    <div className="flex gap-2">
                        {Array.from({ length: item.rating_scale || 5 }, (_, i) => i + 1).map((v) => (
                            <Button
                                key={v}
                                variant={ratingValue && ratingValue >= v ? "default" : "outline"}
                                size="icon"
                                className="w-12 h-12"
                                onClick={() => updateResponse(item.question_id, v)}
                            >
                                <RatingIcon className={cn("h-5 w-5", ratingValue && ratingValue >= v && "fill-current")} />
                            </Button>
                        ))}
                    </div>
                );

            case 'coding':
                const isExpanded = expandedCodeEditors.has(item.question_id);
                const codeValue = (value as Array<{ name: string; content: string }>) || item.starter_files || [{ name: 'index.html', content: '' }];
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
                                <div className="text-sm font-medium">Click to Open Code Editor</div>
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
                                        Collapse
                                    </Button>
                                </div>
                                <CodeEditor
                                    files={codeValue}
                                    onChange={(files) => updateResponse(item.question_id, files)}
                                    height="400px"
                                />
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
    const currentPageItems = hasMultiplePages ? pages[currentPage] : examData?.items.filter(item => item.question_type !== 'page_break') || [];

    // Calculate progress
    const totalQuestions = examData?.items.filter(i =>
        i.question_type !== 'page_break' && i.question_type !== 'section_header'
    ).length || 0;
    const answeredQuestions = Object.keys(responses).filter(key => responses[key] !== null && responses[key] !== '').length;
    const progressPercent = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;

    if (loading || !isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    // Require login to take exam
    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
                <Card className="max-w-md w-full text-center">
                    <CardHeader>
                        <CardTitle>Sign In Required</CardTitle>
                        <CardDescription>
                            You need to sign in to take this exam.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => router.push(`/sign-in?redirect_url=/exam/session/${sessionId}`)}>
                            Sign In to Continue
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!examData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <AlertCircle className="h-16 w-16 text-muted-foreground" />
                <h1 className="text-2xl font-bold">Exam Not Found</h1>
                <p className="text-muted-foreground">This exam doesn't exist or you don't have access to it.</p>
                <Button onClick={() => router.push('/')}>Go Home</Button>
            </div>
        );
    }

    // Check if exam is published
    if (!examData.is_published) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <AlertCircle className="h-16 w-16 text-muted-foreground" />
                <h1 className="text-2xl font-bold">Exam Not Available</h1>
                <p className="text-muted-foreground">This exam is not currently available.</p>
                <Button onClick={() => router.push('/')}>Go Home</Button>
            </div>
        );
    }

    // Pre-exam rules screen
    if (!showExam) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 p-4">
                <div className="container mx-auto max-w-4xl py-8">
                    {/* Exam Info Card */}
                    <Card className="mb-6 shadow-lg">
                        <CardHeader>
                            <CardTitle className="text-3xl mb-2">{examData.exam_name}</CardTitle>
                            {examData.exam_description && (
                                <CardDescription className="text-base mt-2">
                                    <div className="ProseMirror-readonly">
                                        <VariableContent htmlContent={examData.exam_description} />
                                    </div>
                                </CardDescription>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-4 pt-4 border-t">
                                <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <span>{examData.duration_minutes} minutes</span>
                                </div>
                                <Badge variant="outline">{examData.total_points} points</Badge>
                                <Badge variant="outline">{totalQuestions} questions</Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Rules Card */}
                    <Card className="mb-6 border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                Exam Rules
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                                    <Timer className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-sm">Time Limit</p>
                                        <p className="text-sm text-muted-foreground">
                                            You have <strong>{examData.duration_minutes} minutes</strong> to complete this exam.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                                    <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-sm">No Going Back</p>
                                        <p className="text-sm text-muted-foreground">
                                            Do not close or refresh the browser during the exam.
                                        </p>
                                    </div>
                                </div>

                                {/* Security measures */}
                                {(examData.console_detection || examData.visibility_change_detection || examData.translation_detection) && (
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200">
                                        <Shield className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-sm">Security Monitoring Active</p>
                                            <p className="text-sm text-muted-foreground">
                                                This exam monitors for cheating. Tab switching, developer tools, and translation tools may be flagged.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Location verification */}
                            {examData.location_detection && (
                                <div className="pt-4 border-t">
                                    <h3 className="font-semibold mb-3">Location Verification</h3>
                                    {locationPermission === 'checking' && (
                                        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span className="text-sm">Checking location...</span>
                                        </div>
                                    )}
                                    {locationPermission === 'prompt' && (
                                        <Button onClick={requestLocationAccess}>
                                            Grant Location Permission
                                        </Button>
                                    )}
                                    {locationPermission === 'granted' && locationVerified && (
                                        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-700">
                                            <CheckCircle2 className="h-4 w-4" />
                                            <span className="text-sm">Location verified</span>
                                        </div>
                                    )}
                                    {locationPermission === 'granted' && !locationVerified && currentLocation && (
                                        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-700">
                                            <AlertCircle className="h-4 w-4" />
                                            <span className="text-sm">You are outside the allowed area</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Start button */}
                            <div className="pt-4 border-t">
                                <Button
                                    size="lg"
                                    className="w-full"
                                    onClick={() => {
                                        if (examData.location_detection && !locationVerified) {
                                            toast.error('Please verify your location first');
                                            return;
                                        }
                                        setShowExam(true);
                                        startExam();
                                    }}
                                    disabled={examData.location_detection && !locationVerified}
                                >
                                    Start Exam
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // Exam taking interface
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
                {/* Fixed Header with Timer */}
                <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-lg border-b shadow-sm">
                    <div className="container mx-auto px-4 py-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <h1 className="font-semibold text-lg truncate max-w-[200px] md:max-w-none">
                                    {examData.exam_name}
                                </h1>
                                <Badge variant="outline">
                                    {answeredQuestions}/{totalQuestions} answered
                                </Badge>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Auto-save status */}
                                {autoSaveStatus && (
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        {autoSaveStatus === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
                                        {autoSaveStatus === 'saved' && <Save className="h-3 w-3 text-green-600" />}
                                        {autoSaveStatus === 'error' && <AlertCircle className="h-3 w-3 text-red-600" />}
                                        <span className="hidden md:inline">
                                            {autoSaveStatus === 'saving' && 'Saving...'}
                                            {autoSaveStatus === 'saved' && 'Saved'}
                                            {autoSaveStatus === 'error' && 'Save failed'}
                                        </span>
                                    </div>
                                )}

                                {/* Timer */}
                                {timeRemaining !== null && (
                                    <div className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold",
                                        timeRemaining <= 300 ? "bg-red-100 text-red-700" :
                                        timeRemaining <= 600 ? "bg-orange-100 text-orange-700" :
                                        "bg-primary/10 text-primary"
                                    )}>
                                        <Timer className="h-4 w-4" />
                                        {formatTime(timeRemaining)}
                                    </div>
                                )}

                                {/* Submit button */}
                                <Button
                                    onClick={() => setShowSubmitDialog(true)}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Send className="h-4 w-4 mr-2" />
                                    )}
                                    Submit
                                </Button>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <Progress value={progressPercent} className="mt-2 h-1" />
                    </div>
                </div>

                {/* Questions */}
                <div className="container mx-auto px-4 py-8 max-w-4xl">
                    <div className="space-y-6">
                        {currentPageItems.map((item) => {
                            if (item.question_type === 'section_header') {
                                return (
                                    <div key={item.question_id} className="space-y-2">
                                        <div className="flex items-start gap-3">
                                            <Heading className="h-6 w-6 text-primary mt-1 shrink-0" />
                                            <div className="flex-1">
                                                <h2 className="text-2xl font-semibold mb-2">
                                                    <VariableContent htmlContent={item.question_text} />
                                                </h2>
                                                {item.description && (
                                                    <div className="text-muted-foreground">
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
                                .slice(0, examData.items.indexOf(item))
                                .filter(i => i.question_type !== 'page_break' && i.question_type !== 'section_header')
                                .length + 1;

                            const hasAnswer = responses[item.question_id] !== undefined && responses[item.question_id] !== null && responses[item.question_id] !== '';

                            return (
                                <Card key={item.question_id} className={cn(
                                    "shadow-md transition-all",
                                    hasAnswer && "border-green-200 dark:border-green-900"
                                )}>
                                    <CardHeader>
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Badge variant={hasAnswer ? "default" : "outline"}>
                                                        Q{questionNumber}
                                                    </Badge>
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
                                    <CardContent>
                                        {renderQuestionInput(item)}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Pagination */}
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

                    {/* Bottom submit */}
                    <div className="mt-8 pb-8">
                        <Card className="p-6 bg-accent/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Ready to submit?</p>
                                    <p className="text-sm text-muted-foreground">
                                        {answeredQuestions}/{totalQuestions} questions answered
                                    </p>
                                </div>
                                <Button
                                    size="lg"
                                    onClick={() => setShowSubmitDialog(true)}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <Send className="h-4 w-4 mr-2" />
                                    )}
                                    Submit Exam
                                </Button>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Submit Confirmation Dialog */}
            <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You have answered {answeredQuestions} out of {totalQuestions} questions.
                            {answeredQuestions < totalQuestions && (
                                <span className="block mt-2 text-orange-600">
                                    Warning: You have {totalQuestions - answeredQuestions} unanswered questions.
                                </span>
                            )}
                            <span className="block mt-2">
                                Once submitted, you cannot change your answers.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Continue Exam</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleSubmit(false)}>
                            Submit Exam
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Cheating Detection */}
            {examData && examStarted && (
                <CheatingDetection
                    isTesting={false}
                    consoleDetection={examData.console_detection || false}
                    translationDetection={examData.translation_detection || false}
                    allowWordByWordTranslation={examData.allow_word_by_word_translation ?? true}
                    allowWordByWordDefinition={examData.allow_word_by_word_definition ?? true}
                    visibilityChangeDetection={examData.visibility_change_detection || false}
                    locationDetection={examData.location_detection || false}
                    location={examData.location}
                    examLanguage="en-US"
                    onViolation={async (violation) => {
                        try {
                            await fetch('/api/exams/log-violation', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    exam_id: examData?.exam_id,
                                    attempt_id: attemptId,
                                    violation_type: violation.type,
                                    timestamp: violation.timestamp.toISOString(),
                                }),
                            });
                        } catch (error) {
                            console.error('Failed to log violation:', error);
                        }
                    }}
                />
            )}
        </>
    );
}
