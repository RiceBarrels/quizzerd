'use client';

import { Button } from '@/components/ui/button';
import { Plus, FilePlus } from 'lucide-react';
import QuestionCard from './QuestionCard';
import { ExamItem } from '@/types/exam';
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
  onAddNewQuestion: () => void;
  onAddPageBreak: () => void;
  onReorderQuestions?: (items: ExamItem[]) => void;
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

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;

    if (active.id !== over?.id && onReorderQuestions) {
      const oldIndex = items.findIndex((item) => item.question_id === active.id);
      const newIndex = items.findIndex((item) => item.question_id === over!.id);

      const reorderedItems = arrayMove(items, oldIndex, newIndex);
      onReorderQuestions(reorderedItems);
    }
  }

  // Extract item IDs for SortableContext
  const itemIds: UniqueIdentifier[] = items.map(item => item.question_id);

  return (
    <div className="space-y-6">
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
            {items.map((item, index) => (
              <QuestionCard
                key={item.question_id}
                id={item.question_id}
                item={item}
                index={index}
                onUpdateQuestion={onUpdateQuestion}
                onAddOption={onAddOption}
                onUpdateOption={onUpdateOption}
                onRemoveOption={onRemoveOption}
                onRemoveQuestion={onRemoveQuestion}
              />
            ))}
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
  );
}