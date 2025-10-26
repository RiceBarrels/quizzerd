'use client';

import { useState, useEffect, use, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import FloatingFormatDock from '@/components/editors/floating-format-dock';
import { Tabs, TabsList, TabsTrigger, TabsContents, TabsContent } from '@/components/ui/shadcn-io/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, X, FileText, ListTodoIcon, ListChecksIcon, TextAlignStartIcon, NotepadTextIcon, CircleSlashIcon, ChevronDown, SlidersHorizontal, Calendar, Clock, Upload, Star, Code, Heading, Minus, GripVertical, Globe, Lock, Key, CheckIcon, Users, Copy, Link2, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { QuestionTypeOption } from '@/types/exam';
import CodeEditor from '@/components/editors/CodeEditor';
import ExamHeader from '@/components/exam/ExamHeader';
import ExamDetailsTab from '@/components/exam/ExamDetailsTab';
import QuestionsTab from '@/components/exam/QuestionsTab';
import ExamSettingsTab from '@/components/exam/ExamSettingsTab';
import { ExamItem } from '@/types/exam';
import { PageParams } from '@/app/layout';
import { ScrollPosition } from '../layout';
import { AnimatePresence, motion } from 'motion/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function EditExamPage({ params }: { params: Promise<PageParams> }) {
  const router = useRouter();
  const { examId } = use(params);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('details');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasUnsavedChangesRef = useRef<boolean>(false);
  
  // Publish dialog states
  const [publishDialogOpen, setPublishDialogOpen] = useState<boolean>(false);
  const [publishType, setPublishType] = useState<'public' | 'classes' | 'code'>('public');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(false);
  const [hasInitializedPublishDialog, setHasInitializedPublishDialog] = useState<boolean>(false);
  const [classesWithExistingAssignments, setClassesWithExistingAssignments] = useState<string[]>([]);

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
  const [lastScrollPosition, setLastScrollPosition] = useState<ScrollPosition>({
    details: 0,
    questions: 0,
    settings: 0
  });

  // Sidebar state
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const scrollToQuestionRef = useRef<((questionId: string, isManualClick?: boolean) => void) | null>(null);
  const [sidebarPosition, setSidebarPosition] = useState({ top: 64, maxHeight: 'calc(100vh - 312px)' });
  const sidebarScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sidebarQuestionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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

  // Question types for sidebar
  const questionTypes: QuestionTypeOption[] = [
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
  ];

  // Sensors for drag and drop in sidebar
  const sidebarSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchExam();
    fetchClasses();
  }, [examId]);
  
  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const response = await fetch('/api/classes/get');
      const result = await response.json();
      
      if (result.success) {
        setClasses(result.data || []);
        
        // Also check which classes already have this exam assigned
        await checkExistingAssignments(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };
  
  const checkExistingAssignments = async (classList: any[]) => {
    if (!examId || classList.length === 0) return;
    
    try {
      // Fetch all assignments for this exam
      const response = await fetch(`/api/classes/assignments/check?examId=${examId}`);
      const result = await response.json();
      
      if (result.success) {
        setClassesWithExistingAssignments(result.classIds || []);
        console.log('Classes with existing assignments:', result.classIds);
      }
    } catch (error) {
      console.error('Error checking existing assignments:', error);
    }
  };

  const fetchExam = async () => {
    try {
      const response = await fetch(`/api/exams/get?examId=${examId}`);
      const result = await response.json();
      
      if (result.success) {
        const examData = result.data;
        
        console.log('Loaded exam data with items:', (examData.items || []).map((item:any, idx:number) => ({
          index: idx,
          question_id: item.question_id,
          question_text: item.question_text ? item.question_text.substring(0, 50) + '...' : 'EMPTY',
          question_type: item.question_type
        })));
        
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
        
        // Load selected classes
        setSelectedClassIds(examData.class_id || []);
        
        // Initialize publish type based on loaded exam data
        if (examData.is_public) {
          setPublishType('public');
        } else if (examData.class_id && examData.class_id.length > 0) {
          setPublishType('classes');
        } else if (examData.is_published) {
          setPublishType('code');
        }
        setHasInitializedPublishDialog(true);
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
  };

  const addNewQuestion = () => {
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
  };

  const addPageBreak = () => {
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
  };

  const updateQuestion = (index: number, field: keyof ExamItem, value: any) => {
    setItems(prevItems => {
      console.log(`📝 updateQuestion called:`, {
        index,
        field,
        value: field === 'question_text' ? value.substring(0, 100) + '...' : value,
        currentValue: prevItems[index]?.[field]
      });
      
      const updatedItems = [...prevItems];
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value
      };
      return updatedItems;
    });
  };

  const addOption = (questionIndex: number) => {
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      if (updatedItems[questionIndex]?.options) {
        updatedItems[questionIndex].options!.push('');
      }
      return updatedItems;
    });
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      if (updatedItems[questionIndex]?.options) {
        updatedItems[questionIndex].options![optionIndex] = value;
      }
      return updatedItems;
    });
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      if (updatedItems[questionIndex]?.options) {
        updatedItems[questionIndex].options!.splice(optionIndex, 1);
        // Adjust correct answer if needed
        const correctAnswer = updatedItems[questionIndex].correct_answer;
        if (typeof correctAnswer === 'number' && correctAnswer >= optionIndex && correctAnswer > 0) {
          updatedItems[questionIndex].correct_answer = correctAnswer - 1;
        }
      }
      return updatedItems;
    });
  };

  const removeQuestion = (index: number) => {
    setItems(prevItems => prevItems.filter((_, i) => i !== index));
  };

  const duplicateQuestion = (index: number) => {
    setItems(prevItems => {
      const questionToDuplicate = prevItems[index];
      if (!questionToDuplicate) return prevItems;
      
      // Create a deep copy of the question with a new ID
      const duplicatedQuestion: ExamItem = {
        ...questionToDuplicate,
        question_id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        options: questionToDuplicate.options ? [...questionToDuplicate.options] : undefined,
        correct_answer: Array.isArray(questionToDuplicate.correct_answer) 
          ? ([...questionToDuplicate.correct_answer] as number[] | string[])
          : questionToDuplicate.correct_answer,
        starter_files: questionToDuplicate.starter_files 
          ? questionToDuplicate.starter_files.map(f => ({ ...f }))
          : undefined,
      };
      
      // Insert the duplicated question right after the original
      const updatedItems = [...prevItems];
      updatedItems.splice(index + 1, 0, duplicatedQuestion);
      
      toast.success('Question duplicated successfully');
      return updatedItems;
    });
  };

  const copyQuestion = (index: number) => {
    const questionToCopy = items[index];
    if (!questionToCopy) return;
    
    // Copy question data to clipboard with a marker
    const questionData = {
      __quizzerd_question__: true,
      ...questionToCopy,
      question_id: undefined, // Will be regenerated when pasted
    };
    
    navigator.clipboard.writeText(JSON.stringify(questionData, null, 2))
      .then(() => {
        toast.success('Question copied to clipboard');
      })
      .catch(() => {
        toast.error('Failed to copy question');
      });
  };

  const pasteQuestion = async (afterIndex: number) => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      const parsedData = JSON.parse(clipboardText);
      
      // Check if it's a valid question
      if (!parsedData.__quizzerd_question__ && !parsedData.question_type) {
        toast.error('Clipboard does not contain a valid question');
        return;
      }
      
      // Remove the marker and create the question
      const { __quizzerd_question__, question_id, ...questionData } = parsedData;
      const newQuestion: ExamItem = {
        ...questionData,
        question_id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        question_type: questionData.question_type || 'short_answer',
        question_text: questionData.question_text || '',
        points: questionData.points || 1,
        required: questionData.required ?? true,
      };
      
      // Insert the pasted question after the specified index
      setItems(prevItems => {
        const updatedItems = [...prevItems];
        updatedItems.splice(afterIndex + 1, 0, newQuestion);
        return updatedItems;
      });
      
      toast.success('Question pasted successfully');
    } catch (error) {
      toast.error('Failed to paste question - invalid format');
      console.error('Paste error:', error);
    }
  };

  const cutQuestion = (index: number) => {
    const questionToCut = items[index];
    if (!questionToCut) return;
    
    // Copy question data to clipboard with a marker
    const questionData = {
      __quizzerd_question__: true,
      ...questionToCut,
      question_id: undefined,
    };
    
    navigator.clipboard.writeText(JSON.stringify(questionData, null, 2))
      .then(() => {
        // Remove the question after copying
        setItems(prevItems => prevItems.filter((_, i) => i !== index));
        toast.success('Question cut to clipboard');
      })
      .catch(() => {
        toast.error('Failed to cut question');
      });
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    
    setItems(prevItems => {
      const newItems = [...prevItems];
      const temp = newItems[index];
      newItems[index] = newItems[index - 1];
      newItems[index - 1] = temp;
      return newItems;
    });
    
    toast.success('Question moved up');
  };

  const moveDown = (index: number) => {
    if (index >= items.length - 1) return;
    
    setItems(prevItems => {
      const newItems = [...prevItems];
      const temp = newItems[index];
      newItems[index] = newItems[index + 1];
      newItems[index + 1] = temp;
      return newItems;
    });
    
    toast.success('Question moved down');
  };

  const insertAbove = (index: number) => {
    const newQuestion: ExamItem = {
      question_id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      question_text: '',
      question_type: 'short_answer',
      points: 1,
      required: true,
    };
    
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems.splice(index, 0, newQuestion);
      return updatedItems;
    });
    
    toast.success('New question inserted above');
  };

  const insertBelow = (index: number) => {
    const newQuestion: ExamItem = {
      question_id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      question_text: '',
      question_type: 'short_answer',
      points: 1,
      required: true,
    };
    
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems.splice(index + 1, 0, newQuestion);
      return updatedItems;
    });
    
    toast.success('New question inserted below');
  };

  const resetQuestion = (index: number) => {
    const question = items[index];
    if (!question) return;
    
    const resetQuestion: ExamItem = {
      ...question,
      question_text: '',
      options: question.options ? question.options.map(() => '') : undefined,
      correct_answer: undefined,
      explanation: '',
    };
    
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems[index] = resetQuestion;
      return updatedItems;
    });
    
    toast.success('Question reset to empty state');
  };

  const shuffleOptions = (index: number) => {
    const question = items[index];
    if (!question || !question.options) return;
    
    // Fisher-Yates shuffle algorithm
    const shuffled = [...question.options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems[index] = {
        ...updatedItems[index],
        options: shuffled,
      };
      return updatedItems;
    });
    
    toast.success('Options shuffled');
  };

  const clearOptions = (index: number) => {
    const question = items[index];
    if (!question || !question.options) return;
    
    setItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems[index] = {
        ...updatedItems[index],
        options: ['', ''],
        correct_answer: undefined,
      };
      return updatedItems;
    });
    
    toast.success('All options cleared');
  };

  const exportQuestion = (index: number) => {
    const question = items[index];
    if (!question) return;
    
    const exportData = {
      ...question,
      exported_at: new Date().toISOString(),
      app: 'QuizZered'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `question-${question.question_id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Question exported as JSON');
  };

  const reorderQuestions = (newItems: ExamItem[]) => {
    setItems(newItems);
  };

  const openCodeEditor = (questionIndex: number) => {
    const question = items[questionIndex];
    if (question && question.question_type === 'coding') {
      setCodeEditorModal({
        isOpen: true,
        questionIndex,
        files: question.starter_files || [{ name: 'index.js', content: '// Write your code here' }]
      });
    }
  };

  const closeCodeEditor = () => {
    setCodeEditorModal({
      isOpen: false,
      questionIndex: null,
      files: []
    });
  };

  const handleCodeEditorChange = (files: { name: string; content: string }[]) => {
    if (codeEditorModal.questionIndex !== null) {
      updateQuestion(codeEditorModal.questionIndex, 'starter_files', files);
      // Also update the modal state so the CodeEditor's files prop reflects the changes
      setCodeEditorModal(prev => ({
        ...prev,
        files: files
      }));
    }
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && codeEditorModal.isOpen) {
        closeCodeEditor();
      }
    };

    if (codeEditorModal.isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [codeEditorModal.isOpen]);

  const calculateTotalPoints = () => {
    return items.reduce((sum, item) => sum + (item.points || 0), 0);
  };

  // Sidebar helper functions
  const getQuestionTitle = (item: ExamItem): string => {
    if (item.question_type === 'section_header') return 'Section Header';
    if (item.question_type === 'page_break') return 'Page Break';
    
    // Strip HTML tags and get first 50 characters
    const text = item.question_text?.replace(/<[^>]*>/g, '') || 'Untitled Question';
    return text.length > 50 ? text.substring(0, 50) + '...' : text;
  };

  // Group questions by pages (separated by page breaks)
  const groupQuestionsByPages = () => {
    const pages: ExamItem[][] = [];
    let currentPage: ExamItem[] = [];

    items.forEach((item) => {
      if (item.question_type === 'page_break') {
        if (currentPage.length > 0) {
          pages.push(currentPage);
          currentPage = [];
        }
      } else {
        currentPage.push(item);
      }
    });

    // Add the last page if it has items
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    // If no pages, create one default page with all items
    if (pages.length === 0 && items.length > 0) {
      pages.push(items.filter(item => item.question_type !== 'page_break'));
    }

    return pages;
  };

  const handleSidebarQuestionClick = (questionId: string) => {
    console.log('🖱️  Sidebar question clicked:', questionId);
    setActiveQuestionId(questionId);
    if (scrollToQuestionRef.current) {
      console.log('📞 Calling scrollToQuestionRef with isManualClick=true');
      scrollToQuestionRef.current(questionId, true); // true indicates manual click
    } else {
      console.log('⚠️  scrollToQuestionRef.current is null');
    }
  };

  const handleSidebarDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = items.findIndex((item) => item.question_id === active.id);
      const newIndex = items.findIndex((item) => item.question_id === over!.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        reorderQuestions(reorderedItems);
      }
    }
  };

  // Helper function to get the page index for a given question
  const getPageIndexForQuestion = (questionId: string) => {
    const pages = groupQuestionsByPages();
    return pages.findIndex(page => 
      page.some(item => item.question_id === questionId)
    );
  };

  const deleteExam = async () => {
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
  };

  const handlePublishClick = () => {
    // Only set initial publish type on first open, then it remembers user selection
    if (!hasInitializedPublishDialog) {
      if (isPublic) {
        setPublishType('public');
      } else if (selectedClassIds.length > 0) {
        setPublishType('classes');
      } else if (isPublished) {
        setPublishType('code');
      } else {
        // Default for new publish
        setPublishType('public');
      }
      setHasInitializedPublishDialog(true);
    }
    
    // Open publish dialog
    setPublishDialogOpen(true);
  };
  
  const handlePublishConfirm = async () => {
    setSaving(true);
    setPublishDialogOpen(false);
    
    try {
      // Prepare publish data based on publish type
      let publishData: any = {
        exam_id: examId,
        exam_name: examName,
        exam_description: examDescription,
        duration_minutes: durationMinutes,
        attempts_allowed: attemptsAllowed,
        passing_score: passingScore,
        shuffle_items: shuffleItems,
        show_results_immediately: showResultsImmediately,
        start_date: startDate || null,
        end_date: endDate || null,
        items: items,
        total_points: calculateTotalPoints(),
        status: 'published',
        is_published: true,
        console_detection: consoleDetection,
        translation_detection: translationDetection,
        allow_word_by_word_translation: allowWordByWordTranslation,
        allow_word_by_word_definition: allowWordByWordDefinition,
        visibility_change_detection: visibilityChangeDetection,
        location_detection: locationDetection
      };
      
      if (publishType === 'public') {
        publishData.is_public = true;
        publishData.class_id = selectedClassIds; // Keep selected classes even in public mode
      } else if (publishType === 'classes') {
        publishData.is_public = false;
        publishData.class_id = selectedClassIds;
      } else if (publishType === 'code') {
        publishData.is_public = false;
        publishData.class_id = [];
      }
      
      // Update the exam with publish settings
      const updateResponse = await fetch(`/api/exams/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(publishData),
      });
      
      const updateResult = await updateResponse.json();
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to publish exam');
      }
      
      // Handle class assignments for both public and private modes
      if (selectedClassIds.length > 0 || classesWithExistingAssignments.length > 0) {
        // Determine which classes to add and which to remove
        const classesToAdd = selectedClassIds.filter(
          id => !classesWithExistingAssignments.includes(id)
        );
        const classesToRemove = classesWithExistingAssignments.filter(
          id => !selectedClassIds.includes(id)
        );
        
        console.log('Assignment changes:', {
          selected: selectedClassIds,
          existing: classesWithExistingAssignments,
          toAdd: classesToAdd,
          toRemove: classesToRemove
        });
        
        // Remove assignments from unchecked classes
        if (classesToRemove.length > 0) {
          console.log('Removing assignments from classes:', classesToRemove);
          
          const deleteResponse = await fetch(
            `/api/classes/assignments/delete?examId=${examId}&classIds=${classesToRemove.join(',')}`,
            { method: 'DELETE' }
          );
          
          const deleteResult = await deleteResponse.json();
          
          if (deleteResult.success) {
            console.log('Successfully removed assignments:', deleteResult);
          } else {
            console.error('Failed to remove assignments:', deleteResult.error);
          }
        }
        
        // Create new assignments for newly selected classes
        if (classesToAdd.length > 0) {
          console.log('Creating assignments for classes:', classesToAdd);
        
        const assignmentPayload = {
          exam_id: examId,
            class_ids: classesToAdd,
          name: examName,
          description: examDescription,
          publish_at: new Date().toISOString(),
          due_at: endDate || null,
        };
        
        const assignmentResponse = await fetch('/api/classes/assignments/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(assignmentPayload),
        });
        
        const assignmentResult = await assignmentResponse.json();
        
          if (assignmentResult.success) {
            console.log('Successfully created assignments:', assignmentResult.data);
          } else {
            console.error('Failed to create class assignments:', assignmentResult.error);
            if (!assignmentResult.error.includes('already published')) {
              toast.error('Exam published but failed to create some class assignments');
            }
          }
        }
        
        // Update the list of classes with existing assignments
        await checkExistingAssignments(classes);
        
        // Show appropriate success message
        if (classesToAdd.length > 0 || classesToRemove.length > 0) {
          const messages = [];
          if (classesToAdd.length > 0) {
            messages.push(`assigned to ${classesToAdd.length} class(es)`);
          }
          if (classesToRemove.length > 0) {
            messages.push(`removed from ${classesToRemove.length} class(es)`);
          }
          toast.success(`Exam ${messages.join(' and ')}!`, { duration: 5000 });
        }
      }
      
      setIsPublished(true);
      if (publishType === 'public') {
        setIsPublic(true);
      }
      
      if (selectedClassIds.length === 0 && classesWithExistingAssignments.length === 0) {
      toast.success('Exam published successfully!');
      }
    } catch (error) {
      console.error('Error publishing exam:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to publish exam');
    } finally {
      setSaving(false);
    }
  };

  const saveExam = async (publish: boolean = false, isAutoSave: boolean = false) => {
    if (!isAutoSave) {
      setSaving(true);
    }
    
    console.log('💾 Saving exam with items:', items.map((item, idx) => ({
      index: idx,
      question_id: item.question_id,
      question_text: item.question_text ? item.question_text.substring(0, 50) + '...' : 'EMPTY',
      question_type: item.question_type
    })));
    
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
          total_points: calculateTotalPoints(),
          status: publish ? 'published' : 'draft',
          // Cheating detection settings
          console_detection: consoleDetection,
          translation_detection: translationDetection,
          allow_word_by_word_translation: allowWordByWordTranslation,
          allow_word_by_word_definition: allowWordByWordDefinition,
          visibility_change_detection: visibilityChangeDetection,
          location_detection: locationDetection
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
  };

  // Auto-save function
  const triggerAutoSave = useCallback(() => {
    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // Mark as having unsaved changes
    hasUnsavedChangesRef.current = true;
    
    // Set new timer for 1 second
    autoSaveTimerRef.current = setTimeout(() => {
      if (hasUnsavedChangesRef.current && examName) {
        saveExam(false, true);
      }
    }, 1000);
  }, [examName, examDescription, durationMinutes, attemptsAllowed, passingScore, 
      shuffleItems, showResultsImmediately, isPublic, startDate, endDate, items,
      consoleDetection, translationDetection, allowWordByWordTranslation, 
      allowWordByWordDefinition, visibilityChangeDetection, locationDetection]);

  // Watch for changes and trigger auto-save
  useEffect(() => {
    if (!loading) {
      triggerAutoSave();
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [examName, examDescription, durationMinutes, attemptsAllowed, passingScore,
      shuffleItems, showResultsImmediately, isPublic, startDate, endDate, items,
      consoleDetection, translationDetection, allowWordByWordTranslation,
      allowWordByWordDefinition, visibilityChangeDetection, locationDetection,
      triggerAutoSave, loading]);

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

  // Calculate sidebar position based on tabs-list position
  useEffect(() => {
    if (activeTab !== 'questions') return;

    const updateSidebarPosition = () => {
      const tabsList = document.getElementById('tabs-list');
      if (tabsList) {
        const rect = tabsList.getBoundingClientRect();
        const topPosition = rect.bottom + 16; // 16px spacing below tabs
        const maxHeight = `calc(100vh - ${topPosition + 48}px)`; // 48px bottom padding
        
        setSidebarPosition({
          top: topPosition,
          maxHeight: maxHeight
        });
      }
    };

    // Initial calculation
    updateSidebarPosition();

    // Recalculate on scroll and resize
    window.addEventListener('scroll', updateSidebarPosition, true);
    window.addEventListener('resize', updateSidebarPosition);

    return () => {
      window.removeEventListener('scroll', updateSidebarPosition, true);
      window.removeEventListener('resize', updateSidebarPosition);
    };
  }, [activeTab, items.length]);

  // Auto-scroll sidebar to keep active question visible
  useEffect(() => {
    if (!activeQuestionId || activeTab !== 'questions') return;

    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      const sidebarButton = sidebarQuestionRefs.current[activeQuestionId];
      const sidebarContainer = sidebarScrollContainerRef.current;

      if (sidebarButton && sidebarContainer) {
        // Center the active question in the sidebar
        const buttonOffset = sidebarButton.offsetTop;
        const containerHeight = sidebarContainer.clientHeight;
        const buttonHeight = sidebarButton.clientHeight;
        
        // Calculate scroll position to center the button
        const scrollTarget = buttonOffset - (containerHeight / 2) + (buttonHeight / 2);

        // Ensure we don't scroll beyond bounds
        const maxScroll = sidebarContainer.scrollHeight - containerHeight;
        const clampedScroll = Math.max(0, Math.min(scrollTarget, maxScroll));

        sidebarContainer.scrollTo({
          top: clampedScroll,
          behavior: 'smooth'
        });
      }
    });
  }, [activeQuestionId, activeTab]);

  // Sortable Sidebar Button Component
  const SortableSidebarButton = ({ item, questionNumber }: { item: ExamItem; questionNumber: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: item.question_id,
    });

    const style: React.CSSProperties = {
      transform: transform
        ? CSS.Transform.toString({
            ...transform,
            scaleX: 1,
            scaleY: 1,
          })
        : undefined,
      transition,
      opacity: isDragging ? 0.5 : 1,
      pointerEvents: isDragging ? 'none' : 'auto', // Disable pointer events during drag
    };

    const questionTypeInfo = questionTypes.find(qt => qt.value === item.question_type);
    const QuestionIcon = questionTypeInfo?.icon;

    // Special rendering for page breaks
    if (item.question_type === 'page_break') {
      return (
        <div
          ref={setNodeRef}
          style={style}
          className="flex items-center gap-1 my-2"
        >
          <div
            {...attributes}
            {...listeners}
            className={`flex-shrink-0 p-1 rounded hover:bg-accent/50 ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </div>
          <div
            onClick={() => handleSidebarQuestionClick(item.question_id)}
            className={`flex-1 flex items-center gap-2 px-2.5 py-2 rounded-md border-2 border-dashed transition-all cursor-pointer hover:bg-accent/70 min-w-0 ${
              activeQuestionId === item.question_id
                ? 'bg-accent border-primary shadow-sm'
                : 'border-muted-foreground/30 hover:border-border'
            }`}
          >
            <Minus className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground truncate overflow-hidden text-ellipsis whitespace-nowrap">Page Break</span>
          </div>
        </div>
      );
    }

    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex items-center gap-1"
      >
        <div
          {...attributes}
          {...listeners}
          className={`flex-shrink-0 p-1 rounded hover:bg-accent/50 ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
        <button
          onClick={() => handleSidebarQuestionClick(item.question_id)}
          className={`flex-1 text-left px-2.5 py-2 rounded-md border transition-all hover:bg-accent/70 min-w-0 ${
            activeQuestionId === item.question_id
              ? 'bg-accent border-primary shadow-sm'
              : 'border-transparent hover:border-border'
          }`}
        >
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-1.5 mb-0.5">
                {QuestionIcon && <QuestionIcon className="h-3 w-3 flex-shrink-0 text-muted-foreground" />}
                <div className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {item.question_type === 'section_header' ? 'Section' : `Q${questionNumber}`}
                </div>
              </div>
              <div className="text-xs font-medium truncate leading-relaxed overflow-hidden text-ellipsis whitespace-nowrap">
                {getQuestionTitle(item)}
              </div>
            </div>
            {item.question_type !== 'section_header' && (
              <div className="text-xs font-semibold text-primary mt-0.5 flex-shrink-0">
                {item.points}
              </div>
            )}
          </div>
        </button>
      </div>
    );
  };

  const groupedPages = groupQuestionsByPages();
  const sortableQuestionIds = items.map(item => item.question_id); // Include all items including page breaks
  const hasSidebarQuestions = items.filter(item => item.question_type !== 'page_break').length > 0;

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
      {codeEditorModal.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/50">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold">
                Code Editor - Question {codeEditorModal.questionIndex !== null ? codeEditorModal.questionIndex + 1 : ''}
              </h2>
              <Badge variant="secondary">
                {codeEditorModal.files.length} file(s)
              </Badge>
              <Badge variant="outline" className="text-xs font-normal">
                Press ESC to close
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeCodeEditor}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Close Editor
            </Button>
          </div>
          
          {/* Modal Content */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto h-full">
              <CodeEditor
                key={`modal-code-editor-${codeEditorModal.questionIndex}`}
                files={codeEditorModal.files}
                onChange={handleCodeEditorChange}
                height="calc(100vh - 160px)"
              />
            </div>
          </div>
        </div>
      )}

      <div className="w-full py-8 flex-1 flex flex-col">
      <ExamHeader
        examId={examId}
        isPublished={isPublished}
        saving={saving}
        onSave={() => saveExam(false)}
        onPublish={handlePublishClick}
        onPreview={() => router.push(`/exam/${examId}/preview`)}
        canPublish={!!(examName && items.length > 0)}
        lastSaved={lastSaved}
      />

      {/* Questions Sidebar - Only visible on questions tab */}
      <AnimatePresence initial={false} mode="wait">
        {activeTab === 'questions' && (
          <motion.div
            key="questions-sidebar"
            className="w-72 z-50 fixed left-8" 
            style={{ top: `${sidebarPosition.top}px` }}
            initial={{ opacity: 0, x: "-32rem", filter: "blur(8px)" }} 
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }} 
            transition={{ duration: 0.3, type: "spring", visualDuration: 0.25, bounce: 0.3 }} 
            exit={{ opacity: 0, x: "-32rem", filter: "blur(8px)" }}
          >
            <DndContext
              sensors={sidebarSensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSidebarDragEnd}
            >
              <div 
                ref={sidebarScrollContainerRef}
                className="bg-card overflow-y-auto border rounded-lg p-4 shadow-lg scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40" 
                style={{ maxHeight: sidebarPosition.maxHeight }}
              >
                <h3 className="text-sm font-semibold mb-3">Questions Overview</h3>
                <div className="space-y-3">
                  {items.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-3 text-center">
                      No questions yet. Add your first question to get started.
                    </div>
                  ) : (
                    <SortableContext
                      items={sortableQuestionIds}
                      strategy={verticalListSortingStrategy}
                    >
                      {(() => {
                        let currentPageIndex = 0;
                        let currentPageItems: React.ReactElement[] = [];
                        const allPageGroups: React.ReactElement[] = [];

                        items.forEach((item, idx) => {
                          const questionNumber = items
                            .slice(0, idx + 1)
                            .filter(i => i.question_type !== 'section_header' && i.question_type !== 'page_break')
                            .length;

                          if (item.question_type === 'page_break') {
                            // Push current page if it has items
                            if (currentPageItems.length > 0) {
                              const pagePoints = items
                                .slice(currentPageIndex === 0 ? 0 : items.findIndex((it, i) => i < idx && items[i - 1]?.question_type === 'page_break') + 1, idx)
                                .filter(it => it.question_type !== 'page_break')
                                .reduce((sum, it) => sum + (it.question_type !== 'section_header' ? (it.points || 0) : 0), 0);

                              allPageGroups.push(
                                <div key={`page-group-${currentPageIndex}`} className="space-y-1.5">
                                  {currentPageIndex > 0 && <div className="border-t my-2" />}
                                  <div className="flex items-center justify-between px-2 py-1.5 rounded-md transition-all duration-200 border bg-muted/70 border-transparent">
                                    <div className="flex items-center gap-1.5">
                                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                      <span className="text-xs font-semibold text-foreground">
                                        Page {currentPageIndex + 1}
                                      </span>
                                    </div>
                                    <span className="text-xs font-medium text-primary">
                                      {pagePoints} pts
                                    </span>
                                  </div>
                                  <div className="space-y-0.5 pl-1">
                                    {currentPageItems}
                                  </div>
                                </div>
                              );
                              currentPageItems = [];
                              currentPageIndex++;
                            }

                            // Add the page break itself as a draggable item
                            allPageGroups.push(
                              <div
                                key={item.question_id}
                                ref={(el) => {
                                  sidebarQuestionRefs.current[item.question_id] = el;
                                }}
                              >
                                <SortableSidebarButton
                                  item={item}
                                  questionNumber={questionNumber}
                                />
                              </div>
                            );
                          } else {
                            // Regular question or section header
                            currentPageItems.push(
                              <div
                                key={item.question_id}
                                ref={(el) => {
                                  sidebarQuestionRefs.current[item.question_id] = el;
                                }}
                              >
                                <SortableSidebarButton
                                  item={item}
                                  questionNumber={questionNumber}
                                />
                              </div>
                            );
                          }
                        });

                        // Push the last page if it has items
                        if (currentPageItems.length > 0) {
                          const lastPageStartIdx = items.findLastIndex(it => it.question_type === 'page_break') + 1;
                          const pagePoints = items
                            .slice(lastPageStartIdx)
                            .filter(it => it.question_type !== 'page_break')
                            .reduce((sum, it) => sum + (it.question_type !== 'section_header' ? (it.points || 0) : 0), 0);

                          allPageGroups.push(
                            <div key={`page-group-${currentPageIndex}`} className="space-y-1.5">
                              {currentPageIndex > 0 && <div className="border-t my-2" />}
                              <div className="flex items-center justify-between px-2 py-1.5 rounded-md transition-all duration-200 border bg-muted/70 border-transparent">
                                <div className="flex items-center gap-1.5">
                                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="text-xs font-semibold text-foreground">
                                    Page {currentPageIndex + 1}
                                  </span>
                                </div>
                                <span className="text-xs font-medium text-primary">
                                  {pagePoints} pts
                                </span>
                              </div>
                              <div className="space-y-0.5 pl-1">
                                {currentPageItems}
                              </div>
                            </div>
                          );
                        }

                        return allPageGroups;
                      })()}
                    </SortableContext>
                  )}
                </div>
              </div>
            </DndContext>
          </motion.div>
        )}
      </AnimatePresence>

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
          <TabsTrigger value="details">Exam Details</TabsTrigger>
          <TabsTrigger value="questions">
            <span className="flex items-center gap-2 flex-1">
              Questions ({items.length})
              {items.length > 0 && (
                <Badge variant="secondary">
                  {calculateTotalPoints()} pts
                </Badge>
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
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
              onAddOption={addOption}
              onUpdateOption={updateOption}
              onRemoveOption={removeOption}
              onRemoveQuestion={removeQuestion}
              onDuplicateQuestion={duplicateQuestion}
              onCopyQuestion={copyQuestion}
              onCutQuestion={cutQuestion}
              onPasteQuestion={pasteQuestion}
              onMoveUp={moveUp}
              onMoveDown={moveDown}
              onInsertAbove={insertAbove}
              onInsertBelow={insertBelow}
              onResetQuestion={resetQuestion}
              onShuffleOptions={shuffleOptions}
              onClearOptions={clearOptions}
              onExportQuestion={exportQuestion}
              onAddNewQuestion={addNewQuestion}
              onAddPageBreak={addPageBreak}
              onReorderQuestions={reorderQuestions}
              onOpenCodeEditor={openCodeEditor}
              onScrollToQuestionRef={(scrollFn) => {
                scrollToQuestionRef.current = scrollFn;
              }}
              activeQuestionId={activeQuestionId}
              onActiveQuestionIdChange={setActiveQuestionId}
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
              onDeleteExam={deleteExam}
            />
          </TabsContent>
        </TabsContents>
      </Tabs>
      
      {/* Publish Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
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
                // Default to classes when switching to private tab
                setPublishType(selectedClassIds.length > 0 ? 'classes' : 'code');
              }
            }}
            className="flex-1 flex flex-col overflow-hidden"
          >
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
                              value={`${window.location.origin}/exam/${examId}/preview`}
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
                                checked={selectedClassIds.includes(cls.class_id)}
                                className="mt-1"
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedClassIds([...selectedClassIds, cls.class_id]);
                                  } else {
                                    setSelectedClassIds(selectedClassIds.filter(id => id !== cls.class_id));
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
                            value={`${window.location.origin}/exam/${examId}/preview`}
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
                                setSelectedClassIds([...selectedClassIds, cls.class_id]);
                              } else {
                                setSelectedClassIds(selectedClassIds.filter(id => id !== cls.class_id));
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
              onClick={() => {
                setPublishDialogOpen(false);
              }}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              size="lg"
              onClick={handlePublishConfirm}
              disabled={publishType === 'classes' && !publishType.includes('public') && selectedClassIds.length === 0}
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
                  {isPublished ? 'Update Assignments' : 'Publish Exam'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
}