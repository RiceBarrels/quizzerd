'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Loader2, X, Globe, Lock, CheckIcon, Copy, Link2, FileText, Calendar, Clock, GraduationCap, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  room?: string;
  courseState: string;
  alternateLink: string;
}

interface PublishExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  examName: string;
  examDescription: string;
  isPublic: boolean;
  isPublished: boolean;
  onPublish: (publishType: 'public' | 'classroom' | 'link') => Promise<void>;
  saving: boolean;
}

export default function PublishExamDialog({
  open,
  onOpenChange,
  examId,
  examName,
  isPublic,
  isPublished,
  onPublish,
  saving,
}: PublishExamDialogProps) {
  const [publishType, setPublishType] = useState<'public' | 'classroom' | 'link'>('classroom');
  const [courses, setCourses] = useState<GoogleClassroomCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [loadingCourses, setLoadingCourses] = useState<boolean>(false);
  const [publishing, setPublishing] = useState<boolean>(false);
  const [dueDate, setDueDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [googleConnected, setGoogleConnected] = useState<boolean>(true);
  const [publishedClassroomLink, setPublishedClassroomLink] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const response = await fetch('/api/exams/publish');
      const result = await response.json();

      if (result.success) {
        setCourses(result.courses || []);
        setGoogleConnected(true);
      } else {
        setGoogleConnected(false);
        if (result.message) {
          console.log('Google Classroom:', result.message);
        }
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setGoogleConnected(false);
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchCourses();
    }
  }, [open, fetchCourses]);

  const handlePublishToClassroom = useCallback(async () => {
    if (!selectedCourseId) {
      toast.error('Please select a Google Classroom course');
      return;
    }

    setPublishing(true);
    try {
      const response = await fetch('/api/exams/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exam_id: examId,
          course_id: selectedCourseId,
          due_date: dueDate || null,
          scheduled_time: scheduledTime || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Exam published to Google Classroom!');
        setPublishedClassroomLink(result.classroom?.alternateLink || null);
        onOpenChange(false);
      } else {
        toast.error(result.message || result.error || 'Failed to publish');
      }
    } catch (error) {
      console.error('Error publishing to classroom:', error);
      toast.error('Failed to publish to Google Classroom');
    } finally {
      setPublishing(false);
    }
  }, [examId, selectedCourseId, dueDate, scheduledTime, onOpenChange]);

  const handlePublishConfirm = useCallback(async () => {
    if (publishType === 'classroom') {
      await handlePublishToClassroom();
    } else {
      // For public or link, use the original onPublish
      await onPublish(publishType === 'public' ? 'public' : 'link');
    }
  }, [publishType, handlePublishToClassroom, onPublish]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-3 pb-4 border-b">
          <DialogTitle className="text-2xl font-semibold">Publish Exam</DialogTitle>
          <DialogDescription className="text-base">
            Choose how you want to share &quot;{examName}&quot; with your students.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-6 space-y-6">
          <RadioGroup
            value={publishType}
            onValueChange={(value: any) => setPublishType(value)}
            className="space-y-3"
          >
            {/* Google Classroom Option */}
            <Label
              htmlFor="classroom"
              className={`flex items-start space-x-4 p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                publishType === 'classroom'
                  ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-sm'
                  : 'border-border hover:border-primary/30 hover:bg-accent/30'
              }`}
            >
              <RadioGroupItem value="classroom" id="classroom" className="mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      publishType === 'classroom'
                        ? 'bg-primary/20 border border-primary/30'
                        : 'bg-muted'
                    }`}
                  >
                    <GraduationCap
                      className={`h-5 w-5 ${
                        publishType === 'classroom' ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <span className="font-semibold text-base">Google Classroom</span>
                  <Badge variant="secondary" className="text-xs">
                    Recommended
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Post this exam as an assignment to your Google Classroom course. Students will see it in their Classroom feed.
                </p>
              </div>
            </Label>

            {/* Public Option */}
            <Label
              htmlFor="public"
              className={`flex items-start space-x-4 p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                publishType === 'public'
                  ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-sm'
                  : 'border-border hover:border-primary/30 hover:bg-accent/30'
              }`}
            >
              <RadioGroupItem value="public" id="public" className="mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      publishType === 'public'
                        ? 'bg-primary/20 border border-primary/30'
                        : 'bg-muted'
                    }`}
                  >
                    <Globe
                      className={`h-5 w-5 ${
                        publishType === 'public' ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <span className="font-semibold text-base">Public Directory</span>
                  {isPublic && isPublished && (
                    <Badge className="bg-primary text-primary-foreground text-xs">Active</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Make this exam accessible to everyone. It will be discoverable in the public exams directory.
                </p>
              </div>
            </Label>

            {/* Private Link Option */}
            <Label
              htmlFor="link"
              className={`flex items-start space-x-4 p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                publishType === 'link'
                  ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-sm'
                  : 'border-border hover:border-primary/30 hover:bg-accent/30'
              }`}
            >
              <RadioGroupItem value="link" id="link" className="mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg transition-colors ${
                      publishType === 'link'
                        ? 'bg-primary/20 border border-primary/30'
                        : 'bg-muted'
                    }`}
                  >
                    <Lock
                      className={`h-5 w-5 ${
                        publishType === 'link' ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                  <span className="font-semibold text-base">Private Link</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Keep this exam private. Only those with the direct link can access it.
                </p>
              </div>
            </Label>
          </RadioGroup>

          {/* Google Classroom Course Selection */}
          {publishType === 'classroom' && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    Select Course
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose which Google Classroom course to post to
                  </p>
                </div>
              </div>

              {!googleConnected ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                  <div className="p-4 rounded-full bg-muted">
                    <GraduationCap className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Google Account Not Connected</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      Please connect your Google account with Classroom permissions to publish exams.
                    </p>
                  </div>
                </div>
              ) : loadingCourses ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Loading your courses...</p>
                </div>
              ) : courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                  <div className="p-4 rounded-full bg-muted">
                    <GraduationCap className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">No Courses Found</p>
                    <p className="text-xs text-muted-foreground max-w-sm">
                      You need to be a teacher in a Google Classroom course to publish exams.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto border rounded-xl p-2 bg-muted/20">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      onClick={() => setSelectedCourseId(course.id)}
                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200 border-2 ${
                        selectedCourseId === course.id
                          ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-sm'
                          : 'bg-background hover:bg-accent/50 hover:shadow-sm border-transparent'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          selectedCourseId === course.id
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground'
                        }`}
                      >
                        {selectedCourseId === course.id && (
                          <CheckIcon className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p
                          className={`font-semibold text-sm ${
                            selectedCourseId === course.id ? 'text-primary' : ''
                          }`}
                        >
                          {course.name}
                        </p>
                        {course.section && (
                          <p className="text-xs text-muted-foreground">{course.section}</p>
                        )}
                      </div>
                      <a
                        href={course.alternateLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Due Date and Scheduled Time */}
              {selectedCourseId && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="due-date" className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Due Date (Optional)
                      </Label>
                      <DateTimePicker
                        value={dueDate}
                        onChange={setDueDate}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="scheduled-time" className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Schedule Publish (Optional)
                      </Label>
                      <DateTimePicker
                        value={scheduledTime}
                        onChange={setScheduledTime}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to publish immediately with no due date.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Link Sharing Section */}
          {(publishType === 'link' || publishType === 'public') && isPublished && (
            <div className="p-4 bg-muted/50 border rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-md bg-background">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium">Share Exam Link</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/exam/${examId}`}
                      className="flex-1 px-3 py-2 text-xs bg-background border rounded-lg font-mono"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/exam/${examId}`
                        );
                        toast.success('Link copied to clipboard');
                      }}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* How it works */}
          {publishType === 'classroom' && (
            <div className="p-4 bg-muted/50 border rounded-lg">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-md bg-background">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">How it works</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Creates an assignment in your Google Classroom</li>
                    <li>Students click the link to take the exam on QuizZerd</li>
                    <li>Grades are tracked in QuizZerd</li>
                    <li>You can set due dates and scheduled publish times</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center gap-3 pt-6 border-t mt-auto">
          <Button
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            size="lg"
            onClick={handlePublishConfirm}
            disabled={
              (publishType === 'classroom' && !selectedCourseId) ||
              saving ||
              publishing
            }
            className="flex-1"
          >
            {saving || publishing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4 mr-2" />
                {publishType === 'classroom'
                  ? 'Publish to Classroom'
                  : publishType === 'public'
                  ? 'Publish Public'
                  : 'Publish with Link'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
