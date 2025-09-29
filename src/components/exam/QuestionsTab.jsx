'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import QuestionCard from './QuestionCard';

export default function QuestionsTab({ 
  items, 
  onUpdateQuestion, 
  onAddOption, 
  onUpdateOption, 
  onRemoveOption, 
  onRemoveQuestion,
  onAddNewQuestion 
}) {
  return (
    <Card className="overflow-auto">
      <CardHeader>
        <CardTitle>Exam Questions</CardTitle>
        <CardDescription>
          Add and manage exam questions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <QuestionCard
            key={item.question_id}
            item={item}
            index={index}
            onUpdateQuestion={onUpdateQuestion}
            onAddOption={onAddOption}
            onUpdateOption={onUpdateOption}
            onRemoveOption={onRemoveOption}
            onRemoveQuestion={onRemoveQuestion}
          />
        ))}

        <Button
          onClick={onAddNewQuestion}
          className="w-full"
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Question
        </Button>
      </CardContent>
    </Card>
  );
}