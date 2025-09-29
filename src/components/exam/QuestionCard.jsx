'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import TextEditor from '@/components/editors/text-editor';
import VariableContent from '@/components/ui/variable-content';
import { Trash2, GripVertical, Plus, ListTodoIcon, ListChecksIcon, TextAlignStartIcon, NotepadTextIcon, CircleSlashIcon, Eye, EyeOff } from 'lucide-react';

const questionTypes = [
  { value: 'multiple_choice', label: <><ListTodoIcon /> Multiple Choice</> },
  { value: 'multiple_select', label: <><ListChecksIcon /> Multiple Select</> },
  { value: 'short_answer', label: <><TextAlignStartIcon /> Short Answer</> },
  { value: 'long_answer', label: <><NotepadTextIcon /> Long Answer</> },
  { value: 'true_false', label: <><CircleSlashIcon />True/False</> },
];

export default function QuestionCard({ 
  item, 
  index, 
  onUpdateQuestion, 
  onAddOption, 
  onUpdateOption, 
  onRemoveOption, 
  onRemoveQuestion 
}) {
  const [showPreview, setShowPreview] = useState(false);
  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
            <Badge variant="outline">Question {index + 1}</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemoveQuestion(index)}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Question Type</Label>
            <Select
              value={item.question_type}
              onValueChange={(value) => onUpdateQuestion(index, 'question_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {questionTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Points</Label>
            <Input
              type="number"
              value={item.points}
              onChange={(e) => onUpdateQuestion(index, 'points', parseInt(e.target.value))}
              min="1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Question Text</Label>
          <TextEditor
            id={`question-${item.question_id}`}
            value={item.question_text}
            onChange={(value) => onUpdateQuestion(index, 'question_text', value)}
            placeholder="Enter your question"
            minHeight={80}
          />
        </div>

        {(item.question_type === 'multiple_choice' || item.question_type === 'multiple_select') && (
          <div className="space-y-2">
            <Label>Options</Label>
            {item.options.map((option, optionIndex) => (
              <div key={optionIndex} className="flex gap-2 items-center">
                {item.question_type === 'multiple_choice' ? (
                  <RadioGroup value={item.correct_answer?.toString()} onValueChange={(value) => onUpdateQuestion(index, 'correct_answer', parseInt(value))}>
                    <RadioGroupItem value={optionIndex.toString()} />
                  </RadioGroup>
                ) : (
                  <Checkbox
                    checked={Array.isArray(item.correct_answer) && item.correct_answer.includes(optionIndex)}
                    onCheckedChange={(checked) => {
                      const currentAnswers = Array.isArray(item.correct_answer) ? item.correct_answer : [];
                      if (checked) {
                        onUpdateQuestion(index, 'correct_answer', [...currentAnswers, optionIndex]);
                      } else {
                        onUpdateQuestion(index, 'correct_answer', currentAnswers.filter(a => a !== optionIndex));
                      }
                    }}
                  />
                )}
                <div className="flex-1">
                  <TextEditor
                    id={`question-${item.question_id}-option-${optionIndex}`}
                    value={option}
                    onChange={(value) => onUpdateOption(index, optionIndex, value)}
                    placeholder={`Option ${optionIndex + 1}`}
                    minHeight={50}
                  />
                </div>
                {item.options.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveOption(index, optionIndex)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddOption(index)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Option
            </Button>
          </div>
        )}

        {item.question_type === 'true_false' && (
          <div className="space-y-2">
            <Label>Correct Answer</Label>
            <RadioGroup 
              value={item.correct_answer?.toString()} 
              onValueChange={(value) => onUpdateQuestion(index, 'correct_answer', value === 'true')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" />
                <Label>True</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" />
                <Label>False</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {item.question_type === 'short_answer' && (
          <div className="space-y-2">
            <Label>Acceptable Answers</Label>
            {(Array.isArray(item.correct_answer) ? item.correct_answer : [item.correct_answer || '']).map((answer, answerIndex) => (
              <div key={answerIndex} className="flex gap-2 items-center">
                <Input
                  value={answer}
                  onChange={(e) => {
                    const answers = Array.isArray(item.correct_answer) ? [...item.correct_answer] : [item.correct_answer || ''];
                    answers[answerIndex] = e.target.value;
                    onUpdateQuestion(index, 'correct_answer', answers);
                  }}
                  placeholder={`Acceptable answer ${answerIndex + 1}`}
                />
                {((Array.isArray(item.correct_answer) && item.correct_answer.length > 1) || answerIndex > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const answers = Array.isArray(item.correct_answer) ? [...item.correct_answer] : [item.correct_answer || ''];
                      answers.splice(answerIndex, 1);
                      onUpdateQuestion(index, 'correct_answer', answers.length > 0 ? answers : ['']);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const answers = Array.isArray(item.correct_answer) ? [...item.correct_answer] : [item.correct_answer || ''];
                answers.push('');
                onUpdateQuestion(index, 'correct_answer', answers);
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Alternative Answer
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <Label>Explanation (Optional)</Label>
          <TextEditor
            id={`question-${item.question_id}-explanation`}
            value={item.explanation}
            onChange={(value) => onUpdateQuestion(index, 'explanation', value)}
            placeholder="Provide an explanation for the answer"
            minHeight={80}
          />
        </div>
      </CardContent>
    </Card>
  );
}