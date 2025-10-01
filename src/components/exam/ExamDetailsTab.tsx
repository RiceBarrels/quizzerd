'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import TextEditor from '@/components/editors/text-editor';
import { Calendar } from 'lucide-react';

export default function ExamDetailsTab({ 
  examName,
  examDescription,
  startDate,
  endDate,
  onExamNameChange,
  onDescriptionChange,
  onStartDateChange,
  onEndDateChange 
}) {
  return (
    <Card className="overflow-auto">
      <CardHeader>
        <CardTitle>Exam Information</CardTitle>
        <CardDescription>
          Basic details about your exam
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="exam-name">Exam Name *</Label>
          <Input
            id="exam-name"
            value={examName}
            onChange={(e) => onExamNameChange(e.target.value)}
            placeholder="Enter exam name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="exam-description">Description</Label>
          <TextEditor
            id="exam-description"
            value={examDescription}
            onChange={onDescriptionChange}
            placeholder="Enter exam description"
            minHeight={100}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">
              <Calendar className="w-4 h-4 inline mr-1" />
              Start Date
            </Label>
            <Input
              id="start-date"
              type="datetime-local"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date">
              <Calendar className="w-4 h-4 inline mr-1" />
              End Date
            </Label>
            <Input
              id="end-date"
              type="datetime-local"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}