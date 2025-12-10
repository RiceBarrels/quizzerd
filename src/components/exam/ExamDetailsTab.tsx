'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import TextEditor from '@/components/editors/text-editor';
import { Calendar } from 'lucide-react';

interface ExamDetailsTabProps {
  examName: string;
  examDescription: string;
  startDate: string;
  endDate: string;
  onExamNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
}

/**
 * Tab component for editing exam basic information (name, description, dates)
 * @param {ExamDetailsTabProps} props - Component props
 * @param {string} props.examName - Current exam name
 * @param {string} props.examDescription - Current exam description (HTML)
 * @param {string} props.startDate - Exam start date/time (datetime-local format)
 * @param {string} props.endDate - Exam end date/time (datetime-local format)
 * @param {(value: string) => void} props.onExamNameChange - Callback when exam name changes
 * @param {(value: string) => void} props.onDescriptionChange - Callback when description changes
 * @param {(value: string) => void} props.onStartDateChange - Callback when start date changes
 * @param {(value: string) => void} props.onEndDateChange - Callback when end date changes
 * @returns {JSX.Element} Card component with exam details form
 */
export default function ExamDetailsTab({
  examName,
  examDescription,
  startDate,
  endDate,
  onExamNameChange,
  onDescriptionChange,
  onStartDateChange,
  onEndDateChange
}: ExamDetailsTabProps) {
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