'use client';

import { useState, useEffect, use, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { ExamItem } from '@/types/exam';
import { PageParams } from '@/app/layout';
import { ScrollPosition } from '../layout';
import { Separator } from '@/components/ui/separator';

export default function EditExamPage({ params }: { params: Promise<PageParams> }) {
  const router = useRouter();
  const { examId } = use(params);

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
  }, []);

  const addAIQuestions = useCallback((questions: ExamItem[]) => {
    setItems(prevItems => [...prevItems, ...questions]);
    setActiveTab('questions');
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
  
  // Wrapper for updateQuestion to trigger auto-save
  // Removed items from dependencies to prevent unnecessary recreations
  const updateQuestion = useCallback((index: number, field: keyof ExamItem, value: any) => {
    // Log only in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📝 updateQuestion called:`, {
        index,
        field,
        value: field === 'question_text' ? value.substring(0, 100) + '...' : value,
      });
    }
    questionOperations.updateQuestion(index, field, value);
    // Trigger auto-save immediately when a question is updated
    triggerAutoSaveRef.current();
  }, [questionOperations]);

  const openCodeEditor = useCallback((questionIndex: number) => {
    const question = itemsRef.current[questionIndex];
    if (question && question.question_type === 'coding') {
      setCodeEditorModal({
        isOpen: true,
        questionIndex,
        files: question.starter_files || [{ name: 'index.html', content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Document</title>\n</head>\n<body>\n    \n</body>\n</html>\n' }]
      });
    }
  }, []);

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
      } else if ((isCmdOrCtrl && (e.key === 'Backspace' || e.key === 'Delete')) || (e.key === 'Backspace' && !isCmdOrCtrl)) {
        // Delete selected questions (Cmd/Ctrl + Backspace/Delete, or just Backspace when not editing)
        e.preventDefault();
        if (selectedQuestions.size > 0) {
          const selectedIndices = items
            .map((item, index) => selectedQuestions.has(item.question_id) ? index : -1)
            .filter(index => index !== -1)
            .sort((a, b) => b - a); // Sort descending to delete from end first
          selectedIndices.forEach(index => questionOperations.removeQuestion(index));
          setSelectedQuestions(new Set());
          setHighlightedCard(null);
          toast.success(`Deleted ${selectedIndices.length} question${selectedIndices.length > 1 ? 's' : ''}`);
        } else if (highlightedCard) {
          const index = items.findIndex(item => item.question_id === highlightedCard);
          if (index !== -1) {
            questionOperations.removeQuestion(index);
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
        isPublished={isPublished}
        saving={saving || publishSaving}
        onSave={() => saveExam(false)}
        onPublish={handlePublishClick}
        onPreview={() => router.push(`/exam/${examId}/preview`)}
        canPublish={!!(examName && items.length > 0)}
        lastSaved={lastSaved}
      />

      {/* Questions Sidebar */}
      <QuestionSidebar
        items={items}
        activeTab={activeTab}
        activeQuestionId={activeQuestionId}
        highlightedCard={highlightedCard}
        questionTypes={questionTypes}
        onQuestionClick={handleSidebarQuestionClick}
        onReorder={questionOperations.reorderQuestions}
        getQuestionTitle={getQuestionTitle}
        onUpdateQuestion={updateQuestion}
        onAddOption={questionOperations.addOption}
        onRemoveQuestion={questionOperations.removeQuestion}
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
          <TabsTrigger value="details" className="flex items-center gap-2"><BookOpenIcon className="w-4 h-4" /> Exam Details</TabsTrigger>
          <div className="flex items-center h-5 m-2"><Separator orientation="vertical"/></div>
          <TabsTrigger value="questions" className="flex items-center gap-2">
            <ListTodoIcon className="w-4 h-4" />
            <span className="flex items-center gap-2 flex-1">
              Questions ({items.length})
            </span>
          </TabsTrigger>
          <div className="flex items-center h-5 m-2"><Separator orientation="vertical"/></div>
          <TabsTrigger value="settings" className="flex items-center gap-2"><SettingsIcon className="w-4 h-4" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContents className="mt-4 overflow-x-hidden">
          <TabsContent value="details" className="container mx-auto px-12 max-w-6xl overflow-y-auto flex-1">
            <ExamDetailsTab
              examName={examName}
              examDescription={examDescription}
              startDate={startDate}
              endDate={endDate}
              onExamNameChange={setExamName}
              onDescriptionChange={setExamDescription}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          </TabsContent>

          <TabsContent value="questions" className="w-full px-12 flex-1">
            <QuestionsTab
              items={items}
              onUpdateQuestion={updateQuestion}
              onAddOption={questionOperations.addOption}
              onUpdateOption={questionOperations.updateOption}
              onRemoveOption={questionOperations.removeOption}
              onRemoveQuestion={questionOperations.removeQuestion}
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
              onReorderQuestions={questionOperations.reorderQuestions}
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
              onDurationChange={setDurationMinutes}
              onAttemptsChange={setAttemptsAllowed}
              onPassingScoreChange={setPassingScore}
              onShuffleChange={setShuffleItems}
              onShowResultsChange={setShowResultsImmediately}
              onPublicChange={setIsPublic}
              onConsoleDetectionChange={setConsoleDetection}
              onTranslationDetectionChange={setTranslationDetection}
              onAllowWordByWordTranslationChange={setAllowWordByWordTranslation}
              onAllowWordByWordDefinitionChange={setAllowWordByWordDefinition}
              onVisibilityChangeDetectionChange={setVisibilityChangeDetection}
              onLocationDetectionChange={setLocationDetection}
              location={location}
              onLocationChange={setLocation}
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