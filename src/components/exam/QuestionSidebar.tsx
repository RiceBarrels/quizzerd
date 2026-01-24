'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
import { FileText, Minus, GripVertical, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { ExamItem } from '@/types/exam';
import { QuestionTypeOption } from '@/types/exam';
import { PresenceUser } from '@/hooks/useRealtimePresence';
import QuestionContextMenu from './QuestionContextMenu';
import { useSidebar } from '../ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface QuestionSidebarProps {
  items: ExamItem[];
  activeTab: string;
  activeQuestionId: string | null;
  highlightedCard: string | null;
  questionTypes: QuestionTypeOption[];
  onQuestionClick: (questionId: string, event?: React.MouseEvent) => void;
  onReorder: (newItems: ExamItem[]) => void;
  getQuestionTitle: (item: ExamItem) => string;
  onUpdateQuestion?: (index: number, field: keyof ExamItem, value: any) => void;
  onAddOption?: (questionIndex: number) => void;
  onRemoveQuestion?: (index: number) => void;
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
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: () => boolean;
  canRedo?: () => boolean;
  selectedQuestions?: Set<string>;
  onQuestionSelect?: (questionId: string, event: React.MouseEvent) => void;
  // Realtime presence props
  onlineUsers?: PresenceUser[];
  currentUserId?: string;
}

/**
 * Sidebar component displaying a list of questions with drag-and-drop reordering
 * Shows question titles and allows navigation/selection of questions
 * @param {QuestionSidebarProps} props - Component props
 * @param {ExamItem[]} props.items - Array of exam items/questions
 * @param {string} props.activeTab - Currently active tab identifier
 * @param {string | null} props.activeQuestionId - Currently active question ID
 * @param {string | null} props.highlightedCard - Currently highlighted card ID
 * @param {QuestionTypeOption[]} props.questionTypes - Available question type options
 * @param {(questionId: string, event?: React.MouseEvent) => void} props.onQuestionClick - Callback when a question is clicked
 * @param {(newItems: ExamItem[]) => void} props.onReorder - Callback when questions are reordered
 * @param {(item: ExamItem) => string} props.getQuestionTitle - Function to get question title from item
 * @param {(index: number, field: keyof ExamItem, value: any) => void} [props.onUpdateQuestion] - Optional callback when question is updated
 * @param {(questionIndex: number) => void} [props.onAddOption] - Optional callback to add option
 * @param {(index: number) => void} [props.onRemoveQuestion] - Optional callback to remove question
 * @param {(index: number) => void} [props.onDuplicateQuestion] - Optional callback to duplicate question
 * @param {(index: number | number[]) => void} [props.onCopyQuestion] - Optional callback to copy question(s)
 * @param {(index: number | number[]) => void} [props.onCutQuestion] - Optional callback to cut question(s)
 * @param {(afterIndex: number) => Promise<void>} [props.onPasteQuestion] - Optional callback to paste question(s)
 * @param {(index: number) => void} [props.onMoveUp] - Optional callback to move question up
 * @param {(index: number) => void} [props.onMoveDown] - Optional callback to move question down
 * @param {(index: number) => void} [props.onInsertAbove] - Optional callback to insert above
 * @param {(index: number) => void} [props.onInsertBelow] - Optional callback to insert below
 * @param {(index: number) => void} [props.onResetQuestion] - Optional callback to reset question
 * @param {(index: number) => void} [props.onShuffleOptions] - Optional callback to shuffle options
 * @param {(index: number) => void} [props.onClearOptions] - Optional callback to clear options
 * @param {(index: number) => void} [props.onExportQuestion] - Optional callback to export question
 * @param {Set<string>} [props.selectedQuestions] - Set of selected question IDs
 * @param {(questionId: string, event: React.MouseEvent) => void} [props.onQuestionSelect] - Optional callback when question is selected
 * @returns {JSX.Element} Sidebar with question list and context menu
 */
export default function QuestionSidebar({
  items,
  activeTab,
  activeQuestionId,
  highlightedCard,
  questionTypes,
  onQuestionClick,
  onReorder,
  getQuestionTitle,
  onUpdateQuestion,
  onAddOption,
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
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  selectedQuestions = new Set(),
  onQuestionSelect,
  onlineUsers = [],
  currentUserId,
}: QuestionSidebarProps) {
  const [sidebarPosition, setSidebarPosition] = useState({ top: 64, maxHeight: 'calc(100vh - 312px)' });
  const [collapsed, setCollapsed] = useState(false);
  const sidebarScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sidebarQuestionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const { open } = useSidebar();

  // Sensors for drag and drop
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

  // Group questions by pages (separated by page breaks)
  const groupQuestionsByPages = useCallback(() => {
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
  }, [items]);

  const handleSidebarDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = items.findIndex((item) => item.question_id === active.id);
      const newIndex = items.findIndex((item) => item.question_id === over!.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedItems = arrayMove(items, oldIndex, newIndex);
        onReorder(reorderedItems);
      }
    }
  }, [items, onReorder]);

  // Calculate all selected indices from selectedQuestions Set (memoized for performance)
  const allSelectedIndices = useMemo(() => {
    const selectedIndices: number[] = [];
    items.forEach((item, index) => {
      if (selectedQuestions.has(item.question_id)) {
        selectedIndices.push(index);
      }
    });
    return selectedIndices;
  }, [items, selectedQuestions]);

  // Calculate sidebar position based on tabs-list position
  const updateSidebarPosition = useCallback(() => {
    const tabsList = document.getElementById('tabs-list');
    if (tabsList) {
      const rect = tabsList.getBoundingClientRect();
      const topPosition = rect.bottom + 16;
      const maxHeight = `calc(100vh - ${topPosition + 48}px)`;
      
      setSidebarPosition({
        top: topPosition,
        maxHeight: maxHeight
      });
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'questions') return;

    updateSidebarPosition();
    window.addEventListener('scroll', updateSidebarPosition, true);
    window.addEventListener('resize', updateSidebarPosition);

    return () => {
      window.removeEventListener('scroll', updateSidebarPosition, true);
      window.removeEventListener('resize', updateSidebarPosition);
    };
  }, [activeTab, items.length, updateSidebarPosition]);

  // Auto-scroll sidebar to keep active question visible
  useEffect(() => {
    if (!activeQuestionId || activeTab !== 'questions') return;

    requestAnimationFrame(() => {
      const sidebarButton = sidebarQuestionRefs.current[activeQuestionId];
      const sidebarContainer = sidebarScrollContainerRef.current;

      if (sidebarButton && sidebarContainer) {
        const buttonOffset = sidebarButton.offsetTop;
        const containerHeight = sidebarContainer.clientHeight;
        const buttonHeight = sidebarButton.clientHeight;
        
        const scrollTarget = buttonOffset - (containerHeight / 2) + (buttonHeight / 2);
        const maxScroll = sidebarContainer.scrollHeight - containerHeight;
        const clampedScroll = Math.max(0, Math.min(scrollTarget, maxScroll));

        sidebarContainer.scrollTo({
          top: clampedScroll,
          behavior: 'smooth'
        });
      }
    });
  }, [activeQuestionId, activeTab]);

  // Get users editing a specific question
  const getUsersOnQuestion = useCallback((questionId: string) => {
    return onlineUsers.filter(
      (u) => u.id !== currentUserId && u.cursor.questionId === questionId
    );
  }, [onlineUsers, currentUserId]);

  // Sortable Sidebar Button Component
  const SortableSidebarButton = ({ item, questionNumber }: { item: ExamItem; questionNumber: number }) => {
    const usersOnThisQuestion = getUsersOnQuestion(item.question_id);
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
      pointerEvents: isDragging ? 'none' : 'auto',
    };

    const questionTypeInfo = questionTypes.find(qt => qt.value === item.question_type);
    const QuestionIcon = questionTypeInfo?.icon;

    const sidebarItemIndex = items.findIndex(i => i.question_id === item.question_id);
    const sidebarItemNumber = items
      .slice(0, sidebarItemIndex + 1)
      .filter(i => i.question_type !== 'section_header' && i.question_type !== 'page_break')
      .length;

    // Special rendering for page breaks
    if (item.question_type === 'page_break') {
      const isSelected = selectedQuestions.has(item.question_id);
      const buttonContent = (
        <div
          className={`flex-1 flex items-center gap-2 px-2.5 py-2 rounded-md border-1 border-dashed transition-all cursor-pointer hover:bg-accent/70 min-w-0 ${
            // Scroll-based highlight (background only)
            activeQuestionId === item.question_id ? 'bg-accent/30' : ''
          } ${
            // Selection highlight
            isSelected ? 'border-foreground/20 ring-foreground/10 ring-[3px] rounded-lg' : ''
          } ${
            // Click-based highlight (border)
            highlightedCard === item.question_id
              ? 'border-ring ring-ring/50 ring-[3px]'
              : 'border-muted-foreground/30 hover:border-border'
          }`}
        >
          <Minus className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground truncate overflow-hidden text-ellipsis whitespace-nowrap">Page Break</span>
        </div>
      );

      return (
        <div
          ref={setNodeRef}
          style={style}
          className="flex items-center gap-1 my-2 pl-1"
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
          {onUpdateQuestion ? (
            <QuestionContextMenu
              item={item}
              index={sidebarItemIndex}
              totalQuestions={items.length}
              onUpdateQuestion={onUpdateQuestion}
              onAddOption={onAddOption || (() => {})}
              onRemoveQuestion={onRemoveQuestion || (() => {})}
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
              onUndo={onUndo}
              onRedo={onRedo}
              canUndo={canUndo}
              canRedo={canRedo}
              selectedIndices={allSelectedIndices.length > 0 ? allSelectedIndices : [sidebarItemIndex]}
            >
              <div onClick={(e) => {
                if (onQuestionSelect) {
                  onQuestionSelect(item.question_id, e);
                } else {
                  onQuestionClick(item.question_id, e);
                }
              }}>
                {buttonContent}
              </div>
            </QuestionContextMenu>
          ) : (
            <div onClick={(e) => {
              if (onQuestionSelect) {
                onQuestionSelect(item.question_id, e);
              } else {
                onQuestionClick(item.question_id, e);
              }
            }}>
              {buttonContent}
            </div>
          )}
        </div>
      );
    }

    const isSelected = selectedQuestions.has(item.question_id);
    const buttonContent = (
      <button
        onClick={(e) => {
          if (onQuestionSelect) {
            onQuestionSelect(item.question_id, e);
          } else {
            onQuestionClick(item.question_id, e);
          }
        }}
        className={`flex-1 text-left px-2.5 py-2 rounded-md border transition-all hover:bg-accent/70 min-w-0 ${
          // Scroll-based highlight (background only)
          activeQuestionId === item.question_id ? 'bg-accent/30' : ''
        } ${
          // Selection highlight
          isSelected ? 'border-foreground/20 ring-foreground/10 ring-[3px] rounded-lg border-[1px]' : ''
        } ${
          // Click-based highlight (border)
          highlightedCard === item.question_id
            ? 'border-ring ring-ring/50 ring-[3px]'
            : 'border-transparent'
        }`}
      >
          <div className="flex items-start justify-between gap-2 min-w-0">
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-1.5 mb-0.5">
                {QuestionIcon && <QuestionIcon className="h-3 w-3 flex-shrink-0 text-muted-foreground" />}
                <div className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  {item.question_type === 'section_header' ? 'Section' : `Q${questionNumber}`}
                </div>
                {/* Presence indicators for users editing this question */}
                {usersOnThisQuestion.length > 0 && (
                  <TooltipProvider>
                    <div className="flex items-center gap-1 ml-1">
                      {usersOnThisQuestion.slice(0, 2).map((user) => (
                        <Tooltip key={user.id}>
                          <TooltipTrigger asChild>
                            <div
                              className="flex items-center gap-0.5 px-1 py-0.5 rounded-full text-[9px] font-medium"
                              style={{
                                backgroundColor: `${user.color}20`,
                                color: user.color,
                                border: `1px solid ${user.color}40`
                              }}
                            >
                              <Avatar className="h-3 w-3">
                                <AvatarImage src={user.imageUrl} alt={user.name} />
                                <AvatarFallback
                                  style={{ backgroundColor: user.color, color: 'white' }}
                                  className="text-[7px] font-medium"
                                >
                                  {user.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="max-w-[40px] truncate">
                                {user.cursor.fieldType === 'option'
                                  ? `opt${(user.cursor.optionIndex ?? 0) + 1}`
                                  : user.cursor.fieldType === 'explanation'
                                  ? 'expl'
                                  : user.cursor.fieldType === 'settings'
                                  ? 'settings'
                                  : 'text'}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            <p className="font-medium">{user.name}</p>
                            <p className="text-muted-foreground">
                              Editing {user.cursor.fieldType === 'option'
                                ? `Option ${(user.cursor.optionIndex ?? 0) + 1}`
                                : user.cursor.fieldType === 'explanation'
                                ? 'Explanation'
                                : user.cursor.fieldType === 'settings'
                                ? 'Settings'
                                : 'Question text'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                      {usersOnThisQuestion.length > 2 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="h-4 px-1 rounded-full bg-muted flex items-center justify-center text-[8px] font-medium">
                              +{usersOnThisQuestion.length - 2}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {usersOnThisQuestion.slice(2).map((user) => (
                              <p key={user.id}>
                                <span className="font-medium">{user.name}</span>
                                <span className="text-muted-foreground ml-1">
                                  ({user.cursor.fieldType || 'text'})
                                </span>
                              </p>
                            ))}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TooltipProvider>
                )}
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
      );

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
        {onUpdateQuestion ? (
          <QuestionContextMenu
            item={item}
            index={sidebarItemIndex}
            totalQuestions={items.length}
            onUpdateQuestion={onUpdateQuestion}
            onAddOption={onAddOption || (() => {})}
            onRemoveQuestion={onRemoveQuestion || (() => {})}
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
            onUndo={onUndo}
            onRedo={onRedo}
            canUndo={canUndo}
            canRedo={canRedo}
            selectedIndices={allSelectedIndices.length > 0 ? allSelectedIndices : [sidebarItemIndex]}
          >
            {buttonContent}
          </QuestionContextMenu>
        ) : (
          buttonContent
        )}
      </div>
    );
  };

  const groupedPages = groupQuestionsByPages();
  const sortableQuestionIds = items.map(item => item.question_id);

  if (activeTab !== 'questions') return null;

  return (
    <AnimatePresence initial={false} mode="wait">
      {/* Hidden on mobile (< lg breakpoint) */}
      <motion.div
        key="questions-sidebar"
        className="z-50 fixed left-4 lg:left-8 hidden lg:block"
        style={{ top: `${sidebarPosition.top}px` }}
        initial={{ opacity: 0, x: "-32rem", filter: "blur(8px)" }}
        animate={{
          opacity: 1,
          x: open ? "16rem" : "3rem",
          width: collapsed ? 'auto' : '288px',
          filter: "blur(0px)"
        }}
        transition={{ duration: 0.3, type: "spring", visualDuration: 0.25, bounce: 0.3 }}
        exit={{ opacity: 0, x: "-32rem", filter: "blur(8px)" }}
      >
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="bg-card border rounded-lg shadow-lg flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors"
            title="Open Questions Overview"
          >
            <FileText className="h-4 w-4" />
            <div className="flex flex-col items-start text-left">
              <span className="text-xs font-medium">
                {items.filter(i => i.question_type !== 'section_header' && i.question_type !== 'page_break').length} Questions
              </span>
              <span className="text-[10px] text-muted-foreground">
                {items.reduce((sum, i) => sum + (i.question_type !== 'section_header' && i.question_type !== 'page_break' ? (i.points || 0) : 0), 0)} pts
              </span>
            </div>
          </button>
        ) : (
        <DndContext
          sensors={sidebarSensors}
          collisionDetection={closestCenter}
          onDragEnd={handleSidebarDragEnd}
        >
          <div
            ref={sidebarScrollContainerRef}
            className="bg-card overflow-y-auto border rounded-lg shadow-lg scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40"
            style={{ maxHeight: sidebarPosition.maxHeight }}
          >
            {/* Header */}
            <div className="sticky top-0 bg-card border-b px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Questions Overview</h3>
                <button
                  onClick={() => setCollapsed(true)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                  title="Hide Questions Overview"
                >
                  <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="p-4">
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
                              <div className="space-y-2 pl-1">
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
                          <div className="space-y-2 pl-1">
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
          </div>
        </DndContext>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

