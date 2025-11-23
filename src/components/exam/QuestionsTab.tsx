'use client';

import { Button } from '@/components/ui/button';
import { Plus, FilePlus } from 'lucide-react';
import QuestionCard from './QuestionCard';
import { ExamItem } from '@/types/exam';
import { useRef, useEffect, useCallback, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface QuestionsTabProps {
  items: ExamItem[];
  onUpdateQuestion: (index: number, field: keyof ExamItem, value: any) => void;
  onAddOption: (questionIndex: number) => void;
  onUpdateOption: (questionIndex: number, optionIndex: number, value: string) => void;
  onRemoveOption: (questionIndex: number, optionIndex: number) => void;
  onRemoveQuestion: (index: number) => void;
  onDuplicateQuestion?: (index: number) => void;
  onCopyQuestion?: (index: number | number[]) => void;
  onCutQuestion?: (index: number | number[]) => void;
  onPasteQuestion?: (afterIndex: number) => Promise<void>;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onInsertAbove?: (index: number) => void;
  onInsertBelow?: (index: number) => void;
  onResetQuestion?: (index: number) => void;
  onShuffleOptions?: (index: number) => void;
  onClearOptions?: (index: number) => void;
  onExportQuestion?: (index: number) => void;
  onAddNewQuestion: () => void;
  onAddPageBreak: () => void;
  onReorderQuestions?: (items: ExamItem[]) => void;
  onOpenCodeEditor?: (questionIndex: number) => void;
  onScrollToQuestionRef?: (scrollFn: (questionId: string, isManualClick?: boolean) => void) => void;
  activeQuestionId?: string | null;
  onActiveQuestionIdChange?: (id: string | null) => void;
  highlightedCard?: string | null;
  onHighlightedCardChange?: (id: string | null) => void;
  selectedQuestions?: Set<string>;
  onQuestionSelect?: (questionId: string, event: React.MouseEvent) => void;
}

export default function QuestionsTab({
  items,
  onUpdateQuestion,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
  onRemoveQuestion,
  onDuplicateQuestion,
  onCopyQuestion,
  onCutQuestion,
  onPasteQuestion,
  onMoveUp,
  onMoveDown,
  onInsertAbove,
  onInsertBelow,
  onResetQuestion,
  onShuffleOptions,
  onClearOptions,
  onExportQuestion,
  onAddNewQuestion,
  onAddPageBreak,
  onReorderQuestions,
  onOpenCodeEditor,
  onScrollToQuestionRef,
  activeQuestionId,
  onActiveQuestionIdChange,
  highlightedCard,
  onHighlightedCardChange,
  selectedQuestions = new Set(),
  onQuestionSelect
}: QuestionsTabProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const questionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const manualScrollRef = useRef(false);
  const manualScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const observerDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const scrollEndTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleDragEnd = useCallback((event: DragEndEvent): void => {
    const { active, over } = event;

    if (active.id !== over?.id && onReorderQuestions) {
      const oldIndex = items.findIndex((item) => item.question_id === active.id);
      const newIndex = items.findIndex((item) => item.question_id === over!.id);

      const reorderedItems = arrayMove(items, oldIndex, newIndex);
      onReorderQuestions(reorderedItems);
    }
  }, [items, onReorderQuestions]);

  // Function to find and highlight the most visible question
  const highlightMostVisibleQuestion = useCallback(() => {
    if (!onActiveQuestionIdChange || manualScrollRef.current) return;

    const viewportHeight = window.innerHeight;
    const viewportCenter = viewportHeight / 2;
    
    let closestQuestionId = '';
    let closestDistance = Infinity;

    Object.entries(questionRefs.current).forEach(([questionId, element]) => {
      if (element) {
        const rect = element.getBoundingClientRect();
        const elementCenter = rect.top + rect.height / 2;
        const distance = Math.abs(elementCenter - viewportCenter);

        // Check if element is in viewport
        if (rect.top < viewportHeight && rect.bottom > 0) {
          if (distance < closestDistance) {
            closestQuestionId = questionId;
            closestDistance = distance;
          }
        }
      }
    });

    if (closestQuestionId) {
      // Update even if it's the same to ensure consistency
      onActiveQuestionIdChange(closestQuestionId);
    }
  }, [onActiveQuestionIdChange]);

  const scrollToQuestion = useCallback((questionId: string, isManualClick?: boolean) => {
    console.log('📍 scrollToQuestion called:', { questionId, isManualClick });
    const element = questionRefs.current[questionId];
    if (element) {
      if (onActiveQuestionIdChange) {
        onActiveQuestionIdChange(questionId);
      }
      
      // If this is a manual click, pause the Intersection Observer temporarily
      if (isManualClick) {
        console.log('👆 Manual click detected - pausing auto-sync');
        manualScrollRef.current = true;
        
        // Clear any existing timeout
        if (manualScrollTimeoutRef.current) {
          console.log('🧹 Clearing existing manual scroll timeout:', manualScrollTimeoutRef.current);
          clearTimeout(manualScrollTimeoutRef.current);
        }
        
        // Clear scroll end timeout to prevent interference
        if (scrollEndTimeoutRef.current) {
          console.log('🧹 Clearing scroll end timeout:', scrollEndTimeoutRef.current);
          clearTimeout(scrollEndTimeoutRef.current);
        }
        
        // Resume automatic highlighting after a shorter delay (800ms should be enough for smooth scroll)
        console.log('⏱️  Setting 800ms timeout to resume auto-sync');
        const timeoutId = setTimeout(() => {
          console.log('🔄 After 800ms → Auto-sync resumes AND immediately syncs the sidebar');
          manualScrollRef.current = false;
          // Immediately trigger highlighting after resuming
          highlightMostVisibleQuestion();
        }, 800);
        manualScrollTimeoutRef.current = timeoutId;
        console.log('✅ Timeout created with ID:', timeoutId);
      }
      
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      console.log('❌ Element not found for questionId:', questionId);
    }
  }, [onActiveQuestionIdChange, highlightMostVisibleQuestion]);

  // Expose scroll function to parent via callback
  useEffect(() => {
    if (onScrollToQuestionRef) {
      onScrollToQuestionRef(scrollToQuestion);
    }
  }, [onScrollToQuestionRef, scrollToQuestion]);

  // Detect scroll end and highlight the most visible question
  useEffect(() => {
    if (!onActiveQuestionIdChange) return;

    const handleScroll = () => {
      // Clear existing timeout
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }

      // Wait for scroll to end (200ms after last scroll event)
      scrollEndTimeoutRef.current = setTimeout(() => {
        highlightMostVisibleQuestion();
      }, 200);
    };

    // Listen to scroll events on the window
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }
    };
  }, [onActiveQuestionIdChange, highlightMostVisibleQuestion]);

  // Intersection Observer to highlight questions in sidebar based on scroll position
  useEffect(() => {
    if (!onActiveQuestionIdChange) return;

    const observerOptions = {
      root: null, // viewport
      rootMargin: '-10% 0px -60% 0px', // Trigger when question is in the upper portion of viewport
      threshold: [0, 0.1, 0.5, 0.9, 1], // Simplified thresholds for better stability
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      // Skip automatic highlighting if user manually clicked a question
      if (manualScrollRef.current) return;

      // Clear existing debounce timer
      if (observerDebounceRef.current) {
        clearTimeout(observerDebounceRef.current);
      }

      // Debounce the highlighting update to prevent flashing
      observerDebounceRef.current = setTimeout(() => {
        // Skip if manual scroll is still active
        if (manualScrollRef.current) return;

        // Find the most visible question
        const intersectingEntries = entries.filter(entry => entry.isIntersecting);
        
        if (intersectingEntries.length === 0) return;

        // Get the entry with the highest intersection ratio
        const mostVisibleEntry = intersectingEntries.reduce((prev, current) => {
          return current.intersectionRatio > prev.intersectionRatio ? current : prev;
        });

        // Only update if intersection ratio is significant enough (prevents micro-scrolling changes)
        if (mostVisibleEntry.intersectionRatio < 0.1) return;

        const element = mostVisibleEntry.target as HTMLElement;
        const questionId = element.getAttribute('data-question-id');
        
        // Only update if the question ID is different from current
        if (questionId && questionId !== activeQuestionId) {
          onActiveQuestionIdChange(questionId);
        }
      }, 150); // 150ms debounce delay for smoother experience
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all question elements
    Object.entries(questionRefs.current).forEach(([questionId, element]) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
      // Clear timeouts on cleanup
      if (manualScrollTimeoutRef.current) {
        console.log('🧹 CLEANUP: Clearing manual scroll timeout');
        clearTimeout(manualScrollTimeoutRef.current);
      }
      if (observerDebounceRef.current) {
        clearTimeout(observerDebounceRef.current);
      }
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }
    };
  }, [items, onActiveQuestionIdChange]);

  // Extract item IDs for SortableContext
  const itemIds: UniqueIdentifier[] = items.map(item => item.question_id);

  return (
    <div className="flex gap-6 min-h-full py-4">
      {/* Spacer for fixed sidebar (from parent) */}
      <div className="w-72 shrink-0"></div>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">Exam Questions</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Add and manage exam questions.
            </p>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {items.map((item, index) => {
                // Calculate the actual question number (excluding page breaks and section headers)
                const questionNumber = items
                  .slice(0, index + 1)
                  .filter(i => i.question_type !== 'section_header' && i.question_type !== 'page_break')
                  .length;
                
                // Scroll-based highlighting (background only)
                const isScrollHighlighted = activeQuestionId === item.question_id;
                // Click-based highlighting (border)
                const isClickHighlighted = highlightedCard === item.question_id;
                // Selection highlighting
                const isSelected = selectedQuestions.has(item.question_id);
                
                // Calculate all selected indices for context menu
                const selectedIndices = Array.from(selectedQuestions).map(id => {
                  const idx = items.findIndex(i => i.question_id === id);
                  return idx !== -1 ? idx : null;
                }).filter((idx): idx is number => idx !== null);
                
                return (
                  <div
                    key={item.question_id}
                    data-question-id={item.question_id}
                    ref={(el) => {
                      questionRefs.current[item.question_id] = el;
                    }}
                    onClick={(e) => {
                      if (onQuestionSelect) {
                        onQuestionSelect(item.question_id, e);
                      } else {
                        // Fallback: Set clicked card highlight (border)
                        if (onHighlightedCardChange) {
                          onHighlightedCardChange(item.question_id);
                        }
                        // Scroll to question (this also updates activeQuestionId for scroll highlight)
                        scrollToQuestion(item.question_id, true);
                      }
                    }}
                    onContextMenu={(e) => {
                      // Set clicked card highlight (border) on right-click too
                      if (onHighlightedCardChange) {
                        onHighlightedCardChange(item.question_id);
                      }
                    }}
                    className={`transition-all`}
                  >
                    <QuestionCard
                      id={item.question_id}
                      item={item}
                      index={index}
                      questionNumber={questionNumber}
                      totalQuestions={items.length}
                      onUpdateQuestion={onUpdateQuestion}
                      onAddOption={onAddOption}
                      onUpdateOption={onUpdateOption}
                      onRemoveOption={onRemoveOption}
                      onRemoveQuestion={onRemoveQuestion}
                      onDuplicateQuestion={onDuplicateQuestion}
                      onCopyQuestion={onCopyQuestion}
                      onCutQuestion={onCutQuestion}
                      onPasteQuestion={onPasteQuestion}
                      onMoveUp={onMoveUp}
                      onMoveDown={onMoveDown}
                      onInsertAbove={onInsertAbove}
                      onInsertBelow={onInsertBelow}
                      onResetQuestion={onResetQuestion}
                      onShuffleOptions={onShuffleOptions}
                      onClearOptions={onClearOptions}
                      onExportQuestion={onExportQuestion}
                      onOpenCodeEditor={onOpenCodeEditor}
                      isScrollHighlighted={isScrollHighlighted}
                      isClickHighlighted={isClickHighlighted}
                      isSelected={isSelected}
                      selectedIndices={selectedIndices}
                    />
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex gap-2">
          <Button
            onClick={onAddNewQuestion}
            className="flex-1"
            variant="outline"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
          <Button
            onClick={onAddPageBreak}
            variant="outline"
          >
            <FilePlus className="w-4 h-4 mr-2" />
            Add Page Break
          </Button>
        </div>
      </div>
    </div>
  );
}