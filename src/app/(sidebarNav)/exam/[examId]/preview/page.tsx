'use client';

import { useState, useEffect, use, useCallback, useRef } from 'react';
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
import { Star, Heart, ThumbsUp, Loader2, ArrowLeft, Clock, Calendar, Upload, Heading, Eye, EyeOff, Code2, ChevronDown, ChevronUp, MapPin, Terminal, Languages, Monitor, Shield, FileText, AlertTriangle, Ban, Lock, CheckCircle2, XCircle } from 'lucide-react';
import { ExamItem } from '@/types/exam';
import { toast } from 'sonner';
import VariableContent from '@/components/ui/variable-content';
import { cn } from '@/lib/utils';
import CodeEditor from '@/components/editors/CodeEditor';
import CheatingDetection from '@/components/ui/cheating-detection';
import '@/components/editors/text-editor.css';
import dynamic from 'next/dynamic';

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
    location?: {
        coordinates?: string;
        rangeInMeters?: string;
    };
}

export default function ExamPreviewPage({ params }: { params: Promise<PageParams> }) {
    const router = useRouter();
    const { examId } = use(params);
    const [loading, setLoading] = useState(true);
    const [examData, setExamData] = useState<ExamData | null>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [showExplanations, setShowExplanations] = useState(false);
    const [expandedCodeEditors, setExpandedCodeEditors] = useState<Set<string>>(new Set());
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [locationPermission, setLocationPermission] = useState<'prompt' | 'granted' | 'denied' | 'checking'>('checking');
    const [mounted, setMounted] = useState(false);
    const [locationVerified, setLocationVerified] = useState<boolean>(false);
    const [showExam, setShowExam] = useState<boolean>(false);
    const watchIdRef = useRef<number | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        fetchExam();
    }, [examId]);

    // Check and request location permission asynchronously
    const checkLocationPermission = async (): Promise<'granted' | 'denied' | 'prompt'> => {
        if (!navigator.permissions) {
            // Fallback for browsers that don't support Permissions API
            return 'prompt';
        }

        try {
            const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
            return result.state as 'granted' | 'denied' | 'prompt';
        } catch (error) {
            // If query fails, assume we need to prompt
            console.warn('Permission query failed:', error);
            return 'prompt';
        }
    };

    // Request location permission and start tracking
    const requestLocationAccess = useCallback(async (): Promise<void> => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser.');
            setLocationPermission('denied');
            return;
        }

        setLocationPermission('checking');
        setLocationError(null);

        // Check current permission status
        const permissionStatus = await checkLocationPermission();
        setLocationPermission(permissionStatus);

        if (permissionStatus === 'denied') {
            setLocationError('Location access denied. Please enable location permissions in your browser settings.');
            return;
        }

        // Request location access
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        console.log('Location retrieved:', {
                            lat: pos.coords.latitude,
                            lon: pos.coords.longitude,
                            accuracy: pos.coords.accuracy
                        });
                        resolve(pos);
                    },
                    (err) => {
                        console.error('Location request failed:', {
                            code: err.code,
                            message: err.message,
                            PERMISSION_DENIED: err.PERMISSION_DENIED,
                            POSITION_UNAVAILABLE: err.POSITION_UNAVAILABLE,
                            TIMEOUT: err.TIMEOUT
                        });
                        reject(err);
                    },
                    { 
                        enableHighAccuracy: true, 
                        timeout: 15000,
                        maximumAge: 0 // Force fresh location
                    }
                );
            });

            const newLocation = {
                lat: position.coords.latitude,
                lon: position.coords.longitude
            };
            
            console.log('Setting current location:', newLocation);
            setCurrentLocation(newLocation);
            setLocationError(null);
            setLocationPermission('granted');
        } catch (error: any) {
            console.error('Location access error:', error);
            let errorMessage = 'Failed to get location.';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Location access denied. Please enable location permissions.';
                    setLocationPermission('denied');
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location information is unavailable. Please check your device location settings.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Location request timed out. Please try again.';
                    break;
                default:
                    errorMessage = `Location error: ${error.message || 'Unknown error'}`;
            }
            setLocationError(errorMessage);
            // Don't set permission to denied for temporary errors
            if (error.code !== error.PERMISSION_DENIED) {
                setLocationPermission('prompt');
            }
        }
    }, []);

    // Calculate distance between two coordinates (Haversine formula)
    const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c * 1000; // Return distance in meters
    }, []);

    // Check if location is within allowed range
    useEffect(() => {
        if (!examData?.location_detection) {
            // If location detection is not enabled, allow exam to be shown (but don't auto-show)
            setLocationVerified(true);
            return;
        }

        console.log('Checking location verification:', {
            hasCurrentLocation: !!currentLocation,
            currentLocation,
            hasRequiredLocation: !!examData.location?.coordinates,
            requiredLocation: examData.location?.coordinates
        });

        if (!currentLocation) {
            setLocationVerified(false);
            return;
        }

        // If no required location is set, just verify that we have current location
        if (!examData.location?.coordinates) {
            setLocationVerified(true);
            return;
        }

        // Parse required location
        const coords = examData.location.coordinates.split(',').map(Number);
        if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
            setLocationVerified(true);
            return;
        }

        const rangeInMeters = examData.location.rangeInMeters ? parseFloat(examData.location.rangeInMeters) : 100;
        const distance = calculateDistance(
            coords[0],
            coords[1],
            currentLocation.lat,
            currentLocation.lon
        );

        setLocationVerified(distance <= rangeInMeters);
    }, [examData?.location_detection, examData?.location, currentLocation, calculateDistance]);

    // Start watching location after permission is granted
    useEffect(() => {
        if (!mounted || !examData?.location_detection || locationPermission !== 'granted') {
            // Clear watch if conditions are no longer met
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            return;
        }

        // If we already have a watch running, don't set up another one
        if (watchIdRef.current !== null) {
            return;
        }

        console.log('Starting location watch...', { hasCurrentLocation: !!currentLocation });

        // Watch for location changes
        // Note: watchPosition will call the callback immediately with current position
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const newLocation = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                };
                console.log('Location updated:', newLocation);
                setCurrentLocation(newLocation);
                setLocationError(null);
            },
            (error: GeolocationPositionError) => {
                // Handle watch errors gracefully
                // Only log if it's a significant error (not just temporary issues)
                if (error.code === error.PERMISSION_DENIED) {
                    console.warn('Location watch: Permission denied');
                    setLocationPermission('denied');
                    setLocationError('Location permission was revoked. Please refresh and grant permission again.');
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    // Position unavailable is often temporary, don't spam console
                    console.debug('Location watch: Position temporarily unavailable');
                } else if (error.code === error.TIMEOUT) {
                    // Timeout is often temporary, don't spam console
                    console.debug('Location watch: Request timeout');
                } else {
                    // Unknown error
                    console.warn('Location watch error:', {
                        code: error.code,
                        message: error.message,
                        PERMISSION_DENIED: error.PERMISSION_DENIED,
                        POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
                        TIMEOUT: error.TIMEOUT
                    });
                }
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );

        watchIdRef.current = watchId;

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mounted, examData?.location_detection, locationPermission, requestLocationAccess]);

    // Request location access when location detection is enabled
    useEffect(() => {
        if (!mounted || !examData?.location_detection) {
            if (!examData?.location_detection) {
                setLocationPermission('checking');
            }
            return;
        }

        console.log('Requesting location access...', {
            mounted,
            locationDetection: examData.location_detection,
            currentPermission: locationPermission
        });
        requestLocationAccess();
    }, [mounted, examData?.location_detection, requestLocationAccess]);

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

    // Calculate distance if location is required
    const getLocationDistance = (): number | null => {
        if (!examData?.location_detection || !examData.location?.coordinates || !currentLocation) {
            return null;
        }
        const coords = examData.location.coordinates.split(',').map(Number);
        if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
            return null;
        }
        return calculateDistance(coords[0], coords[1], currentLocation.lat, currentLocation.lon);
    };

    const locationDistance = getLocationDistance();
    const rangeInMeters = examData?.location?.rangeInMeters ? parseFloat(examData.location.rangeInMeters) : 100;

    // Show rules screen if exam is not shown yet
    if (!showExam) {
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
                            <Badge variant="secondary" className="text-sm">
                                Preview Mode
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Rules Screen */}
                <div className="container mx-auto px-4 py-8 max-w-4xl">
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
                        </CardContent>
                    </Card>

                    {/* Exam Rules and Security Measures */}
                    <Card className="mb-6 border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                📋 Exam Rules & Security Measures
                            </CardTitle>
                            <CardDescription className="text-base">
                                Please read and understand the following rules before starting the exam:
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* General Rules */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-3">
                                    <FileText className="h-5 w-5 text-primary" />
                                    <h3 className="font-semibold text-base">General Rules</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                                        <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="font-medium text-sm mb-1">Time Limit</p>
                                            <p className="text-sm text-muted-foreground">
                                                You have <span className="font-semibold text-foreground">{examData.duration_minutes} minutes</span> to complete this exam. The timer starts when you begin and cannot be paused.
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                                        <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="font-medium text-sm mb-1">Exam Structure</p>
                                            <p className="text-sm text-muted-foreground">
                                                This exam contains <span className="font-semibold text-foreground">{examData.items.filter(i => i.question_type !== 'page_break' && i.question_type !== 'section_header').length} questions</span> worth <span className="font-semibold text-foreground">{examData.total_points} points</span> total. Review all questions before submitting.
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                                        <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="font-medium text-sm mb-1">Browser Navigation</p>
                                            <p className="text-sm text-muted-foreground">
                                                Do not close the browser tab, navigate away, or refresh the page during the exam. Doing so may result in loss of progress or automatic submission.
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-start gap-3 p-3 rounded-lg bg-background border">
                                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="font-medium text-sm mb-1">Answer Review</p>
                                            <p className="text-sm text-muted-foreground">
                                                Answer all questions carefully and review your responses before submitting. Once submitted, answers cannot be changed.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Security Measures */}
                            {(examData.console_detection ||
                                examData.translation_detection ||
                                examData.visibility_change_detection ||
                                examData.location_detection ||
                                !examData.allow_word_by_word_translation ||
                                !examData.allow_word_by_word_definition) && (
                                <div className="space-y-3 pt-4 border-t">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                        <h3 className="font-semibold text-base">Security Measures</h3>
                                    </div>
                                    <div className="space-y-3">
                                        {examData.console_detection && (
                                            <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                                                <Terminal className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-semibold text-sm">Developer Console Detection</p>
                                                        <Badge variant="destructive" className="text-xs">Active</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-2">
                                                        Opening browser developer tools (F12, Ctrl+Shift+I, or right-click → Inspect) will be immediately detected and logged as a violation.
                                                    </p>
                                                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-900 dark:text-red-200">
                                                        <strong>Warning:</strong> Multiple console access attempts may result in automatic exam disqualification or submission.
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {examData.visibility_change_detection && (
                                            <div className="flex items-start gap-3 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                                                <Monitor className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-semibold text-sm">Tab Switch & Window Focus Detection</p>
                                                        <Badge variant="destructive" className="text-xs">Active</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-2">
                                                        Switching to another browser tab, minimizing the window, or losing focus from the exam page will be automatically logged and tracked.
                                                    </p>
                                                    <div className="mt-2 p-2 bg-orange-100 dark:bg-orange-900/30 rounded text-xs text-orange-900 dark:text-orange-200">
                                                        <strong>Warning:</strong> Multiple tab switches or focus losses may trigger automatic exam submission to prevent cheating.
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {examData.translation_detection && (
                                            <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                                                <Languages className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-semibold text-sm">Translation Tool Detection</p>
                                                        <Badge variant="destructive" className="text-xs">Active</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-2">
                                                        The system monitors for browser extensions, translation services, and automated translation tools. Any detected translation activity will be flagged as a violation.
                                                    </p>
                                                    <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded text-xs text-yellow-900 dark:text-yellow-200">
                                                        <strong>Note:</strong> Using translation tools or services during the exam is strictly prohibited and will result in penalties.
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {examData.location_detection && (
                                            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                                                <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-semibold text-sm">Location Tracking & Verification</p>
                                                        <Badge variant="destructive" className="text-xs">Active</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-2">
                                                        Your physical location is continuously monitored throughout the exam using GPS coordinates. You must be at the authorized location to start and complete the exam.
                                                    </p>
                                                    <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-900 dark:text-blue-200">
                                                        <strong>Requirement:</strong> Location permission must be granted, and you must remain within the allowed area during the entire exam duration.
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {!examData.allow_word_by_word_translation && (
                                            <div className="flex items-start gap-3 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                                                <Ban className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-semibold text-sm">Word-by-Word Translation Blocked</p>
                                                        <Badge variant="secondary" className="text-xs">Restricted</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-2">
                                                        Text selection for translation purposes is disabled. You cannot select text to translate using browser features or extensions.
                                                    </p>
                                                    <div className="mt-2 p-2 bg-purple-100 dark:bg-purple-900/30 rounded text-xs text-purple-900 dark:text-purple-200">
                                                        <strong>Restriction:</strong> Right-click context menus and text selection for translation services are blocked.
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {!examData.allow_word_by_word_definition && (
                                            <div className="flex items-start gap-3 p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800">
                                                <Lock className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-semibold text-sm">Word Definition Lookup Blocked</p>
                                                        <Badge variant="secondary" className="text-xs">Restricted</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-2">
                                                        Text selection for dictionary definitions and word lookups is disabled. You cannot select text to look up definitions using browser features or extensions.
                                                    </p>
                                                    <div className="mt-2 p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded text-xs text-indigo-900 dark:text-indigo-200">
                                                        <strong>Restriction:</strong> Right-click context menus and text selection for dictionary services are blocked.
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Location Verification Status */}
                            {examData.location_detection && (
                                <div className="pt-4 border-t space-y-3">
                                    <h3 className="font-semibold text-base">Location Verification:</h3>
                                    {locationPermission === 'checking' && (
                                        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                                                <p className="text-sm text-blue-900 dark:text-blue-100">Checking location permission...</p>
                                            </div>
                                        </div>
                                    )}
                                    {locationPermission === 'prompt' && (
                                        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                            <p className="text-sm text-blue-900 dark:text-blue-100 mb-3">
                                                Location permission is required to verify you are at the correct location.
                                            </p>
                                            <Button
                                                onClick={requestLocationAccess}
                                                variant="default"
                                                size="sm"
                                            >
                                                Grant Location Permission
                                            </Button>
                                        </div>
                                    )}
                                    {locationPermission === 'denied' && (
                                        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                                            <p className="text-sm text-red-900 dark:text-red-200 mb-3">
                                                {locationError || 'Location access denied. Please enable location permissions in your browser settings.'}
                                            </p>
                                            <Button
                                                onClick={requestLocationAccess}
                                                variant="outline"
                                                size="sm"
                                            >
                                                Retry Permission Request
                                            </Button>
                                        </div>
                                    )}
                                    {locationPermission === 'granted' && !currentLocation && (
                                        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                                                <p className="text-sm text-blue-900 dark:text-blue-100">Permission granted. Retrieving your location...</p>
                                            </div>
                                        </div>
                                    )}
                                    {locationPermission === 'granted' && currentLocation && (
                                        <div className={cn(
                                            "p-4 rounded-lg border",
                                            locationVerified
                                                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                                                : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                                        )}>
                                            {locationDistance !== null && examData.location?.coordinates ? (
                                                <>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        {locationVerified ? (
                                                            <Badge variant="default" className="bg-green-600">✓ Location Verified</Badge>
                                                        ) : (
                                                            <Badge variant="destructive">✗ Outside Allowed Range</Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm mb-1">
                                                        <span className="font-medium">Distance from required location:</span>{' '}
                                                        <span className={cn(
                                                            "font-mono font-semibold",
                                                            locationVerified ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                                                        )}>
                                                            {locationDistance.toFixed(0)}m / {rangeInMeters}m
                                                        </span>
                                                    </p>
                                                    {!locationVerified && (
                                                        <p className="text-xs text-red-700 dark:text-red-300 mt-2">
                                                            You must be within {rangeInMeters}m of the required location to start the exam.
                                                        </p>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="default" className="bg-green-600">✓ Location Tracking Active</Badge>
                                                    <p className="text-sm text-muted-foreground">Your location is being monitored</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Start Exam Button */}
                            <div className="pt-4 border-t">
                                <Button
                                    onClick={() => {
                                        if (!examData.location_detection || locationVerified) {
                                            setShowExam(true);
                                        } else {
                                            if (!currentLocation) {
                                                toast.error('Please wait for your location to be retrieved');
                                            } else {
                                                toast.error('Please verify your location before starting the exam');
                                            }
                                        }
                                    }}
                                    disabled={examData.location_detection && !locationVerified}
                                    size="lg"
                                    className="w-full"
                                >
                                    {examData.location_detection && !locationVerified
                                        ? locationPermission === 'granted' && !currentLocation
                                            ? 'Retrieving Location...'
                                            : 'Location Verification Required'
                                        : 'Start Exam'}
                                </Button>
                                {examData.location_detection && !locationVerified && (
                                    <p className="text-xs text-muted-foreground text-center mt-2">
                                        {locationPermission === 'granted' && !currentLocation
                                            ? 'Please wait while we retrieve your location'
                                            : 'You must be at the correct location to start the exam'}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            </>
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
                            <div className="flex items-center gap-2">
                                <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                                <CardTitle className="text-lg">Security Measures Active</CardTitle>
                            </div>
                            <CardDescription className="text-base">
                                The following security measures are monitoring this exam session:
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {examData.console_detection && (
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                                    <Terminal className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-semibold text-sm">Developer Console Detection</p>
                                            <Badge variant="destructive" className="text-xs">Active</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Opening browser developer tools (F12, Ctrl+Shift+I) will trigger immediate warnings and may result in disqualification.
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            {examData.visibility_change_detection && (
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                                    <Monitor className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-semibold text-sm">Tab Switch & Focus Detection</p>
                                            <Badge variant="destructive" className="text-xs">Active</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Switching tabs, minimizing the window, or losing focus will be logged. Multiple violations may trigger automatic submission.
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            {examData.translation_detection && (
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
                                    <Languages className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-semibold text-sm">Translation Tool Detection</p>
                                            <Badge variant="destructive" className="text-xs">Active</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Browser extensions, translation services, and automated translation tools are monitored and will be flagged as violations.
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            {examData.location_detection && (
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                                    <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-semibold text-sm">Location Tracking</p>
                                            <Badge variant="destructive" className="text-xs">Active</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Your physical location is continuously monitored using GPS coordinates throughout the exam session.
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            {!examData.allow_word_by_word_translation && (
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                                    <Ban className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-semibold text-sm">Word Translation Blocked</p>
                                            <Badge variant="secondary" className="text-xs">Restricted</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Text selection for translation purposes is disabled. Right-click context menus and translation services are blocked.
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            {!examData.allow_word_by_word_definition && (
                                <div className="flex items-start gap-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800">
                                    <Lock className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-semibold text-sm">Word Definition Lookup Blocked</p>
                                            <Badge variant="secondary" className="text-xs">Restricted</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Text selection for dictionary definitions is disabled. Right-click context menus and dictionary services are blocked.
                                        </p>
                                    </div>
                                </div>
                            )}
                            
                            <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-md border border-yellow-300 dark:border-yellow-800">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                                    <p className="text-sm text-yellow-900 dark:text-yellow-200">
                                        <strong>Preview Mode:</strong> Try triggering these detections to see how warnings appear to students. Violations are logged in testing mode but not saved.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Location Map - Show current location */}
                {examData?.location_detection && mounted && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                Current Location
                            </CardTitle>
                            <CardDescription>
                                Your current location is being monitored. The map shows your position and the allowed area (if configured).
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {locationPermission === 'checking' && !locationError && !currentLocation && (
                                <div className="flex items-center justify-center h-[400px] bg-muted rounded-lg">
                                    <div className="text-center space-y-2">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                                        <p className="text-sm text-muted-foreground">Requesting location permission...</p>
                                    </div>
                                </div>
                            )}
                            {locationPermission === 'prompt' && !currentLocation && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                        <p className="text-sm text-blue-900 dark:text-blue-200 mb-3">
                                            Location permission is required to show your current location on the map.
                                        </p>
                                        <Button
                                            onClick={requestLocationAccess}
                                            variant="default"
                                            size="sm"
                                        >
                                            Grant Location Permission
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {locationPermission === 'denied' && !currentLocation && (
                                <div className="space-y-4">
                                    <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                                        <p className="text-sm text-red-900 dark:text-red-200 mb-3">
                                            {locationError || 'Location access denied. Please enable location permissions in your browser settings.'}
                                        </p>
                                        <Button
                                            onClick={requestLocationAccess}
                                            variant="outline"
                                            size="sm"
                                        >
                                            Retry Permission Request
                                        </Button>
                                    </div>
                                </div>
                            )}
                            {locationError && locationPermission !== 'denied' && locationPermission !== 'prompt' && !currentLocation && (
                                <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                                    <p className="text-sm text-red-900 dark:text-red-200 mb-3">{locationError}</p>
                                    <Button
                                        onClick={requestLocationAccess}
                                        variant="outline"
                                        size="sm"
                                    >
                                        Retry
                                    </Button>
                                </div>
                            )}
                            {currentLocation && (
                                <div className="space-y-4">
                                    <div className="border rounded-lg overflow-hidden" style={{ height: '400px' }}>
                                        <MapContainer
                                            center={[currentLocation.lat, currentLocation.lon]}
                                            zoom={15}
                                            style={{ height: '100%', width: '100%' }}
                                            scrollWheelZoom={true}
                                            zoomControl={true}
                                            className="rounded-lg"
                                        >
                                            <TileLayer
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                                                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                                                subdomains="abcd"
                                                maxZoom={19}
                                            />
                                            <MapCenterHandler center={[currentLocation.lat, currentLocation.lon]} />
                                            
                                            {/* Current location marker */}
                                            <Marker position={[currentLocation.lat, currentLocation.lon]} />
                                            
                                            {/* Required location and range if configured */}
                                            {examData.location?.coordinates && (() => {
                                                const coords = examData.location.coordinates.split(',').map(Number);
                                                if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                                                    const rangeInMeters = examData.location.rangeInMeters ? parseFloat(examData.location.rangeInMeters) : 100;
                                                    return (
                                                        <>
                                                            <Marker 
                                                                position={[coords[0], coords[1]]}
                                                            />
                                                            <Circle
                                                                center={[coords[0], coords[1]]}
                                                                radius={rangeInMeters}
                                                                pathOptions={{
                                                                    color: '#3b82f6',
                                                                    fillColor: '#3b82f6',
                                                                    fillOpacity: 0.2,
                                                                    weight: 2,
                                                                    opacity: 0.8,
                                                                }}
                                                            />
                                                        </>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </MapContainer>
                                    </div>
                                    
                                    {/* Location info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-muted/50 rounded-lg">
                                            <p className="text-sm font-medium mb-2">Your Current Location</p>
                                            <div className="space-y-1 text-sm">
                                                <div>
                                                    <span className="text-muted-foreground">Latitude:</span>{' '}
                                                    <span className="font-mono">{currentLocation.lat.toFixed(6)}</span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Longitude:</span>{' '}
                                                    <span className="font-mono">{currentLocation.lon.toFixed(6)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {examData.location?.coordinates && (() => {
                                            const coords = examData.location.coordinates.split(',').map(Number);
                                            if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                                                const rangeInMeters = examData.location.rangeInMeters ? parseFloat(examData.location.rangeInMeters) : 100;
                                                // Calculate distance
                                                const R = 6371; // Earth's radius in km
                                                const dLat = (coords[0] - currentLocation.lat) * (Math.PI / 180);
                                                const dLon = (coords[1] - currentLocation.lon) * (Math.PI / 180);
                                                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                                    Math.cos(currentLocation.lat * (Math.PI / 180)) * Math.cos(coords[0] * (Math.PI / 180)) *
                                                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
                                                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                                                const distanceKm = R * c;
                                                const distanceMeters = distanceKm * 1000;
                                                const isWithinRange = distanceMeters <= rangeInMeters;
                                                
                                                return (
                                                    <div className={cn(
                                                        "p-4 rounded-lg",
                                                        isWithinRange 
                                                            ? "bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
                                                            : "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
                                                    )}>
                                                        <p className="text-sm font-medium mb-2">Required Location</p>
                                                        <div className="space-y-1 text-sm">
                                                            <div>
                                                                <span className="text-muted-foreground">Distance:</span>{' '}
                                                                <span className={cn(
                                                                    "font-mono font-semibold",
                                                                    isWithinRange ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"
                                                                )}>
                                                                    {distanceMeters.toFixed(0)}m / {rangeInMeters}m
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <Badge variant={isWithinRange ? "default" : "destructive"}>
                                                                    {isWithinRange ? "Within Range" : "Outside Range"}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                </div>
                            )}
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
                location={examData.location}
                examLanguage="en-US"
            />
        )}
        </>
    );
}
