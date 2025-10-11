'use client';

import { useState, useEffect, use, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import FloatingFormatDock from '@/components/editors/floating-format-dock';
import { Tabs, TabsList, TabsTrigger, TabsContents, TabsContent } from '@/components/ui/shadcn-io/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import ExamHeader from '@/components/exam/ExamHeader';
import ExamDetailsTab from '@/components/exam/ExamDetailsTab';
import QuestionsTab from '@/components/exam/QuestionsTab';
import ExamSettingsTab from '@/components/exam/ExamSettingsTab';
import { ExamItem } from '@/types/exam';
import { PageParams } from '@/app/layout';
import { ScrollPosition } from '../layout';

export default function EditExamPage({ params }: { params: Promise<PageParams> }) {
  const router = useRouter();
  const { examId } = use(params);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('details');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasUnsavedChangesRef = useRef<boolean>(false);

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
  const [lastScrollPosition, setLastScrollPosition] = useState<ScrollPosition>({
    details: 0,
    questions: 0,
    settings: 0
  });


  // Items (questions)
  const [items, setItems] = useState<ExamItem[]>([]);

  useEffect(() => {
    fetchExam();
  }, [examId]);

  const fetchExam = async () => {
    try {
      const response = await fetch(`/api/exams/get?examId=${examId}`);
      const result = await response.json();
      
      if (result.success) {
        const examData = result.data;
        
        console.log('📥 Loaded exam data with items:', (examData.items || []).map((item:any, idx:number) => ({
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
    setItems([...items, newQuestion]);
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
    setItems([...items, pageBreak]);
    setActiveTab('questions');
  };

  const updateQuestion = (index: number, field: keyof ExamItem, value: any) => {
    console.log(`📝 updateQuestion called:`, {
      index,
      field,
      value: field === 'question_text' ? value.substring(0, 100) + '...' : value,
      currentValue: items[index]?.[field]
    });
    
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setItems(updatedItems);
  };

  const addOption = (questionIndex: number) => {
    const updatedItems = [...items];
    if (updatedItems[questionIndex]?.options) {
      updatedItems[questionIndex].options!.push('');
      setItems(updatedItems);
    }
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updatedItems = [...items];
    if (updatedItems[questionIndex]?.options) {
      updatedItems[questionIndex].options![optionIndex] = value;
      setItems(updatedItems);
    }
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updatedItems = [...items];
    if (updatedItems[questionIndex]?.options) {
      updatedItems[questionIndex].options!.splice(optionIndex, 1);
      // Adjust correct answer if needed
      const correctAnswer = updatedItems[questionIndex].correct_answer;
      if (typeof correctAnswer === 'number' && correctAnswer >= optionIndex && correctAnswer > 0) {
        updatedItems[questionIndex].correct_answer = correctAnswer - 1;
      }
      setItems(updatedItems);
    }
  };

  const removeQuestion = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    setItems(updatedItems);
  };

  const reorderQuestions = (newItems: ExamItem[]) => {
    setItems(newItems);
  };

  const calculateTotalPoints = () => {
    return items.reduce((sum, item) => sum + (item.points || 0), 0);
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
          status: publish ? 'published' : 'draft'
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
    
    // Set new timer for 3 seconds
    autoSaveTimerRef.current = setTimeout(() => {
      if (hasUnsavedChangesRef.current && examName) {
        saveExam(false, true);
      }
    }, 3000);
  }, [examName, examDescription, durationMinutes, attemptsAllowed, passingScore, 
      shuffleItems, showResultsImmediately, isPublic, startDate, endDate, items]);

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
      shuffleItems, showResultsImmediately, isPublic, startDate, endDate, items, triggerAutoSave, loading]);

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
      <div className="w-full py-8 flex-1 flex flex-col">
      <ExamHeader
        examId={examId}
        isPublished={isPublished}
        saving={saving}
        onSave={() => saveExam(false)}
        onPublish={() => saveExam(true)}
        onPreview={() => router.push(`/exam/${examId}/preview`)}
        canPublish={!!(examName && items.length > 0)}
        lastSaved={lastSaved}
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
        <TabsList className="ml-8 sticky top-8 z-10">
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

          <TabsContent value="questions" className="container mx-auto px-12 max-w-6xl overflow-y-auto flex-1 space-y-4">
            <QuestionsTab
              items={items}
              onUpdateQuestion={updateQuestion}
              onAddOption={addOption}
              onUpdateOption={updateOption}
              onRemoveOption={removeOption}
              onRemoveQuestion={removeQuestion}
              onAddNewQuestion={addNewQuestion}
              onAddPageBreak={addPageBreak}
              onReorderQuestions={reorderQuestions}
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
              onDurationChange={setDurationMinutes}
              onAttemptsChange={setAttemptsAllowed}
              onPassingScoreChange={setPassingScore}
              onShuffleChange={setShuffleItems}
              onShowResultsChange={setShowResultsImmediately}
              onPublicChange={setIsPublic}
              onDeleteExam={deleteExam}
            />
          </TabsContent>
        </TabsContents>
      </Tabs>
    </div>
    </>
  );
}