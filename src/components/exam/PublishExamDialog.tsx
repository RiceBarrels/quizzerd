'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContents, TabsContent } from '@/components/ui/shadcn-io/tabs';
import { Loader2, X, Globe, Lock, Key, CheckIcon, Users, Copy, Link2, FileText, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface ClassAssignmentDates {
  access_at: string | null;
  due_at: string | null;
}

interface PublishExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  examId: string;
  examName: string;
  examDescription: string;
  isPublic: boolean;
  isPublished: boolean;
  selectedClassIds: string[];
  onPublish: (
    publishType: 'public' | 'classes' | 'code',
    classIds: string[],
    existingAssignments: string[],
    classAssignments?: Record<string, ClassAssignmentDates>
  ) => Promise<void>;
  saving: boolean;
}

export default function PublishExamDialog({
  open,
  onOpenChange,
  examId,
  examName,
  examDescription,
  isPublic,
  isPublished,
  selectedClassIds: initialSelectedClassIds,
  onPublish,
  saving,
}: PublishExamDialogProps) {
  const [publishType, setPublishType] = useState<'public' | 'classes' | 'code'>('public');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(initialSelectedClassIds);
  const [classes, setClasses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(false);
  const [classesWithExistingAssignments, setClassesWithExistingAssignments] = useState<string[]>([]);
  const [hasInitializedPublishDialog, setHasInitializedPublishDialog] = useState<boolean>(false);
  const [classAssignmentDates, setClassAssignmentDates] = useState<Record<string, ClassAssignmentDates>>({});
  const [classDatesDialogOpen, setClassDatesDialogOpen] = useState<boolean>(false);
  const [currentClassId, setCurrentClassId] = useState<string | null>(null);
  const [tempAccessAt, setTempAccessAt] = useState<string>('');
  const [tempDueAt, setTempDueAt] = useState<string>('');

  // Sync selectedClassIds with classesWithExistingAssignments when dialog opens
  useEffect(() => {
    if (open && classesWithExistingAssignments.length > 0) {
      setSelectedClassIds(classesWithExistingAssignments);
    }
  }, [open, classesWithExistingAssignments]);

  // Initialize publish type based on exam data
  useEffect(() => {
    if (open && !hasInitializedPublishDialog) {
      if (isPublic) {
        setPublishType('public');
      } else if (selectedClassIds.length > 0) {
        setPublishType('classes');
      } else if (isPublished) {
        setPublishType('code');
      } else {
        setPublishType('public');
      }
      setHasInitializedPublishDialog(true);
    }
  }, [open, isPublic, selectedClassIds, isPublished, hasInitializedPublishDialog]);

  // Reset initialization when dialog closes
  useEffect(() => {
    if (!open) {
      setHasInitializedPublishDialog(false);
    }
  }, [open]);

  const checkExistingAssignments = useCallback(async (classList: any[]) => {
    if (!examId || classList.length === 0) return;
    
    try {
      const response = await fetch(`/api/classes/assignments/check?examId=${examId}`);
      const result = await response.json();
      
      if (result.success) {
        setClassesWithExistingAssignments(result.classIds || []);
      }
    } catch (error) {
      console.error('Error checking existing assignments:', error);
    }
  }, [examId]);

  const fetchClasses = useCallback(async () => {
    setLoadingClasses(true);
    try {
      const response = await fetch('/api/classes/get');
      const result = await response.json();
      
      if (result.success) {
        setClasses(result.data || []);
        await checkExistingAssignments(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  }, [checkExistingAssignments]);

  useEffect(() => {
    if (open) {
      fetchClasses();
    }
  }, [open, fetchClasses]);

  const formatTimeString = useCallback((timeString: string | null | undefined): string => {
    if (!timeString) return '';
    try {
      // Handle time with timezone format (e.g., "14:30:00+00:00" or "14:30:00-05:00")
      const time = timeString.includes('+') || timeString.includes('-') 
        ? timeString.split(/[+-]/)[0] 
        : timeString;
      const [hours, minutes, seconds] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  }, []);

  const handleClassSelect = useCallback((classId: string, checked: boolean) => {
    if (checked) {
      // Check if class already has dates set
      if (classAssignmentDates[classId]) {
        // Already has dates, just add to selection
        setSelectedClassIds(prev => [...prev, classId]);
      } else {
        // Open dialog to set dates when selecting a class
        setCurrentClassId(classId);
        const existingDates = classAssignmentDates[classId] as ClassAssignmentDates | undefined;
        setTempAccessAt(existingDates?.access_at ? new Date(existingDates.access_at).toISOString().slice(0, 16) : '');
        setTempDueAt(existingDates?.due_at ? new Date(existingDates.due_at).toISOString().slice(0, 16) : '');
        setClassDatesDialogOpen(true);
      }
    } else {
      // Remove class and its dates
      setSelectedClassIds(prev => prev.filter(id => id !== classId));
      setClassAssignmentDates(prev => {
        const newDates = { ...prev };
        delete newDates[classId];
        return newDates;
      });
    }
  }, [classAssignmentDates]);

  const handleCancelClassDates = useCallback(() => {
    // Don't add the class if user cancels
    if (currentClassId) {
      setSelectedClassIds(prev => prev.filter(id => id !== currentClassId));
    }
    setClassDatesDialogOpen(false);
    setCurrentClassId(null);
    setTempAccessAt('');
    setTempDueAt('');
  }, [currentClassId]);

  const handleSaveClassDates = useCallback(() => {
    if (!currentClassId) return;

    setClassAssignmentDates(prev => ({
      ...prev,
      [currentClassId]: {
        access_at: tempAccessAt ? new Date(tempAccessAt).toISOString() : null,
        due_at: tempDueAt ? new Date(tempDueAt).toISOString() : null,
      },
    }));

    // Add class to selected if not already selected
    setSelectedClassIds(prev => {
      if (!prev.includes(currentClassId)) {
        return [...prev, currentClassId];
      }
      return prev;
    });

    setClassDatesDialogOpen(false);
    setCurrentClassId(null);
    toast.success('Assignment dates set');
  }, [currentClassId, tempAccessAt, tempDueAt]);

  const handlePublishConfirm = useCallback(async () => {
    await onPublish(publishType, selectedClassIds, classesWithExistingAssignments, classAssignmentDates);
  }, [publishType, selectedClassIds, classesWithExistingAssignments, classAssignmentDates, onPublish]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-3 pb-4 border-b">
          <DialogTitle className="text-2xl font-semibold">Publish Exam</DialogTitle>
          <DialogDescription className="text-base">
            Choose how you want to share this exam with your students.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs 
          value={publishType === 'public' ? 'public' : 'private'} 
          onValueChange={(value) => {
            if (value === 'public') {
              setPublishType('public');
            } else {
              setPublishType(selectedClassIds.length > 0 ? 'classes' : 'code');
            }
          }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <h2 className="text-lg font-semibold">Choose Publish Type:</h2>
          <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 p-1">
            <TabsTrigger value="public" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Globe className="h-4 w-4" />
              <span className="font-medium">Public</span>
            </TabsTrigger>
            <TabsTrigger value="private" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Lock className="h-4 w-4" />
              <span className="font-medium">Private</span>
            </TabsTrigger>
          </TabsList>

          <TabsContents className="flex-1 overflow-y-auto py-6">
            <TabsContent value="public" className="mt-0 space-y-6 h-full">
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-6 border-2 border-primary/20 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10">
                  <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                    <Globe className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">Public Directory</h3>
                        {isPublic && isPublished && (
                          <Badge className="bg-primary text-primary-foreground">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Make this exam accessible to everyone. It will be discoverable in the public exams directory and accessible to all users.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="font-normal">
                        Public Access
                      </Badge>
                      <Badge variant="secondary" className="font-normal">
                        Searchable
                      </Badge>
                      <Badge variant="secondary" className="font-normal">
                        No Restrictions
                      </Badge>
                    </div>
                  </div>
                </div>

                {isPublished && (
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
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/exam/${examId}/preview`}
                            className="flex-1 px-3 py-2 text-xs bg-background border rounded-lg font-mono"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/exam/${examId}/preview`);
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

                <div className="p-4 bg-muted/50 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-md bg-background">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">How it works</p>
                      <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Anyone can find and access this exam</li>
                        <li>Appears in the public exams directory</li>
                        <li>Shareable via direct link</li>
                        <li>No enrollment or access code required</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Optional Class Assignment for Public Exams */}
                <div className="space-y-4 pt-2 border-t">
                  <div className="flex items-start gap-3 p-4 bg-accent/50 border rounded-lg">
                    <div className="p-1.5 rounded-md bg-background">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Optional: Assign to Classes</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Even though this exam is public, you can also assign it to specific classes for tracking and organization.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Select Classes</h3>
                      <p className="text-xs text-muted-foreground mt-1">Choose which classes to assign this exam to</p>
                    </div>
                    {selectedClassIds.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedClassIds.length} Selected
                      </Badge>
                    )}
                  </div>
                  
                  {loadingClasses ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Loading your classes...</p>
                    </div>
                  ) : classes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                      <div className="p-4 rounded-full bg-muted">
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">No Classes Available</p>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          You need to create or join a class before you can assign exams to it.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[280px] overflow-y-auto border rounded-xl p-2 bg-muted/20">
                      {classes.map((cls) => {
                        const isAlreadyPublished = classesWithExistingAssignments.includes(cls.class_id);
                        const isSelected = selectedClassIds.includes(cls.class_id);
                  
                        return (
                          <div 
                            key={cls.class_id} 
                            className={`flex items-start space-x-3 p-3 rounded-lg transition-all duration-200 border-2 ${
                              isAlreadyPublished 
                                ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-sm' 
                                : isSelected
                                ? 'bg-accent/50 border-accent hover:bg-accent/70'
                                : 'bg-background hover:bg-accent/50 hover:shadow-sm border-transparent'
                            }`}
                          >
                            <Checkbox
                              id={`public-class-${cls.class_id}`}
                              checked={isSelected}
                              className="mt-1"
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  handleClassSelect(cls.class_id, true);
                                } else {
                                  handleClassSelect(cls.class_id, false);
                                }
                              }}
                            />
                            <Label
                              htmlFor={`public-class-${cls.class_id}`}
                              className="flex-1 space-y-1 cursor-pointer"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-semibold text-sm ${
                                  isAlreadyPublished ? 'text-primary' : ''
                                }`}>
                                  {cls.class_name}
                                </span>
                                {isAlreadyPublished && (
                                  <Badge className="text-xs bg-primary text-primary-foreground">
                                    <CheckIcon className="h-3 w-3 mr-1" />
                                    Assigned
                                  </Badge>
                                )}
                              </div>
                              {cls.description && (
                                <p className="text-xs text-muted-foreground leading-relaxed">{cls.description}</p>
                              )}
                              {isSelected && classAssignmentDates[cls.class_id] && (
                                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                  {classAssignmentDates[cls.class_id].access_at && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span>Access: {new Date(classAssignmentDates[cls.class_id].access_at!).toLocaleString()}</span>
                                    </div>
                                  )}
                                  {classAssignmentDates[cls.class_id].due_at && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      <span>Due: {new Date(classAssignmentDates[cls.class_id].due_at!).toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="private" className="mt-0 space-y-6 h-full">
              <div className="space-y-3">
                <RadioGroup 
                  value={publishType === 'public' ? 'classes' : publishType} 
                  onValueChange={(value: any) => setPublishType(value)}
                >
                  <div className="space-y-3">
                    {/* Specific Classes Option */}
                    <label 
                      htmlFor="classes" 
                      className={`flex items-start space-x-4 p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        publishType === 'classes' 
                          ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-sm' 
                          : 'border-border hover:border-primary/30 hover:bg-accent/30'
                      }`}
                    >
                      <RadioGroupItem value="classes" id="classes" className="mt-1" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg transition-colors ${
                            publishType === 'classes'
                              ? 'bg-primary/20 border border-primary/30'
                              : 'bg-muted'
                          }`}>
                            <Users className={`h-5 w-5 ${
                              publishType === 'classes' ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                          </div>
                          <div className="flex items-center gap-2 flex-1">
                            <span className="font-semibold text-base">Specific Classes</span>
                            {selectedClassIds.length > 0 && (
                              <Badge variant={publishType === 'classes' ? 'default' : 'secondary'} className="text-xs">
                                {selectedClassIds.length} {selectedClassIds.length === 1 ? 'Class' : 'Classes'}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Assign this exam to selected classes. Only students enrolled in those classes will see it in their assignments.
                        </p>
                      </div>
                    </label>
                  
                    {/* Private with Link Option */}
                    <label 
                      htmlFor="code" 
                      className={`flex items-start space-x-4 p-5 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        publishType === 'code' 
                          ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10 shadow-sm' 
                          : 'border-border hover:border-primary/30 hover:bg-accent/30'
                      }`}
                    >
                      <RadioGroupItem value="code" id="code" className="mt-1" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg transition-colors ${
                            publishType === 'code'
                              ? 'bg-primary/20 border border-primary/30'
                              : 'bg-muted'
                          }`}>
                            <Key className={`h-5 w-5 ${
                              publishType === 'code' ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                          </div>
                          <div className="flex items-center gap-2 flex-1">
                            <span className="font-semibold text-base">Private with Link</span>
                            {!isPublic && selectedClassIds.length === 0 && isPublished && (
                              <Badge className="text-xs bg-primary text-primary-foreground">
                                Active
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Keep this exam private and unlisted. Only those with the direct link can access it. Perfect for sharing with specific individuals.
                        </p>
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              </div>
                
              {/* Link Sharing Section */}
              {publishType === 'code' && isPublished && (
                <div className="p-4 bg-muted/50 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-md bg-background">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-medium">Share Exam Link</p>
                      <p className="text-xs text-muted-foreground mb-2">
                        Share this private link with anyone you want to give access to this exam.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`${typeof window !== 'undefined' ? window.location.origin : ''}/exam/${examId}/preview`}
                          className="flex-1 px-3 py-2 text-xs bg-background border rounded-lg font-mono"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/exam/${examId}/preview`);
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
            
              {/* Class Selection */}
              {publishType === 'classes' && (
                <div className="space-y-4 pt-2 border-t">
                  <div className="flex items-center justify-between pt-4">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Select Classes</h3>
                      <p className="text-xs text-muted-foreground mt-1">Choose which classes will have access to this exam</p>
                    </div>
                    {selectedClassIds.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedClassIds.length} Selected
                      </Badge>
                    )}
                  </div>
                  {loadingClasses ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">Loading your classes...</p>
                    </div>
                  ) : classes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                      <div className="p-4 rounded-full bg-muted">
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">No Classes Available</p>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          You need to create or join a class before you can assign exams to it.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[280px] overflow-y-auto border rounded-xl p-2 bg-muted/20">
                      {classes.map((cls) => {
                        const isAlreadyPublished = classesWithExistingAssignments.includes(cls.class_id);
                        const isSelected = selectedClassIds.includes(cls.class_id);
                      
                        return (
                          <div 
                            key={cls.class_id} 
                            className={`flex items-start space-x-3 p-3 rounded-lg transition-all duration-200 border-2 ${
                              isAlreadyPublished 
                                ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-sm' 
                                : isSelected
                                ? 'bg-accent/50 border-accent hover:bg-accent/70'
                                : 'bg-background hover:bg-accent/50 hover:shadow-sm border-transparent'
                            }`}
                          >
                            <Checkbox
                              id={`class-${cls.class_id}`}
                              checked={selectedClassIds.includes(cls.class_id)}
                              className="mt-1"
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  handleClassSelect(cls.class_id, true);
                                } else {
                                  handleClassSelect(cls.class_id, false);
                                }
                              }}
                            />
                            <Label
                              htmlFor={`class-${cls.class_id}`}
                              className="flex-1 space-y-1 cursor-pointer"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`font-semibold text-sm ${
                                  isAlreadyPublished ? 'text-primary' : ''
                                }`}>
                                  {cls.class_name}
                                </span>
                                {isAlreadyPublished && (
                                  <Badge className="text-xs bg-primary text-primary-foreground">
                                    <CheckIcon className="h-3 w-3 mr-1" />
                                    Assigned
                                  </Badge>
                                )}
                              </div>
                              {cls.description && (
                                <p className="text-xs text-muted-foreground leading-relaxed">{cls.description}</p>
                              )}
                              {isSelected && classAssignmentDates[cls.class_id] && (
                                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                  {classAssignmentDates[cls.class_id].access_at && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span>Access: {new Date(classAssignmentDates[cls.class_id].access_at!).toLocaleString()}</span>
                                    </div>
                                  )}
                                  {classAssignmentDates[cls.class_id].due_at && (
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      <span>Due: {new Date(classAssignmentDates[cls.class_id].due_at!).toLocaleString()}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </TabsContents>
        </Tabs>
        
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
            disabled={publishType === 'classes' && selectedClassIds.length === 0}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isPublished ? 'Updating...' : 'Publishing...'}
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4 mr-2" />
                {publishType === 'classes' ? `Publish to ${selectedClassIds.length} ${selectedClassIds.length === 1 ? 'Class' : 'Classes'}` : publishType === 'code' ? 'Publish with Link' : 'Publish Exam'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Class Assignment Dates Dialog */}
      <Dialog open={classDatesDialogOpen} onOpenChange={setClassDatesDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Set Assignment Dates</DialogTitle>
            <DialogDescription>
              Set when students can access this assignment and when it&apos;s due.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {(() => {
              const currentClass = classes.find(cls => cls.class_id === currentClassId);
              const periodStart = currentClass?.period_start;
              const periodEnd = currentClass?.period_end;
              
              return (
                <>
                  {periodStart && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                            Class Period Information
                          </p>
                          <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
                            Class starts at: <strong>{formatTimeString(periodStart)}</strong>
                            {periodEnd && (
                              <> • Ends at: <strong>{formatTimeString(periodEnd)}</strong></>
                            )}
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            Use this as a reference when setting access times.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}

            <div className="space-y-2">
              <Label htmlFor="access-at">
                <Clock className="h-4 w-4 inline mr-1" />
                Access Date & Time
              </Label>
              <Input
                id="access-at"
                type="datetime-local"
                value={tempAccessAt}
                onChange={(e) => setTempAccessAt(e.target.value)}
                placeholder="When students can start the assignment"
              />
              <p className="text-xs text-muted-foreground">
                Optional: Leave empty to allow immediate access
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due-at">
                <Calendar className="h-4 w-4 inline mr-1" />
                Due Date & Time
              </Label>
              <Input
                id="due-at"
                type="datetime-local"
                value={tempDueAt}
                onChange={(e) => setTempDueAt(e.target.value)}
                placeholder="When the assignment is due"
              />
              <p className="text-xs text-muted-foreground">
                Optional: Leave empty for no due date
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCancelClassDates}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveClassDates}>
              <CheckIcon className="h-4 w-4 mr-2" />
              Save Dates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

