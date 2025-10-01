'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, FilePlus, GripVertical } from 'lucide-react';
import QuestionCard from './QuestionCard';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableQuestionCard({ item, index, onUpdateQuestion, onAddOption, onUpdateOption, onRemoveOption, onRemoveQuestion }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.question_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <QuestionCard
        item={item}
        index={index}
        onUpdateQuestion={onUpdateQuestion}
        onAddOption={onAddOption}
        onUpdateOption={onUpdateOption}
        onRemoveOption={onRemoveOption}
        onRemoveQuestion={onRemoveQuestion}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function SortablePageCard({ pageId, pageNumber, page, onUpdateQuestion, onAddOption, onUpdateOption, onRemoveOption, onRemoveQuestion }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pageId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Check if first item is a page break
  const hasPageBreak = page.length > 0 && page[0].question_type === 'page_break';
  const itemsWithoutPageBreak = hasPageBreak ? page.slice(1) : page;

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="overflow-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-2 -m-2 hover:bg-accent rounded">
              <GripVertical className="w-5 h-5 text-muted-foreground" />
            </div>
            <FileText className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Page {pageNumber}</CardTitle>
            <Badge variant="secondary">
              {itemsWithoutPageBreak.length} {itemsWithoutPageBreak.length === 1 ? 'item' : 'items'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasPageBreak && (
            <SortableQuestionCard
              key={page[0].question_id}
              item={page[0]}
              index={page[0].index}
              onUpdateQuestion={onUpdateQuestion}
              onAddOption={onAddOption}
              onUpdateOption={onUpdateOption}
              onRemoveOption={onRemoveOption}
              onRemoveQuestion={onRemoveQuestion}
            />
          )}
          {itemsWithoutPageBreak.map((item) => (
            <SortableQuestionCard
              key={item.question_id}
              item={item}
              index={item.index}
              onUpdateQuestion={onUpdateQuestion}
              onAddOption={onAddOption}
              onUpdateOption={onUpdateOption}
              onRemoveOption={onRemoveOption}
              onRemoveQuestion={onRemoveQuestion}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function QuestionsTab({
  items,
  onUpdateQuestion,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
  onRemoveQuestion,
  onAddNewQuestion,
  onAddPageBreak,
  onReorderQuestions
}) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Check if we're dragging a page or a question
      const activeIsPage = String(active.id).startsWith('page-');
      const overIsPage = String(over.id).startsWith('page-');

      if (activeIsPage && overIsPage) {
        // Dragging pages - need to reconstruct items array
        const oldPageIndex = pages.findIndex(p => p.id === active.id);
        const newPageIndex = pages.findIndex(p => p.id === over.id);

        const reorderedPages = arrayMove(pages, oldPageIndex, newPageIndex);

        // Flatten pages back to items array
        const newItems = [];
        reorderedPages.forEach((page) => {
          page.items.forEach(item => newItems.push(items.find(i => i.question_id === item.question_id)));
        });

        onReorderQuestions(newItems);
      } else if (!activeIsPage && !overIsPage) {
        // Dragging individual questions
        const oldIndex = items.findIndex(item => item.question_id === active.id);
        const newIndex = items.findIndex(item => item.question_id === over.id);

        // Find which page the active and over items belong to
        let activePageIndex = -1;
        let overPageIndex = -1;

        pages.forEach((page, idx) => {
          if (!page.isPageBreak) {
            if (page.items.some(item => item.question_id === active.id)) {
              activePageIndex = idx;
            }
            if (page.items.some(item => item.question_id === over.id)) {
              overPageIndex = idx;
            }
          }
        });

        let newItems = arrayMove(items, oldIndex, newIndex);

        // If moved to a different page, add a page break
        if (activePageIndex !== -1 && overPageIndex !== -1 && activePageIndex !== overPageIndex) {
          // Add page break after the dragged item
          const timestamp = Date.now();
          const draggedItemNewIndex = newItems.findIndex(item => item.question_id === active.id);

          const pageBreak = {
            question_id: `pb_${timestamp}`,
            question_text: 'Page Break',
            question_type: 'page_break',
            points: 0,
            required: false
          };

          // Insert page break after the dragged item
          newItems.splice(draggedItemNewIndex + 1, 0, pageBreak);
        }

        onReorderQuestions(newItems);
      }
    }
  };
  // Group items by pages (split by page_break)
  const pages = useMemo(() => {
    const result = [];
    let currentPage = [];

    items.forEach((item, index) => {
      if (item.question_type === 'page_break') {
        // Close current page
        if (currentPage.length > 0) {
          result.push({ id: `page-${result.length}`, items: currentPage });
        }
        // Start new page with page break at the top
        currentPage = [{ ...item, index }];
      } else {
        currentPage.push({ ...item, index });
      }
    });

    if (currentPage.length > 0) {
      result.push({ id: `page-${result.length}`, items: currentPage });
    }

    return result.length > 0 ? result : [{ id: 'page-0', items: [] }];
  }, [items]);

  // Get sortable IDs for pages and all questions
  const sortableIds = useMemo(() => {
    const ids = [];
    pages.forEach(page => {
      ids.push(page.id);
      // Also add all questions within the page
      page.items.forEach(item => {
        ids.push(item.question_id);
      });
    });
    return ids;
  }, [pages]);

  // Calculate actual page numbers (excluding page breaks)
  let actualPageNumber = 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">Exam Questions</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Add and manage exam questions. Drag pages or questions to reorder.
            </p>
          </div>
        </div>

        <SortableContext
          items={sortableIds}
          strategy={verticalListSortingStrategy}
        >
          {pages.map((page) => {
            actualPageNumber++;

            return (
              <SortablePageCard
                key={page.id}
                pageId={page.id}
                pageNumber={actualPageNumber}
                page={page.items}
                onUpdateQuestion={onUpdateQuestion}
                onAddOption={onAddOption}
                onUpdateOption={onUpdateOption}
                onRemoveOption={onRemoveOption}
                onRemoveQuestion={onRemoveQuestion}
              />
            );
          })}
        </SortableContext>

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
    </DndContext>
  );
}