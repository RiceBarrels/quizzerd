'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Clock } from 'lucide-react';

interface ExamSettingsTabProps {
  durationMinutes: number;
  attemptsAllowed: number;
  passingScore: number;
  shuffleItems: boolean;
  showResultsImmediately: boolean;
  isPublic: boolean;
  onDurationChange: (value: number) => void;
  onAttemptsChange: (value: number) => void;
  onPassingScoreChange: (value: number) => void;
  onShuffleChange: (value: boolean) => void;
  onShowResultsChange: (value: boolean) => void;
  onPublicChange: (value: boolean) => void;
}

export default function ExamSettingsTab({
  durationMinutes,
  attemptsAllowed,
  passingScore,
  shuffleItems,
  showResultsImmediately,
  isPublic,
  onDurationChange,
  onAttemptsChange,
  onPassingScoreChange,
  onShuffleChange,
  onShowResultsChange,
  onPublicChange
}: ExamSettingsTabProps) {
  return (
    <Card className="overflow-auto">
      <CardHeader>
        <CardTitle>Exam Settings</CardTitle>
        <CardDescription>
          Configure exam behavior and scoring
        </CardDescription>
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
      </CardContent>
    </Card>
  );
}