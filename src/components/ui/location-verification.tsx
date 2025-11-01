'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface LocationData {
  coordinates: string;
  rangeInMeters: string;
}

interface LocationVerificationProps {
  requiredLocation: LocationData;
  onVerified: () => void;
  onFailed: () => void;
}

/**
 * LocationVerification Component
 * 
 * This component verifies that a student is within the allowed location
 * before they can start an exam. It requests location permission,
 * gets the current position, and checks if it's within range.
 * 
 * @example
 * ```tsx
 * <LocationVerification
 *   requiredLocation={{ coordinates: "37.7749,-122.4194", rangeInMeters: "500" }}
 *   onVerified={() => startExam()}
 *   onFailed={() => showError()}
 * />
 * ```
 */
export default function LocationVerification({
  requiredLocation,
  onVerified,
  onFailed,
}: LocationVerificationProps) {
  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'failed'>('idle');
  const [distance, setDistance] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Parse required location
  const [requiredLat, requiredLng] = requiredLocation.coordinates
    ? requiredLocation.coordinates.split(',').map(Number)
    : [0, 0];
  const allowedRange = parseInt(requiredLocation.rangeInMeters) || 100;

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  /**
   * Verify student's location
   */
  const verifyLocation = async () => {
    if (!requiredLocation.coordinates) {
      toast.error('Location verification is not configured for this exam');
      return;
    }

    setVerifying(true);
    setStatus('checking');
    setErrorMessage('');

    try {
      // Check if geolocation is supported
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by your browser');
      }

      // Get current position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const studentLat = position.coords.latitude;
      const studentLng = position.coords.longitude;

      // Calculate distance
      const distanceInMeters = calculateDistance(
        studentLat,
        studentLng,
        requiredLat,
        requiredLng
      );

      setDistance(distanceInMeters);

      // Check if within range
      if (distanceInMeters <= allowedRange) {
        setStatus('success');
        toast.success('Location verified successfully!');
        setTimeout(() => {
          onVerified();
        }, 1000);
      } else {
        setStatus('failed');
        setErrorMessage(
          `You are ${Math.round(distanceInMeters)}m away from the exam location. You must be within ${allowedRange}m to take this exam.`
        );
        toast.error('You are not at the required location');
        onFailed();
      }
    } catch (error: any) {
      console.error('Location verification error:', error);
      setStatus('failed');

      // Handle specific errors
      if (error.code === 1) {
        setErrorMessage(
          'Location permission denied. Please enable location services and grant permission to continue.'
        );
      } else if (error.code === 2) {
        setErrorMessage(
          'Unable to determine your location. Please check your device settings and try again.'
        );
      } else if (error.code === 3) {
        setErrorMessage(
          'Location request timed out. Please ensure you have a stable connection and try again.'
        );
      } else {
        setErrorMessage(error.message || 'Failed to verify location. Please try again.');
      }

      toast.error('Location verification failed');
      onFailed();
    } finally {
      setVerifying(false);
    }
  };

  // Auto-verify on mount if needed
  useEffect(() => {
    // You can optionally auto-verify here
    // verifyLocation();
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location Verification Required
        </CardTitle>
        <CardDescription>
          This exam requires you to be at a specific location. Please verify your location to
          continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Display */}
        {status === 'idle' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You must be within <strong>{allowedRange} meters</strong> of the exam location to
              proceed. Click the button below to verify your location.
            </AlertDescription>
          </Alert>
        )}

        {status === 'checking' && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Verifying your location... Please wait and ensure location services are enabled.
            </AlertDescription>
          </Alert>
        )}

        {status === 'success' && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950/30">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900 dark:text-green-100">
              ✅ Location verified! You are {distance ? Math.round(distance) : 0}m from the exam
              location.
            </AlertDescription>
          </Alert>
        )}

        {status === 'failed' && errorMessage && (
          <Alert className="border-red-500 bg-red-50 dark:bg-red-950/30">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-900 dark:text-red-100">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Information Card */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Required Location Details:</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>
                  • <strong>Coordinates:</strong> {requiredLocation.coordinates || 'Not set'}
                </li>
                <li>
                  • <strong>Allowed Range:</strong> {allowedRange} meters (~
                  {Math.round(allowedRange * 3.28084)} feet)
                </li>
                <li>
                  • <strong>Accuracy:</strong> High accuracy mode enabled
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
            Before verifying:
          </p>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
            <li>Enable location services on your device</li>
            <li>Grant location permission when prompted by your browser</li>
            <li>Ensure you are at the correct physical location</li>
            <li>Disable any VPN or proxy services</li>
            <li>Move outdoors if possible for better GPS accuracy</li>
          </ul>
        </div>

        {/* Verify Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={verifyLocation}
            disabled={verifying || status === 'success'}
            className="flex-1"
            size="lg"
          >
            {verifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying Location...
              </>
            ) : status === 'success' ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Verified
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Verify My Location
              </>
            )}
          </Button>

          {status === 'failed' && (
            <Button onClick={verifyLocation} variant="outline" size="lg" className="flex-1">
              Try Again
            </Button>
          )}
        </div>

        {/* Help Text */}
        <p className="text-xs text-center text-muted-foreground">
          Having trouble? Contact your exam administrator for assistance.
        </p>
      </CardContent>
    </Card>
  );
}

