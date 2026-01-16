'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, Trash2, AlertTriangle } from 'lucide-react';
import LocationPicker from '@/components/ui/location-picker';
import { TemplateSelector, SaveAsTemplateButton } from '@/components/exam/TemplateSelector';

interface LocationData {
  coordinates: string;
  rangeInMeters: string;
}

interface ExamSettingsTabProps {
  durationMinutes: number;
  attemptsAllowed: number;
  passingScore: number;
  shuffleItems: boolean;
  showResultsImmediately: boolean;
  isPublic: boolean;
  // Cheating detection settings
  consoleDetection?: boolean;
  translationDetection?: boolean;
  allowWordByWordTranslation?: boolean;
  allowWordByWordDefinition?: boolean;
  visibilityChangeDetection?: boolean;
  locationDetection?: boolean;
  location?: LocationData;
  onDurationChange: (value: number) => void;
  onAttemptsChange: (value: number) => void;
  onPassingScoreChange: (value: number) => void;
  onShuffleChange: (value: boolean) => void;
  onShowResultsChange: (value: boolean) => void;
  onPublicChange: (value: boolean) => void;
  // Cheating detection handlers
  onConsoleDetectionChange?: (value: boolean) => void;
  onTranslationDetectionChange?: (value: boolean) => void;
  onAllowWordByWordTranslationChange?: (value: boolean) => void;
  onAllowWordByWordDefinitionChange?: (value: boolean) => void;
  onVisibilityChangeDetectionChange?: (value: boolean) => void;
  onLocationDetectionChange?: (value: boolean) => void;
  onLocationChange?: (value: LocationData) => void;
  onDeleteExam?: () => void;
  onApplyTemplate?: (settings: {
    duration_minutes: number;
    attempts_allowed: number;
    passing_score: number;
    shuffle_items: boolean;
    show_results_immediately: boolean;
    console_detection: boolean;
    translation_detection: boolean;
    visibility_change_detection: boolean;
    location_detection: boolean;
  }) => void;
}

/**
 * Tab component for configuring exam settings including duration, attempts, scoring, and cheating detection
 * @param {ExamSettingsTabProps} props - Component props
 * @param {number} props.durationMinutes - Exam duration in minutes
 * @param {number} props.attemptsAllowed - Maximum number of attempts allowed
 * @param {number} props.passingScore - Minimum score required to pass
 * @param {boolean} props.shuffleItems - Whether to shuffle question order
 * @param {boolean} props.showResultsImmediately - Whether to show results immediately after submission
 * @param {boolean} props.isPublic - Whether the exam is publicly accessible
 * @param {boolean} [props.consoleDetection=false] - Enable console detection for cheating prevention
 * @param {boolean} [props.translationDetection=false] - Enable translation detection
 * @param {boolean} [props.allowWordByWordTranslation=false] - Allow word-by-word translation
 * @param {boolean} [props.allowWordByWordDefinition=false] - Allow word-by-word definition lookup
 * @param {boolean} [props.visibilityChangeDetection=false] - Enable visibility change detection
 * @param {boolean} [props.locationDetection=false] - Enable location-based detection
 * @param {{coordinates: string; rangeInMeters: string}} [props.location] - Location coordinates and range
 * @param {(value: number) => void} props.onDurationChange - Callback when duration changes
 * @param {(value: number) => void} props.onAttemptsChange - Callback when attempts allowed changes
 * @param {(value: number) => void} props.onPassingScoreChange - Callback when passing score changes
 * @param {(value: boolean) => void} props.onShuffleChange - Callback when shuffle setting changes
 * @param {(value: boolean) => void} props.onShowResultsChange - Callback when show results setting changes
 * @param {(value: boolean) => void} props.onPublicChange - Callback when public setting changes
 * @param {(value: boolean) => void} [props.onConsoleDetectionChange] - Callback when console detection changes
 * @param {(value: boolean) => void} [props.onTranslationDetectionChange] - Callback when translation detection changes
 * @param {(value: boolean) => void} [props.onAllowWordByWordTranslationChange] - Callback when word-by-word translation setting changes
 * @param {(value: boolean) => void} [props.onAllowWordByWordDefinitionChange] - Callback when word-by-word definition setting changes
 * @param {(value: boolean) => void} [props.onVisibilityChangeDetectionChange] - Callback when visibility change detection changes
 * @param {(value: boolean) => void} [props.onLocationDetectionChange] - Callback when location detection changes
 * @param {(value: LocationData) => void} [props.onLocationChange] - Callback when location data changes
 * @param {() => void} [props.onDeleteExam] - Optional callback to delete the exam
 * @returns {JSX.Element} Card component with exam settings form
 */
export default function ExamSettingsTab({
  durationMinutes,
  attemptsAllowed,
  passingScore,
  shuffleItems,
  showResultsImmediately,
  isPublic,
  consoleDetection = false,
  translationDetection = false,
  allowWordByWordTranslation = false,
  allowWordByWordDefinition = false,
  visibilityChangeDetection = false,
  locationDetection = false,
  location = { coordinates: '', rangeInMeters: '100' },
  onDurationChange,
  onAttemptsChange,
  onPassingScoreChange,
  onShuffleChange,
  onShowResultsChange,
  onPublicChange,
  onConsoleDetectionChange,
  onTranslationDetectionChange,
  onAllowWordByWordTranslationChange,
  onAllowWordByWordDefinitionChange,
  onVisibilityChangeDetectionChange,
  onLocationDetectionChange,
  onLocationChange,
  onDeleteExam,
  onApplyTemplate
}: ExamSettingsTabProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const currentSettings = {
    duration_minutes: durationMinutes,
    attempts_allowed: attemptsAllowed,
    passing_score: passingScore,
    shuffle_items: shuffleItems,
    show_results_immediately: showResultsImmediately,
    console_detection: consoleDetection,
    translation_detection: translationDetection,
    visibility_change_detection: visibilityChangeDetection,
    location_detection: locationDetection,
  };

  const handleApplyTemplate = (settings: typeof currentSettings) => {
    if (onApplyTemplate) {
      onApplyTemplate(settings);
    } else {
      // Apply settings individually if no combined handler
      onDurationChange(settings.duration_minutes);
      onAttemptsChange(settings.attempts_allowed);
      onPassingScoreChange(settings.passing_score);
      onShuffleChange(settings.shuffle_items);
      onShowResultsChange(settings.show_results_immediately);
      onConsoleDetectionChange?.(settings.console_detection);
      onTranslationDetectionChange?.(settings.translation_detection);
      onVisibilityChangeDetectionChange?.(settings.visibility_change_detection);
      onLocationDetectionChange?.(settings.location_detection);
    }
  };

  return (
    <>
      <Card className="overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Exam Settings</CardTitle>
              <CardDescription>
                Configure exam behavior and scoring
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <TemplateSelector onApply={handleApplyTemplate} />
              <SaveAsTemplateButton currentSettings={currentSettings} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="duration">
              <Clock className="w-4 h-4 inline mr-1" />
              Duration (minutes)
            </Label>
            <Input
              id="duration"
              type="number"
              value={durationMinutes}
              onChange={(e) => onDurationChange(parseInt(e.target.value))}
              min="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attempts">Attempts Allowed</Label>
            <Input
              id="attempts"
              type="number"
              value={attemptsAllowed}
              onChange={(e) => onAttemptsChange(parseInt(e.target.value))}
              min="1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="passing-score">Passing Score (%)</Label>
          <Input
            id="passing-score"
            type="number"
            value={passingScore}
            onChange={(e) => onPassingScoreChange(parseInt(e.target.value))}
            min="0"
            max="100"
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Shuffle Questions</Label>
              <p className="text-sm text-muted-foreground">
                Randomize question order for each attempt
              </p>
            </div>
            <Switch
              checked={shuffleItems}
              onCheckedChange={onShuffleChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Results Immediately</Label>
              <p className="text-sm text-muted-foreground">
                Display results right after submission
              </p>
            </div>
            <Switch
              checked={showResultsImmediately}
              onCheckedChange={onShowResultsChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Public Exam</Label>
              <p className="text-sm text-muted-foreground">
                Allow anyone to view and take this exam
              </p>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={onPublicChange}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">Cheating Detection</h3>
            <p className="text-sm text-muted-foreground">
              Configure security measures to prevent cheating during the exam
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Developer Console Detection</Label>
              <p className="text-sm text-muted-foreground">
                Detect if student opens browser developer tools
              </p>
            </div>
            <Switch
              checked={consoleDetection}
              onCheckedChange={onConsoleDetectionChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Tab Switch Detection</Label>
              <p className="text-sm text-muted-foreground">
                Alert when student switches tabs or minimizes window
              </p>
            </div>
            <Switch
              checked={visibilityChangeDetection}
              onCheckedChange={onVisibilityChangeDetectionChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Translation Detection</Label>
              <p className="text-sm text-muted-foreground">
                Detect if student uses translation tools
              </p>
            </div>
            <Switch
              checked={translationDetection}
              onCheckedChange={onTranslationDetectionChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Word Translation</Label>
              <p className="text-sm text-muted-foreground">
                Permit students to translate individual words
              </p>
            </div>
            <Switch
              checked={allowWordByWordTranslation}
              onCheckedChange={onAllowWordByWordTranslationChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Word Definitions</Label>
              <p className="text-sm text-muted-foreground">
                Permit students to look up word definitions
              </p>
            </div>
            <Switch
              checked={allowWordByWordDefinition}
              onCheckedChange={onAllowWordByWordDefinitionChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Location Tracking</Label>
              <p className="text-sm text-muted-foreground">
                Monitor student location during exam (requires permission)
              </p>
            </div>
            <Switch
              checked={locationDetection}
              onCheckedChange={onLocationDetectionChange}
            />
          </div>
        </div>

        {/* Location Picker - Show when location detection is enabled */}
        {locationDetection && onLocationChange && (
          <>
            <Separator />
            <LocationPicker
              value={location}
              onChange={onLocationChange}
            />
          </>
        )}

        {onDeleteExam && (
          <>
            <Separator />

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 border-2 border-destructive/50 rounded-lg bg-destructive/5">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                <div className="flex-1 space-y-2">
                  <div>
                    <h3 className="font-semibold text-destructive">Danger Zone</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Delete this exam permanently. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    className="mt-2"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Exam
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete this exam
            and remove all associated data including student responses.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onDeleteExam?.();
              setShowDeleteDialog(false);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Exam
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
}