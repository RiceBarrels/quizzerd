'use client';

import { useState, useEffect, use, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import FloatingFormatDock from '@/components/editors/floating-format-dock';
import { Tabs, TabsList, TabsTrigger, TabsContents, TabsContent } from '@/components/ui/shadcn-io/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, FileText, ListTodoIcon, ListChecksIcon, TextAlignStartIcon, NotepadTextIcon, CircleSlashIcon, ChevronDown, SlidersHorizontal, Calendar, Clock, Upload, Star, Code, Heading, Minus, BookOpenIcon, SettingsIcon } from 'lucide-react';
import { QuestionTypeOption } from '@/types/exam';
import ExamHeader from '@/components/exam/ExamHeader';
import ExamDetailsTab from '@/components/exam/ExamDetailsTab';
import QuestionsTab from '@/components/exam/QuestionsTab';
import ExamSettingsTab from '@/components/exam/ExamSettingsTab';
import PublishExamDialog from '@/components/exam/PublishExamDialog';
import CodeEditorModal from '@/components/exam/CodeEditorModal';
import QuestionSidebar from '@/components/exam/QuestionSidebar';
import AISidebar from '@/components/exam/AISidebar';
import { useQuestionOperations } from '@/hooks/useQuestionOperations';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useExamPublish } from '@/hooks/useExamPublish';
import { useRealtimePresence, ExamDataChange } from '@/hooks/useRealtimePresence';
import { OnlineCollaborators, CollaboratorCursors } from '@/components/collaboration';
import { ExamItem } from '@/types/exam';
import { PageParams } from '@/app/layout';
import { ScrollPosition } from '../layout';
import { Separator } from '@/components/ui/separator';

export default function EditExamPage({ params }: { params: Promise<PageParams> }) {
  const router = useRouter();
  const { examId } = use(params);
  const { user } = useUser();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('details');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const hasUnsavedChangesRef = useRef<boolean>(false);
  
  // Publish dialog state
  const [publishDialogOpen, setPublishDialogOpen] = useState<boolean>(false);

  // Form states
  const [examName, setExamName] = useState<string>('');
  const [examDescription, setExamDescription] = useState<string>('');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [attemptsAllowed, setAttemptsAllowed] = useState<number>(1);
  const [passingScore, setPassingScore] = useState<number>(70);
  const [shuffleItems, setShuffleItems] = useState<boolean>(false);
  const [showResultsImmediately, setShowResultsImmediately] = useState<boolean>(true);
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Cheating detection settings
  const [consoleDetection, setConsoleDetection] = useState<boolean>(false);
  const [translationDetection, setTranslationDetection] = useState<boolean>(false);
  const [allowWordByWordTranslation, setAllowWordByWordTranslation] = useState<boolean>(false);
  const [allowWordByWordDefinition, setAllowWordByWordDefinition] = useState<boolean>(false);
  const [visibilityChangeDetection, setVisibilityChangeDetection] = useState<boolean>(false);
  const [locationDetection, setLocationDetection] = useState<boolean>(false);
  const [location, setLocation] = useState<{ coordinates: string; rangeInMeters: string }>({ 
    coordinates: '', 
    rangeInMeters: '100' 
  });
  const [lastScrollPosition, setLastScrollPosition] = useState<ScrollPosition>({
    details: 0,
    questions: 0,
    settings: 0
  });

  // Sidebar state
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [highlightedCard, setHighlightedCard] = useState<string | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const lastSelectedIndexRef = useRef<number | null>(null);
  const scrollToQuestionRef = useRef<((questionId: string, isManualClick?: boolean) => void) | null>(null);

  // Items (questions)
  const [items, setItems] = useState<ExamItem[]>([]);

  // Track remote updates per question+field to prevent bounce-back
  // Key format: `${questionId}:${field}` -> timestamp
  const remoteUpdatesRef = useRef<Map<string, number>>(new Map());

  // Check if an update should be considered remote (within 500ms of receiving)
  const isRecentRemoteUpdate = useCallback((questionId: string, field: string): boolean => {
    const key = `${questionId}:${field}`;
    const timestamp = remoteUpdatesRef.current.get(key);
    if (!timestamp) return false;
    const isRecent = Date.now() - timestamp < 500; // 500ms window
    if (!isRecent) {
      remoteUpdatesRef.current.delete(key); // Clean up old entries
    }
    return isRecent;
  }, []);

  // Mark a field as remotely updated
  const markRemoteUpdate = useCallback((questionId: string, field: string) => {
    const key = `${questionId}:${field}`;
    remoteUpdatesRef.current.set(key, Date.now());
    // Auto-cleanup after 1 second
    setTimeout(() => {
      remoteUpdatesRef.current.delete(key);
    }, 1000);
  }, []);

  // Handle incoming data changes from collaborators
  const handleDataChange = useCallback((change: ExamDataChange) => {
    console.log('Handling remote data change:', change);

    switch (change.type) {
      case 'question_update':
        // Use questionId for reliable identification
        if (change.questionId && change.field && change.value !== undefined) {
          // Mark this field as remotely updated to prevent bounce-back
          markRemoteUpdate(change.questionId, change.field);

          setItems(prevItems => {
            const index = prevItems.findIndex(q => q.question_id === change.questionId);
            if (index === -1) return prevItems;

            const newItems = [...prevItems];
            newItems[index] = {
              ...newItems[index],
              [change.field!]: change.value,
            };
            return newItems;
          });
        }
        break;
      case 'question_add':
        if (change.value) {
          setItems(prevItems => [...prevItems, change.value]);
        }
        break;
      case 'question_delete':
        // Use questionId for reliable deletion
        if (change.questionId) {
          setItems(prevItems => prevItems.filter(q => q.question_id !== change.questionId));
        }
        break;
      case 'question_reorder':
        if (change.items) {
          setItems(change.items);
        }
        break;
      case 'exam_field_update':
        // Handle individual exam field updates
        if (change.field && change.value !== undefined) {
          markRemoteUpdate('exam', change.field);
          switch (change.field) {
            case 'exam_name': setExamName(change.value); break;
            case 'exam_description': setExamDescription(change.value); break;
            case 'duration_minutes': setDurationMinutes(change.value); break;
            case 'attempts_allowed': setAttemptsAllowed(change.value); break;
            case 'passing_score': setPassingScore(change.value); break;
            case 'shuffle_items': setShuffleItems(change.value); break;
            case 'show_results_immediately': setShowResultsImmediately(change.value); break;
            case 'is_public': setIsPublic(change.value); break;
            case 'start_date': setStartDate(change.value); break;
            case 'end_date': setEndDate(change.value); break;
            case 'console_detection': setConsoleDetection(change.value); break;
            case 'translation_detection': setTranslationDetection(change.value); break;
            case 'allow_word_by_word_translation': setAllowWordByWordTranslation(change.value); break;
            case 'allow_word_by_word_definition': setAllowWordByWordDefinition(change.value); break;
            case 'visibility_change_detection': setVisibilityChangeDetection(change.value); break;
            case 'location_detection': setLocationDetection(change.value); break;
            case 'location': setLocation(change.value); break;
          }
        }
        break;
      case 'exam_update':
        // Full sync - reload exam data
        if (change.examData) {
          if (change.examData.exam_name) setExamName(change.examData.exam_name);
          if (change.examData.exam_description !== undefined) setExamDescription(change.examData.exam_description);
          if (change.examData.items) setItems(change.examData.items);
        }
        break;
    }

    toast.info('Changes synced from collaborator', { duration: 2000 });
  }, [markRemoteUpdate]);

  // Realtime presence for collaboration
  const { onlineUsers, updateCursor, broadcastChange, isConnected } = useRealtimePresence({
    examId,
    enabled: !!user,
    onDataChange: handleDataChange,
  });

  // Store broadcastChange in ref to use in callbacks without causing re-renders
  const broadcastChangeRef = useRef(broadcastChange);
  useEffect(() => {
    broadcastChangeRef.current = broadcastChange;
  }, [broadcastChange]);

  // Helper to broadcast exam field changes
  const broadcastExamField = useCallback((field: string, value: any) => {
    if (broadcastChangeRef.current && !isRecentRemoteUpdate('exam', field)) {
      broadcastChangeRef.current({
        type: 'exam_field_update',
        field,
        value,
      });
    }
  }, [isRecentRemoteUpdate]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SYNCED EXAM FIELD SETTERS - These broadcast changes to collaborators
  // ═══════════════════════════════════════════════════════════════════════════

  const updateExamName = useCallback((value: string) => {
    setExamName(value);
    broadcastExamField('exam_name', value);
  }, [broadcastExamField]);

  const updateExamDescription = useCallback((value: string) => {
    setExamDescription(value);
    broadcastExamField('exam_description', value);
  }, [broadcastExamField]);

  const updateDurationMinutes = useCallback((value: number) => {
    setDurationMinutes(value);
    broadcastExamField('duration_minutes', value);
  }, [broadcastExamField]);

  const updateAttemptsAllowed = useCallback((value: number) => {
    setAttemptsAllowed(value);
    broadcastExamField('attempts_allowed', value);
  }, [broadcastExamField]);

  const updatePassingScore = useCallback((value: number) => {
    setPassingScore(value);
    broadcastExamField('passing_score', value);
  }, [broadcastExamField]);

  const updateShuffleItems = useCallback((value: boolean) => {
    setShuffleItems(value);
    broadcastExamField('shuffle_items', value);
  }, [broadcastExamField]);

  const updateShowResultsImmediately = useCallback((value: boolean) => {
    setShowResultsImmediately(value);
    broadcastExamField('show_results_immediately', value);
  }, [broadcastExamField]);

  const updateIsPublic = useCallback((value: boolean) => {
    setIsPublic(value);
    broadcastExamField('is_public', value);
  }, [broadcastExamField]);

  const updateStartDate = useCallback((value: string) => {
    setStartDate(value);
    broadcastExamField('start_date', value);
  }, [broadcastExamField]);

  const updateEndDate = useCallback((value: string) => {
    setEndDate(value);
    broadcastExamField('end_date', value);
  }, [broadcastExamField]);

  const updateConsoleDetection = useCallback((value: boolean) => {
    setConsoleDetection(value);
    broadcastExamField('console_detection', value);
  }, [broadcastExamField]);

  const updateTranslationDetection = useCallback((value: boolean) => {
    setTranslationDetection(value);
    broadcastExamField('translation_detection', value);
  }, [broadcastExamField]);

  const updateAllowWordByWordTranslation = useCallback((value: boolean) => {
    setAllowWordByWordTranslation(value);
    broadcastExamField('allow_word_by_word_translation', value);
  }, [broadcastExamField]);

  const updateAllowWordByWordDefinition = useCallback((value: boolean) => {
    setAllowWordByWordDefinition(value);
    broadcastExamField('allow_word_by_word_definition', value);
  }, [broadcastExamField]);

  const updateVisibilityChangeDetection = useCallback((value: boolean) => {
    setVisibilityChangeDetection(value);
    broadcastExamField('visibility_change_detection', value);
  }, [broadcastExamField]);

  const updateLocationDetection = useCallback((value: boolean) => {
    setLocationDetection(value);
    broadcastExamField('location_detection', value);
  }, [broadcastExamField]);

  const updateLocation = useCallback((value: { coordinates: string; rangeInMeters: string }) => {
    setLocation(value);
    broadcastExamField('location', value);
  }, [broadcastExamField]);

  // Store last known cursor state for selection updates
  const lastCursorStateRef = useRef<{
    questionId: string | null;
    fieldType: 'question' | 'option' | 'explanation' | 'settings' | null;
    optionIndex?: number;
  }>({ questionId: null, fieldType: null });

  // Track cursor position for realtime presence (must be after useRealtimePresence)
  const handleCursorUpdate = useCallback((questionId: string | null, fieldType?: 'question' | 'option' | 'explanation' | 'settings', optionIndex?: number, editorId?: string, selectionIndex?: number, selectionLength?: number) => {
    lastCursorStateRef.current = { questionId, fieldType: fieldType || null, optionIndex };
    updateCursor({
      questionId,
      fieldType: fieldType || null,
      optionIndex,
      editorId,
      selectionIndex,
      selectionLength,
    });
  }, [updateCursor]);

  // Handle field focus for presence tracking
  const handleFocusField = useCallback((questionId: string, fieldType: 'question' | 'option' | 'explanation' | 'settings', optionIndex?: number) => {
    if (isConnected) {
      handleCursorUpdate(questionId, fieldType, optionIndex);
    }
  }, [isConnected, handleCursorUpdate]);

  // Handle selection change for presence tracking
  const handleSelectionChange = useCallback((editorId: string, selectionIndex: number, selectionLength: number) => {
    if (isConnected) {
      const { questionId, fieldType, optionIndex } = lastCursorStateRef.current;
      updateCursor({
        questionId,
        fieldType,
        optionIndex,
        editorId,
        selectionIndex,
        selectionLength,
      });
    }
  }, [isConnected, updateCursor]);

  // Handle typing activity for presence tracking
  const handleActivity = useCallback((editorId: string, isTyping: boolean) => {
    if (isConnected) {
      const { questionId, fieldType, optionIndex } = lastCursorStateRef.current;
      updateCursor({
        questionId,
        fieldType,
        optionIndex,
        editorId,
        isTyping,
        lastActivityTimestamp: isTyping ? Date.now() : undefined,
      });
    }
  }, [isConnected, updateCursor]);

  // Update cursor when active question changes
  useEffect(() => {
    if (activeQuestionId && isConnected) {
      handleCursorUpdate(activeQuestionId, 'question');
    }
  }, [activeQuestionId, isConnected, handleCursorUpdate]);

  const [codeEditorModal, setCodeEditorModal] = useState<{
    isOpen: boolean;
    questionIndex: number | null;
    files: { name: string; content: string }[];
  }>({
    isOpen: false,
    questionIndex: null,
    files: []
  });

  // Question types for sidebar - memoized to prevent recreation on every render
  const questionTypes = useMemo<QuestionTypeOption[]>(() => [
    { value: 'multiple_choice', label: 'Multiple Choice', icon: ListTodoIcon },
    { value: 'multiple_select', label: 'Multiple Select', icon: ListChecksIcon },
    { value: 'short_answer', label: 'Short Answer', icon: TextAlignStartIcon },
    { value: 'long_answer', label: 'Long Answer', icon: NotepadTextIcon },
    { value: 'true_false', label: 'True/False', icon: CircleSlashIcon },
    { value: 'dropdown', label: 'Dropdown', icon: ChevronDown },
    { value: 'scale', label: 'Scale', icon: SlidersHorizontal },
    { value: 'date', label: 'Date', icon: Calendar },
    { value: 'time', label: 'Time', icon: Clock },
    { value: 'file_upload', label: 'File Upload', icon: Upload },
    { value: 'rating', label: 'Rating', icon: Star },
    { value: 'coding', label: 'Coding', icon: Code },
    { value: 'section_header', label: 'Section Header', icon: Heading },
    { value: 'page_break', label: 'Page Break', icon: Minus },
  ], []);

  const fetchExam = useCallback(async () => {
    try {
      const response = await fetch(`/api/exams/get?examId=${examId}`);
      const result = await response.json();
      
      if (result.success) {
        const examData = result.data;
        
        // Log only in development
        if (process.env.NODE_ENV === 'development') {
        console.log('Loaded exam data with items:', (examData.items || []).map((item:any, idx:number) => ({
          index: idx,
          question_id: item.question_id,
          question_text: item.question_text ? item.question_text.substring(0, 50) + '...' : 'EMPTY',
          question_type: item.question_type
        })));
        }
        
        // Populate form fields
        setExamName(examData.exam_name || '');
        setExamDescription(examData.exam_description || '');
        setDurationMinutes(examData.duration_minutes || 60);
        setAttemptsAllowed(examData.attempts_allowed || 1);
        setPassingScore(examData.passing_score || 70);
        setShuffleItems(examData.shuffle_items || false);
        setShowResultsImmediately(examData.show_results_immediately !== false);
        setIsPublic(examData.is_public || false);
        setIsPublished(examData.is_published || false);
        setStartDate(examData.start_date ? new Date(examData.start_date).toISOString().slice(0, 16) : '');
        setEndDate(examData.end_date ? new Date(examData.end_date).toISOString().slice(0, 16) : '');
        setItems(examData.items || []);
        
        // Load cheating detection settings
        setConsoleDetection(examData.console_detection || false);
        setTranslationDetection(examData.translation_detection || false);
        setAllowWordByWordTranslation(examData.allow_word_by_word_translation || false);
        setAllowWordByWordDefinition(examData.allow_word_by_word_definition || false);
        setVisibilityChangeDetection(examData.visibility_change_detection || false);
        setLocationDetection(examData.location_detection || false);
        
        // Load location data
        if (examData.location) {
          setLocation({
            coordinates: examData.location.coordinates || '',
            rangeInMeters: examData.location.rangeInMeters || '100'
          });
        }
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
    }, [examId, router]);

  useEffect(() => {
    fetchExam();
  }, [fetchExam]);

  const addNewQuestion = useCallback(() => {
    const newQuestion: ExamItem = {
      question_id: `q_${Date.now()}`,
      question_text: '',
      question_type: 'multiple_choice' as const,
      options: ['', ''],
      correct_answer: 0,
      points: 10,
      explanation: '',
      required: true
    };
    setItems(prevItems => [...prevItems, newQuestion]);
    setActiveTab('questions');

    // Broadcast to collaborators
    if (broadcastChangeRef.current) {
      broadcastChangeRef.current({
        type: 'question_add',
        value: newQuestion,
      });
    }
  }, []);

  const addPageBreak = useCallback(() => {
    const timestamp = Date.now();
    const pageBreak: ExamItem = {
      question_id: `pb_${timestamp}`,
      question_text: 'Page Break',
      question_type: 'page_break' as const,
      points: 0,
      required: false
    };
    setItems(prevItems => [...prevItems, pageBreak]);
    setActiveTab('questions');

    // Broadcast to collaborators
    if (broadcastChangeRef.current) {
      broadcastChangeRef.current({
        type: 'question_add',
        value: pageBreak,
      });
    }
  }, []);

  const addAIQuestions = useCallback((questions: ExamItem[]) => {
    setItems(prevItems => [...prevItems, ...questions]);
    setActiveTab('questions');

    // Broadcast each question to collaborators
    if (broadcastChangeRef.current) {
      questions.forEach(q => {
        broadcastChangeRef.current!({
          type: 'question_add',
          value: q,
        });
      });
    }
  }, []);

  // Use auto-save hook (must be before updateQuestion that uses triggerSave)
  const { triggerSave: triggerAutoSave } = useAutoSave({
    dependencies: [
      examName, examDescription, durationMinutes, attemptsAllowed, passingScore,
      shuffleItems, showResultsImmediately, isPublic, startDate, endDate, items,
      consoleDetection, translationDetection, allowWordByWordTranslation,
      allowWordByWordDefinition, visibilityChangeDetection, locationDetection, location
    ],
    saveFn: (isAutoSave: boolean) => saveExam(false, isAutoSave),
    enabled: !loading && !!examName,
  });

  // Use question operations hook
  const questionOperations = useQuestionOperations(items, setItems, examId);
  
  // Store triggerAutoSave in ref to avoid dependency issues
  const triggerAutoSaveRef = useRef(triggerAutoSave);
  useEffect(() => {
    triggerAutoSaveRef.current = triggerAutoSave;
  }, [triggerAutoSave]);
  
  // Store items in ref to avoid dependency issues
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Wrapper for updateQuestion to trigger auto-save and broadcast to collaborators
  const updateQuestion = useCallback((index: number, field: keyof ExamItem, value: any) => {
    const questionId = itemsRef.current[index]?.question_id;

    // Log only in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📝 updateQuestion called:`, {
        index,
        questionId,
        field,
        value: field === 'question_text' ? value.substring(0, 100) + '...' : value,
      });
    }
    questionOperations.updateQuestion(index, field, value);
    // Trigger auto-save immediately when a question is updated
    triggerAutoSaveRef.current();

    // Broadcast change to collaborators (only if not a recent remote update for this field)
    if (questionId && broadcastChangeRef.current && !isRecentRemoteUpdate(questionId, field as string)) {
      console.log('📡 Broadcasting change:', { questionId, field });
      broadcastChangeRef.current({
        type: 'question_update',
        questionId,
        questionIndex: index,
        field: field as string,
        value,
      });
    }
  }, [questionOperations, isRecentRemoteUpdate]);

  // Wrapper for removeQuestion to broadcast changes
  const removeQuestion = useCallback((index: number) => {
    const questionId = itemsRef.current[index]?.question_id;
    questionOperations.removeQuestion(index);

    // Broadcast change to collaborators
    if (questionId && broadcastChangeRef.current) {
      broadcastChangeRef.current({
        type: 'question_delete',
        questionId,
        questionIndex: index,
      });
    }
  }, [questionOperations]);

  // Wrapper for reorderQuestions to broadcast changes
  const reorderQuestions = useCallback((newItems: ExamItem[]) => {
    questionOperations.reorderQuestions(newItems);

    // Broadcast change to collaborators
    if (broadcastChangeRef.current) {
      broadcastChangeRef.current({
        type: 'question_reorder',
        items: newItems,
      });
    }
  }, [questionOperations]);

  // Wrapper for updateOption to broadcast changes
  const updateOption = useCallback((questionIndex: number, optionIndex: number, value: string) => {
    const questionId = itemsRef.current[questionIndex]?.question_id;
    questionOperations.updateOption(questionIndex, optionIndex, value);
    // Trigger auto-save
    triggerAutoSaveRef.current();

    // Broadcast the entire options array after the update
    if (questionId && broadcastChangeRef.current && !isRecentRemoteUpdate(questionId, 'options')) {
      // Get current options and update the specific one
      const currentOptions = [...(itemsRef.current[questionIndex]?.options || [])];
      currentOptions[optionIndex] = value;

      broadcastChangeRef.current({
        type: 'question_update',
        questionId,
        questionIndex,
        field: 'options',
        value: currentOptions,
      });
    }
  }, [questionOperations, isRecentRemoteUpdate]);

  const getDefaultStarterFiles = useCallback((language?: string) => {
    switch (language) {
      case 'python':
        return [{ name: 'main.py', content: '# Write your Python code here\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()\n' }];
      case 'java':
        return [{ name: 'Main.java', content: '// Write your Java code here\n\npublic class Main {\n    public static void main(String[] args) {\n        \n    }\n}\n' }];
      case 'c':
        return [{ name: 'main.c', content: '// Write your C code here\n\n#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}\n' }];
      case 'cpp':
        return [{ name: 'main.cpp', content: '// Write your C++ code here\n\n#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}\n' }];
      case 'html':
      default:
        return [{ name: 'index.html', content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Document</title>\n</head>\n<body>\n    \n</body>\n</html>\n' }];
    }
  }, []);

  const openCodeEditor = useCallback((questionIndex: number) => {
    const question = itemsRef.current[questionIndex];
    if (question && question.question_type === 'coding') {
      setCodeEditorModal({
        isOpen: true,
        questionIndex,
        files: question.starter_files || getDefaultStarterFiles(question.coding_language)
      });
    }
  }, [getDefaultStarterFiles]);

  const closeCodeEditor = useCallback(() => {
    setCodeEditorModal({
      isOpen: false,
      questionIndex: null,
      files: []
    });
  }, []);

  const handleCodeEditorChange = useCallback((files: { name: string; content: string }[]) => {
    if (codeEditorModal.questionIndex !== null) {
      // Use setTimeout to ensure this doesn't happen during render
      setTimeout(() => {
        updateQuestion(codeEditorModal.questionIndex!, 'starter_files', files);
      // Also update the modal state so the CodeEditor's files prop reflects the changes
      setCodeEditorModal(prev => ({
        ...prev,
        files: files
      }));
      }, 0);
    }
  }, [codeEditorModal.questionIndex, updateQuestion]);

  // Memoize total points calculation to avoid recalculating on every render
  const totalPoints = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.points || 0), 0);
  }, [items]);

  // Memoize question numbers map for cursor display (maps question_id to 1-indexed number)
  const questionNumbers = useMemo(() => {
    const map = new Map<string, number>();
    let questionNum = 1;
    items.forEach((item) => {
      // Only count actual questions, not page breaks or section headers
      if (item.question_type !== 'page_break' && item.question_type !== 'section_header') {
        map.set(item.question_id, questionNum);
        questionNum++;
      }
    });
    return map;
  }, [items]);

  // Sidebar helper functions
  const getQuestionTitle = useCallback((item: ExamItem): string => {
    if (item.question_type === 'section_header') return 'Section Header';
    if (item.question_type === 'page_break') return 'Page Break';
    
    // Strip HTML tags and get first 50 characters
    const text = item.question_text?.replace(/<[^>]*>/g, '') || 'Untitled Question';
    return text.length > 50 ? text.substring(0, 50) + '...' : text;
  }, []);

  // Helper function for sidebar question click
  // Handle question selection with Shift/Cmd/Ctrl support
  const handleQuestionSelect = useCallback((questionId: string, event: React.MouseEvent) => {
    const questionIndex = items.findIndex(q => q.question_id === questionId);
    if (questionIndex === -1) return;

    const isShift = event.shiftKey;
    const isCmdOrCtrl = event.metaKey || event.ctrlKey;

    setSelectedQuestions(prev => {
      const newSelected = new Set(prev);

      if (isShift && lastSelectedIndexRef.current !== null) {
        // Range selection
        const start = Math.min(lastSelectedIndexRef.current, questionIndex);
        const end = Math.max(lastSelectedIndexRef.current, questionIndex);
        for (let i = start; i <= end; i++) {
          newSelected.add(items[i].question_id);
        }
        lastSelectedIndexRef.current = questionIndex;
      } else if (isCmdOrCtrl) {
        // Toggle selection
        if (newSelected.has(questionId)) {
          newSelected.delete(questionId);
        } else {
          newSelected.add(questionId);
        }
        lastSelectedIndexRef.current = questionIndex;
      } else {
        // Single selection (clear others)
        newSelected.clear();
        newSelected.add(questionId);
        lastSelectedIndexRef.current = questionIndex;
      }

      return newSelected;
    });

    setHighlightedCard(questionId);
    setActiveQuestionId(questionId);
    if (scrollToQuestionRef.current) {
      scrollToQuestionRef.current(questionId, true);
    }
  }, [items]);

  const handleSidebarQuestionClick = useCallback((questionId: string, event?: React.MouseEvent) => {
    if (event) {
      handleQuestionSelect(questionId, event);
    } else {
      // Fallback for programmatic calls
      setHighlightedCard(questionId);
      setActiveQuestionId(questionId);
      if (scrollToQuestionRef.current) {
        scrollToQuestionRef.current(questionId, true);
      }
    }
  }, [handleQuestionSelect]);

  const deleteExam = useCallback(async () => {
    try {
      const response = await fetch(`/api/exams/delete?examId=${examId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete exam');
      }

      toast.success('Exam deleted successfully');
      router.push('/exam');
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast.error('Failed to delete exam');
    }
  }, [examId, router]);

  const handlePublishClick = useCallback(() => {
    setPublishDialogOpen(true);
  }, []);
  
  // Use publish hook
  const { handlePublish: publishExam, saving: publishSaving } = useExamPublish({
    examId,
    examName,
    examDescription,
    durationMinutes,
    attemptsAllowed,
    passingScore,
    shuffleItems,
    showResultsImmediately,
    startDate,
    endDate,
    items,
    totalPoints,
    consoleDetection,
    translationDetection,
    allowWordByWordTranslation,
    allowWordByWordDefinition,
    visibilityChangeDetection,
    locationDetection,
    location,
    onSuccess: () => {
      setIsPublished(true);
    }
  });

  const handlePublish = useCallback(async (
    publishType: 'public' | 'classroom' | 'link'
  ) => {
    setPublishDialogOpen(false);

    try {
      // For public/link, use the existing publish flow
      if (publishType === 'public' || publishType === 'link') {
        await publishExam(publishType === 'public' ? 'public' : 'code');
        if (publishType === 'public') {
          setIsPublic(true);
        }
        setIsPublished(true);
      }
      // Classroom publishing is handled directly in the dialog
    } catch (error) {
      // Error already handled in hook
    }
  }, [publishExam]);

  const saveExam = useCallback(async (publish: boolean = false, isAutoSave: boolean = false) => {
    if (!isAutoSave) {
      setSaving(true);
    }
    
    // Log only in development
    if (process.env.NODE_ENV === 'development') {
    console.log('💾 Saving exam with items:', items.map((item, idx) => ({
      index: idx,
      question_id: item.question_id,
      question_text: item.question_text ? item.question_text.substring(0, 50) + '...' : 'EMPTY',
      question_type: item.question_type
    })));
    }
    
    try {
      const response = await fetch(`/api/exams/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          exam_id: examId,
          exam_name: examName,
          exam_description: examDescription,
          duration_minutes: durationMinutes,
          attempts_allowed: attemptsAllowed,
          passing_score: passingScore,
          shuffle_items: shuffleItems,
          show_results_immediately: showResultsImmediately,
          is_public: isPublic,
          is_published: publish ? true : isPublished,
          start_date: startDate || null,
          end_date: endDate || null,
          items: items,
          total_points: totalPoints,
          status: publish ? 'published' : 'draft',
          // Cheating detection settings
          console_detection: consoleDetection,
          translation_detection: translationDetection,
          allow_word_by_word_translation: allowWordByWordTranslation,
          allow_word_by_word_definition: allowWordByWordDefinition,
          visibility_change_detection: visibilityChangeDetection,
          location_detection: locationDetection,
          location: location
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setLastSaved(new Date());
        hasUnsavedChangesRef.current = false;
        
        if (!isAutoSave) {
          toast.success(publish ? 'Exam published successfully!' : 'Exam saved successfully!');
        } else {
          toast.success('Auto-saved', {
            duration: 2000,
            position: 'bottom-right'
          });
        }
        
        if (publish) {
          setIsPublished(true);
        }
      } else {
        if (!isAutoSave) {
          toast.error(result.error || 'Failed to save exam');
        }
      }
    } catch (error) {
      console.error('Error saving exam:', error);
      if (!isAutoSave) {
        toast.error('Failed to save exam');
      }
    } finally {
      if (!isAutoSave) {
        setSaving(false);
      }
    }
  }, [
    examId,
    examName,
    examDescription,
    durationMinutes,
    attemptsAllowed,
    passingScore,
    shuffleItems,
    showResultsImmediately,
    isPublic,
    isPublished,
    startDate,
    endDate,
    items,
    consoleDetection,
    translationDetection,
    allowWordByWordTranslation,
    allowWordByWordDefinition,
    visibilityChangeDetection,
    locationDetection,
    location,
    totalPoints
  ]);

  // Save scroll position while scrolling
  useEffect(() => {
    const scrollContainer = document.querySelector('.overflow-y-auto');
    if (!scrollContainer) return;

    let scrollTimeout:NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setLastScrollPosition(prev => ({
          ...prev,
          [activeTab]: scrollContainer.scrollTop
        }));
      }, 100);
    };

    scrollContainer.addEventListener('scroll', handleScroll);

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [activeTab]);

  // Keyboard shortcuts for questions (Cmd/Ctrl + C, A, V, X)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when questions tab is active
      if (activeTab !== 'questions') return;

      // Check if user is typing in an input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      const isEditing =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]') ||
        target.closest('.ProseMirror') ||
        target.closest('.tiptap');

      // Don't intercept if user is editing text
      if (isEditing) return;

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && e.key.toLowerCase() === 'a') {
        // Select all questions
        e.preventDefault();
        const allQuestionIds = new Set(items.map(item => item.question_id));
        setSelectedQuestions(allQuestionIds);
        toast.success(`Selected all ${items.length} questions`);
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'c') {
        // Copy selected questions
        e.preventDefault();
        if (selectedQuestions.size > 0) {
          const selectedIndices = items
            .map((item, index) => selectedQuestions.has(item.question_id) ? index : -1)
            .filter(index => index !== -1);
          questionOperations.copyQuestion(selectedIndices);
          toast.success(`Copied ${selectedIndices.length} question${selectedIndices.length > 1 ? 's' : ''}`);
        } else if (highlightedCard) {
          const index = items.findIndex(item => item.question_id === highlightedCard);
          if (index !== -1) {
            questionOperations.copyQuestion(index);
            toast.success('Copied question');
          }
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'x') {
        // Cut selected questions
        e.preventDefault();
        if (selectedQuestions.size > 0) {
          const selectedIndices = items
            .map((item, index) => selectedQuestions.has(item.question_id) ? index : -1)
            .filter(index => index !== -1);
          questionOperations.cutQuestion(selectedIndices);
          setSelectedQuestions(new Set());
          toast.success(`Cut ${selectedIndices.length} question${selectedIndices.length > 1 ? 's' : ''}`);
        } else if (highlightedCard) {
          const index = items.findIndex(item => item.question_id === highlightedCard);
          if (index !== -1) {
            questionOperations.cutQuestion(index);
            setHighlightedCard(null);
            toast.success('Cut question');
          }
        }
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'v') {
        // Paste questions
        e.preventDefault();
        // Find the index to paste after (last selected or highlighted, or end of list)
        let pasteAfterIndex = items.length - 1;
        if (selectedQuestions.size > 0) {
          const selectedIndices = items
            .map((item, index) => selectedQuestions.has(item.question_id) ? index : -1)
            .filter(index => index !== -1);
          pasteAfterIndex = Math.max(...selectedIndices);
        } else if (highlightedCard) {
          const index = items.findIndex(item => item.question_id === highlightedCard);
          if (index !== -1) pasteAfterIndex = index;
        }
        questionOperations.pasteQuestion(pasteAfterIndex);
      } else if ((isCmdOrCtrl && (e.key === 'Backspace' || e.key === 'Delete'))) {
        // Delete selected questions (Cmd/Ctrl + Backspace/Delete, or just Backspace when not editing)
        e.preventDefault();
        if (selectedQuestions.size > 0) {
          const selectedIndices = items
            .map((item, index) => selectedQuestions.has(item.question_id) ? index : -1)
            .filter(index => index !== -1)
            .sort((a, b) => b - a); // Sort descending to delete from end first
          selectedIndices.forEach(index => removeQuestion(index));
          setSelectedQuestions(new Set());
          setHighlightedCard(null);
          toast.success(`Deleted ${selectedIndices.length} question${selectedIndices.length > 1 ? 's' : ''}`);
        } else if (highlightedCard) {
          const index = items.findIndex(item => item.question_id === highlightedCard);
          if (index !== -1) {
            removeQuestion(index);
            setHighlightedCard(null);
            toast.success('Deleted question');
          }
        }
      } else if (isCmdOrCtrl && (e.key.toLowerCase() === 'n' || e.key.toLowerCase() === 't')) {
        // Create new question (Cmd/Ctrl + N or T)
        e.preventDefault();
        addNewQuestion();
        toast.success('Added new question');
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        // Undo (Cmd/Ctrl + Z)
        e.preventDefault();
        questionOperations.undo();
      } else if ((isCmdOrCtrl && e.key.toLowerCase() === 'y') || (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z')) {
        // Redo (Cmd/Ctrl + Y or Cmd/Ctrl + Shift + Z)
        e.preventDefault();
        questionOperations.redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, items, selectedQuestions, highlightedCard, questionOperations, addNewQuestion]);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <FloatingFormatDock />

      {/* Real-time collaborator cursors */}
      <CollaboratorCursors
        onlineUsers={onlineUsers}
        currentUserId={user?.id}
        updateCursor={updateCursor}
        isConnected={isConnected}
        questionNumbers={questionNumbers}
      />

      {/* Fullscreen Code Editor Modal */}
      <CodeEditorModal
        isOpen={codeEditorModal.isOpen}
        questionIndex={codeEditorModal.questionIndex}
                files={codeEditorModal.files}
        onClose={closeCodeEditor}
                onChange={handleCodeEditorChange}
              />

      <div className="w-full py-8 flex-1 flex flex-col">
      <ExamHeader
        examId={examId}
        examName={examName}
        isPublished={isPublished}
        saving={saving || publishSaving}
        onSave={() => saveExam(false)}
        onPublish={handlePublishClick}
        onPreview={() => router.push(`/exam/${examId}/preview`)}
        canPublish={!!(examName && items.length > 0)}
        lastSaved={lastSaved}
        onlineUsers={onlineUsers}
        currentUserId={user?.id}
      />

      {/* Questions Sidebar */}
      <QuestionSidebar
        items={items}
        activeTab={activeTab}
        activeQuestionId={activeQuestionId}
        highlightedCard={highlightedCard}
        questionTypes={questionTypes}
        onQuestionClick={handleSidebarQuestionClick}
        onReorder={reorderQuestions}
        getQuestionTitle={getQuestionTitle}
        onUpdateQuestion={updateQuestion}
        onAddOption={questionOperations.addOption}
        onRemoveQuestion={removeQuestion}
        onDuplicateQuestion={questionOperations.duplicateQuestion}
        onCopyQuestion={questionOperations.copyQuestion}
        onCutQuestion={questionOperations.cutQuestion}
        onPasteQuestion={questionOperations.pasteQuestion}
        onMoveUp={questionOperations.moveUp}
        onMoveDown={questionOperations.moveDown}
        onInsertAbove={questionOperations.insertAbove}
        onInsertBelow={questionOperations.insertBelow}
        onResetQuestion={questionOperations.resetQuestion}
        onShuffleOptions={questionOperations.shuffleOptions}
        onClearOptions={questionOperations.clearOptions}
        onExportQuestion={questionOperations.exportQuestion}
        onUndo={questionOperations.undo}
        onRedo={questionOperations.redo}
        canUndo={questionOperations.canUndo}
        canRedo={questionOperations.canRedo}
        selectedQuestions={selectedQuestions}
        onQuestionSelect={handleQuestionSelect}
        onlineUsers={onlineUsers}
        currentUserId={user?.id}
      />

      {/* AI Sidebar */}
      <AISidebar
        activeTab={activeTab}
        onAddQuestions={addAIQuestions}
      />

      <Tabs value={activeTab} onValueChange={(value) => {
        const scrollContainer = document.querySelector('.overflow-y-auto');
        if (scrollContainer) {
          // Save current tab's scroll position
          setLastScrollPosition(prev => ({
            ...prev,
            [activeTab]: scrollContainer.scrollTop
          }));
          
          // Switch tab
          setActiveTab(value);
          
          // Restore new tab's scroll position
          setTimeout(() => {
            scrollContainer.scrollTo({
              top: lastScrollPosition[value as keyof ScrollPosition] || 0,
              behavior: 'smooth'
            });
          }, 50);
        } else {
          setActiveTab(value);
        }
      }} className="flex-1">
        <TabsList id="tabs-list" className="ml-8 sticky top-8 z-10">
          <TabsTrigger value="details" className="flex items-center gap-2"><BookOpenIcon className="w-4 h-4" /> <span className="sm:block hidden">Exam Details</span></TabsTrigger>
          <div className="flex items-center h-5 m-2"><Separator orientation="vertical"/></div>
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <ListTodoIcon className="w-4 h-4" />
            <span className="flex items-center gap-2 flex-1 sm:block hidden">
              Questions ({items.length})
            </span>
          </TabsTrigger>
          <div className="flex items-center h-5 m-2"><Separator orientation="vertical"/></div>
          <TabsTrigger value="settings" className="flex items-center gap-2"><SettingsIcon className="w-4 h-4" /> <span className="sm:block hidden">Settings</span></TabsTrigger>
        </TabsList>

        <TabsContents className="mt-4 overflow-x-hidden">
          <TabsContent value="details" className="container mx-auto px-12 max-w-6xl overflow-y-auto flex-1">
            <ExamDetailsTab
              examName={examName}
              examDescription={examDescription}
              startDate={startDate}
              endDate={endDate}
              onExamNameChange={updateExamName}
              onDescriptionChange={updateExamDescription}
              onStartDateChange={updateStartDate}
              onEndDateChange={updateEndDate}
            />
          </TabsContent>

          <TabsContent value="questions" className="w-full px-12 flex-1">
            <QuestionsTab
              items={items}
              onUpdateQuestion={updateQuestion}
              onAddOption={questionOperations.addOption}
              onUpdateOption={updateOption}
              onRemoveOption={questionOperations.removeOption}
              onRemoveQuestion={removeQuestion}
              onDuplicateQuestion={questionOperations.duplicateQuestion}
              onCopyQuestion={questionOperations.copyQuestion}
              onCutQuestion={questionOperations.cutQuestion}
              onPasteQuestion={questionOperations.pasteQuestion}
              onMoveUp={questionOperations.moveUp}
              onMoveDown={questionOperations.moveDown}
              onInsertAbove={questionOperations.insertAbove}
              onInsertBelow={questionOperations.insertBelow}
              onResetQuestion={questionOperations.resetQuestion}
              onShuffleOptions={questionOperations.shuffleOptions}
              onClearOptions={questionOperations.clearOptions}
              onExportQuestion={questionOperations.exportQuestion}
              onUndo={questionOperations.undo}
              onRedo={questionOperations.redo}
              canUndo={questionOperations.canUndo}
              canRedo={questionOperations.canRedo}
              onAddNewQuestion={addNewQuestion}
              onAddPageBreak={addPageBreak}
              onAddAIQuestions={addAIQuestions}
              onReorderQuestions={reorderQuestions}
              onOpenCodeEditor={openCodeEditor}
              onScrollToQuestionRef={(scrollFn) => {
                scrollToQuestionRef.current = scrollFn;
              }}
              activeQuestionId={activeQuestionId}
              onActiveQuestionIdChange={setActiveQuestionId}
              highlightedCard={highlightedCard}
              onHighlightedCardChange={setHighlightedCard}
              selectedQuestions={selectedQuestions}
              onQuestionSelect={handleQuestionSelect}
              onlineUsers={onlineUsers}
              currentUserId={user?.id}
              onFocusField={handleFocusField}
              onSelectionChange={handleSelectionChange}
              onActivity={handleActivity}
            />
          </TabsContent>

          <TabsContent value="settings" className="container mx-auto px-12 overflow-y-auto flex-1 max-w-6xl">
            <ExamSettingsTab
              durationMinutes={durationMinutes}
              attemptsAllowed={attemptsAllowed}
              passingScore={passingScore}
              shuffleItems={shuffleItems}
              showResultsImmediately={showResultsImmediately}
              isPublic={isPublic}
              consoleDetection={consoleDetection}
              translationDetection={translationDetection}
              allowWordByWordTranslation={allowWordByWordTranslation}
              allowWordByWordDefinition={allowWordByWordDefinition}
              visibilityChangeDetection={visibilityChangeDetection}
              locationDetection={locationDetection}
              onDurationChange={updateDurationMinutes}
              onAttemptsChange={updateAttemptsAllowed}
              onPassingScoreChange={updatePassingScore}
              onShuffleChange={updateShuffleItems}
              onShowResultsChange={updateShowResultsImmediately}
              onPublicChange={updateIsPublic}
              onConsoleDetectionChange={updateConsoleDetection}
              onTranslationDetectionChange={updateTranslationDetection}
              onAllowWordByWordTranslationChange={updateAllowWordByWordTranslation}
              onAllowWordByWordDefinitionChange={updateAllowWordByWordDefinition}
              onVisibilityChangeDetectionChange={updateVisibilityChangeDetection}
              onLocationDetectionChange={updateLocationDetection}
              location={location}
              onLocationChange={updateLocation}
              onDeleteExam={deleteExam}
            />
          </TabsContent>
        </TabsContents>
      </Tabs>
      
      {/* Publish Dialog */}
      <PublishExamDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        examId={examId}
        examName={examName}
        examDescription={examDescription}
        isPublic={isPublic}
        isPublished={isPublished}
        onPublish={handlePublish}
        saving={saving || publishSaving}
      />
    </div>
    </>
  );
}