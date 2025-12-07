"use client"
import { useEffect, useState, useRef, useCallback } from 'react';
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
import { Badge } from './badge';

export type ViolationType = 
    | 'console' 
    | 'visibility' 
    | 'translation' 
    | 'location' 
    | 'context_menu';

export interface Violation {
    type: ViolationType;
    timestamp: Date;
    acknowledged: boolean;
}

interface LocationData {
    coordinates?: string; // "latitude,longitude"
    rangeInMeters?: string;
}

export default function CheatingDetection(
    {
        isTesting = false,
        consoleDetection = false,
        translationDetection = false,
        allowWordByWordTranslation = false,
        allowWordByWordDefinition = false,
        visibilityChangeDetection = false,
        locationDetection = false,
        location,
        examLanguage = "en-US",
        onViolation,
    }:{
        isTesting?: boolean, 
        consoleDetection?: boolean, 
        translationDetection?: boolean, 
        allowWordByWordTranslation?: boolean,
        allowWordByWordDefinition?: boolean,
        visibilityChangeDetection?: boolean, 
        locationDetection?: boolean,
        location?: LocationData,
        examLanguage?: string,
        onViolation?: (violation: Violation) => void;
    } = {}
){
    // States
    const [violations, setViolations] = useState<Violation[]>([]);
    const [showDialog, setShowDialog] = useState(false);
    const [currentViolation, setCurrentViolation] = useState<ViolationType | null>(null);
    const [visibilityCount, setVisibilityCount] = useState(0);
    const [isConsoleAcknowledged, setIsConsoleAcknowledged] = useState(false);
    
    // Refs
    const initialLocation = useRef<GeolocationPosition | null>(null);
    const locationWatchId = useRef<number | null>(null);
    const isTranslated = useRef(false);

    // Add violation handler
    const addViolation = useCallback((type: ViolationType) => {
        const violation: Violation = {
            type,
            timestamp: new Date(),
            acknowledged: false
        };
        
        setViolations(prev => [...prev, violation]);
        setCurrentViolation(type);
        setShowDialog(true);
        
        onViolation?.(violation);
        
        // Log to console if in testing mode
        if (isTesting) {
            console.warn(`[Cheating Detection] ${type} violation detected at ${violation.timestamp.toISOString()}`);
        }
    }, [isTesting, onViolation]);

    // 1. Console Detection (DevTools)
    useEffect(() => {
        if (!consoleDetection) return;

        const checkConsole = () => {
            if (!isConsoleAcknowledged) {
                const before = Date.now();
                // eslint-disable-next-line no-debugger
                debugger;
                const after = Date.now();
                
                // If debugger paused execution for more than 100ms, console is open
                if (after - before > 100) {
                    addViolation('console');
                }
            }
        };

        const intervalId = setInterval(checkConsole, 2000); // Check every 2 seconds
        return () => clearInterval(intervalId);
    }, [consoleDetection, isConsoleAcknowledged, addViolation]);

    // 2. Visibility Change Detection (Tab switching)
    useEffect(() => {
        if (!visibilityChangeDetection) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                setVisibilityCount(prev => prev + 1);
                addViolation('visibility');
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [visibilityChangeDetection, addViolation]);

    // 3. Translation Detection
    useEffect(() => {
        if (!translationDetection) return;

        // Detect translation by checking HTML element classList
        const checkTranslation = () => {
            // Check if HTML element has translation classes (translated-ltr or translated-rtl)
            const htmlElement = document.documentElement;
            const hasTranslationClass = htmlElement.classList.contains('translated-ltr') || 
                                       htmlElement.classList.contains('translated-rtl');
            
            if (hasTranslationClass && !isTranslated.current) {
                isTranslated.current = true;
                addViolation('translation');
            }
        };

        // Check immediately and then periodically
        checkTranslation();
        const intervalId = setInterval(checkTranslation, 3000);

        // Observe the HTML element for class changes
        const observer = new MutationObserver(checkTranslation);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => {
            clearInterval(intervalId);
            observer.disconnect();
        };
    }, [translationDetection, addViolation]);

    // 4. Context Menu Detection (Right-click for translation/definition)
    useEffect(() => {
        if (allowWordByWordTranslation && allowWordByWordDefinition) return;

        const handleContextMenu = (e: MouseEvent) => {
            // Check if text is selected
            const selection = window.getSelection();
            const hasSelection = selection && selection.toString().length > 0;

            if (hasSelection) {
                if (!allowWordByWordTranslation && !allowWordByWordDefinition) {
                    e.preventDefault();
                    addViolation('context_menu');
                }
            }
        };

        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, [allowWordByWordTranslation, allowWordByWordDefinition, addViolation]);

    // 5. Disable text selection if word-by-word features are not allowed
    useEffect(() => {
        if (allowWordByWordTranslation && allowWordByWordDefinition) return;

        const style = document.createElement('style');
        style.textContent = `
            .exam-content {
                -webkit-user-select: ${allowWordByWordTranslation || allowWordByWordDefinition ? 'text' : 'none'};
                -moz-user-select: ${allowWordByWordTranslation || allowWordByWordDefinition ? 'text' : 'none'};
                -ms-user-select: ${allowWordByWordTranslation || allowWordByWordDefinition ? 'text' : 'none'};
                user-select: ${allowWordByWordTranslation || allowWordByWordDefinition ? 'text' : 'none'};
            }
        `;
        document.head.appendChild(style);

        return () => {
            // // Safely remove the style element if it still exists
            // if (style && style.parentNode === document.head) {
            //     document.head.removeChild(style);
            // }
        };
    }, [allowWordByWordTranslation, allowWordByWordDefinition]);

    // 6. Location Detection
    useEffect(() => {
        if (!locationDetection || !navigator.geolocation) return;

        // Parse location settings
        const rangeInMeters = location?.rangeInMeters ? parseFloat(location.rangeInMeters) : 100;
        const rangeInKm = rangeInMeters / 1000; // Convert to kilometers for distance calculation
        
        // Parse required location if provided
        let requiredLocation: { lat: number; lon: number } | null = null;
        if (location?.coordinates) {
            const coords = location.coordinates.split(',').map(Number);
            if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                requiredLocation = { lat: coords[0], lon: coords[1] };
            }
        }

        // Get initial location
        navigator.geolocation.getCurrentPosition(
            (position) => {
                initialLocation.current = position;
                
                // If a required location is set, check if initial location is within range
                if (requiredLocation) {
                    const distance = calculateDistance(
                        requiredLocation.lat,
                        requiredLocation.lon,
                        position.coords.latitude,
                        position.coords.longitude
                    );
                    
                    // If outside allowed range, flag as violation
                    if (distance > rangeInKm) {
                        addViolation('location');
                    }
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
            },
            { enableHighAccuracy: true }
        );

        // Watch for location changes
        locationWatchId.current = navigator.geolocation.watchPosition(
            (position) => {
                if (requiredLocation) {
                    // Check against required location
                    const distance = calculateDistance(
                        requiredLocation.lat,
                        requiredLocation.lon,
                        position.coords.latitude,
                        position.coords.longitude
                    );
                    
                    // If outside allowed range, flag as violation
                    if (distance > rangeInKm) {
                        addViolation('location');
                    }
                } else if (initialLocation.current) {
                    // Fallback: Check movement from initial position
                    const distance = calculateDistance(
                        initialLocation.current.coords.latitude,
                        initialLocation.current.coords.longitude,
                        position.coords.latitude,
                        position.coords.longitude
                    );

                    // If moved more than allowed range, flag as suspicious
                    if (distance > rangeInKm) {
                        addViolation('location');
                    }
                }
            },
            (error) => {
                console.error('Geolocation watch error:', error);
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
        );

        return () => {
            if (locationWatchId.current !== null) {
                navigator.geolocation.clearWatch(locationWatchId.current);
            }
        };
    }, [locationDetection, location, addViolation]);

    // Helper: Calculate distance between two coordinates (Haversine formula)
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Earth's radius in km
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const toRad = (degrees: number): number => {
        return degrees * (Math.PI / 180);
    };

    // Get dialog content based on violation type
    const getDialogContent = () => {
        switch (currentViolation) {
            case 'console':
                return {
                    title: 'Developer Tools Detected',
                    description: (
                        <>
                            We&apos;ve detected that you have opened the developer tools.
                            {isTesting ? (
                                <>
                                    <br/><br/>
                                    <span className='text-yellow-700 dark:text-yellow-400'>
                                        This is a preview mode. In an actual exam, this action will be logged.
                                    </span>
                                </>
                            ) : (
                                <>
                                    <br/><br/>
                                    <span className='text-red-700 dark:text-red-400'>
                                        This action has been logged for security purposes. <br/> 
                                        <span className='font-bold'>Your teacher will be notified, and your score may be disqualified.</span>
                                    </span>
                                </>
                            )}
                        </>
                    )
                };
            case 'visibility':
                return {
                    title: 'Tab Switch Detected',
                    description: (
                        <>
                            We detected that you switched tabs or minimized the window.
                            <br/><br/>
                            <Badge variant="destructive" className="mb-2">Violations: {visibilityCount}</Badge>
                            <br/>
                            {isTesting ? (
                                <span className='text-yellow-700 dark:text-yellow-400'>
                                    This is a preview. In an actual exam, multiple violations may result in automatic submission.
                                </span>
                            ) : (
                                <span className='text-red-700 dark:text-red-400'>
                                    This action has been logged. Multiple violations may result in automatic submission.
                                </span>
                            )}
                        </>
                    )
                };
            case 'translation':
                return {
                    title: 'Translation Detected',
                    description: (
                        <>
                            We detected that you attempted to translate the exam content.
                            <br/><br/>
                            {isTesting ? (
                                <span className='text-yellow-700 dark:text-yellow-400'>
                                    This is a preview. In an actual exam, using translation tools is not allowed.
                                </span>
                            ) : (
                                <span className='text-red-700 dark:text-red-400'>
                                    Using translation tools is not permitted during this exam. This action has been logged.
                                </span>
                            )}
                        </>
                    )
                };
            case 'location':
                return {
                    title: 'Location Change Detected',
                    description: (
                        <>
                            We detected a significant change in your location.
                            <br/><br/>
                            {isTesting ? (
                                <span className='text-yellow-700 dark:text-yellow-400'>
                                    This is a preview. In an actual exam, location changes are monitored.
                                </span>
                            ) : (
                                <span className='text-red-700 dark:text-red-400'>
                                    You should remain in the same location throughout the exam. This action has been logged.
                                </span>
                            )}
                        </>
                    )
                };
            case 'context_menu':
                return {
                    title: 'Restricted Action Detected',
                    description: (
                        <>
                            Right-click and text selection for translation/definition lookup are not allowed.
                            <br/><br/>
                            {isTesting ? (
                                <span className='text-yellow-700 dark:text-yellow-400'>
                                    This is a preview. In an actual exam, this action will be logged.
                                </span>
                            ) : (
                                <span className='text-red-700 dark:text-red-400'>
                                    This action has been logged for security purposes.
                                </span>
                            )}
                        </>
                    )
                };
            default:
                return {
                    title: 'Warning',
                    description: 'Suspicious activity detected.'
                };
        }
    };

    const handleAcknowledge = () => {
        if (currentViolation === 'console') {
            setIsConsoleAcknowledged(true);
        }
        setShowDialog(false);
        setCurrentViolation(null);
    };

    const handleDismiss = () => {
        if (currentViolation === 'console') {
            setIsConsoleAcknowledged(false);
            // Re-show dialog after brief delay if they don't understand
            setTimeout(() => {
                if (!isConsoleAcknowledged) {
                    setShowDialog(true);
                }
            }, 500);
        } else {
            setShowDialog(false);
            setCurrentViolation(null);
        }
    };

    const dialogContent = getDialogContent();
    
    return (
        <>
            <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div>{dialogContent.description}</div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        {currentViolation === 'console' && (
                            <AlertDialogCancel onClick={handleDismiss}>
                                I don&apos;t understand
                            </AlertDialogCancel>
                        )}
                        <AlertDialogAction onClick={handleAcknowledge}>
                            {currentViolation === 'console' ? 'I understand' : 'Acknowledge'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Hidden violation counter for testing */}
            {isTesting && violations.length > 0 && (
                <div className="fixed bottom-4 right-4 z-50 p-4 bg-black/80 text-white rounded-lg text-xs">
                    <div className="font-bold mb-2">Violations Log:</div>
                    {violations.slice(-5).map((v, i) => (
                        <div key={i} className="text-xs">
                            {v.type}: {v.timestamp.toLocaleTimeString()}
                        </div>
                    ))}
                </div>
            )}
        </>
    )
}