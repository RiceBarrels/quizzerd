'use client';

import { useEffect, useState, memo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import TextEditor from '@/components/editors/text-editor';
import VariableContent from '@/components/ui/variable-content';
import StableCodeEditor from './StableCodeEditor';
import { Trash2, Plus, ListTodoIcon, ListChecksIcon, TextAlignStartIcon, NotepadTextIcon, CircleSlashIcon, Eye, EyeOff, ChevronDown, SlidersHorizontal, Calendar, Clock, Upload, Star, Heading, Minus, ChevronsUpDown, Check, Heart, ThumbsUp, Code, GripVertical, Copy, Trash2 as Trash2Icon, ClipboardCopy, ClipboardPaste, Clipboard, Scissors, ArrowUp, ArrowDown, ListChecks, Hash, MousePointerClick, RefreshCw, Shuffle, Sparkles, FileDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ExamItem, QuestionType, QuestionTypeOption } from '@/types/exam';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { UniqueIdentifier } from '@dnd-kit/core';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuCheckboxItem,
} from '@/components/ui/context-menu';

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

interface QuestionCardProps {
  item: ExamItem;
  index: number;
  questionNumber?: number; // Actual question number excluding page breaks and section headers
  totalQuestions?: number; // Total number of questions for move up/down
  onUpdateQuestion: (index: number, field: keyof ExamItem, value: any) => void;
  onAddOption: (questionIndex: number) => void;
  onUpdateOption: (questionIndex: number, optionIndex: number, value: string) => void;
  onRemoveOption: (questionIndex: number, optionIndex: number) => void;
  onRemoveQuestion: (index: number) => void;
  onOpenCodeEditor?: (questionIndex: number) => void;
  onDuplicateQuestion?: (index: number) => void;
  onCopyQuestion?: (index: number) => void;
  onCutQuestion?: (index: number) => void;
  onPasteQuestion?: (afterIndex: number) => Promise<void>;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onInsertAbove?: (index: number) => void;
  onInsertBelow?: (index: number) => void;
  onResetQuestion?: (index: number) => void;
  onShuffleOptions?: (index: number) => void;
  onClearOptions?: (index: number) => void;
  onExportQuestion?: (index: number) => void;
}

const QuestionCard = memo(function QuestionCard({
  item,
  index,
  questionNumber,
  totalQuestions,
  onUpdateQuestion,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
  onRemoveQuestion,
  onOpenCodeEditor,
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
  onExportQuestion
}: QuestionCardProps) {
  const [open, setOpen] = useState(false);
  const [hasTextSelection, setHasTextSelection] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [isInTextField, setIsInTextField] = useState(false);

  const selectedType = questionTypes.find(type => type.value === item.question_type);
  const SelectedIcon = selectedType?.icon;

  // Check for text selection and input field when context menu opens
  const handleContextMenu = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    const text = selection?.toString() || '';
    setSelectedText(text);
    setHasTextSelection(text.length > 0);
    
    // Check if right-clicked on an input field or contentEditable element
    const target = e.target as HTMLElement;
    const isTextField = 
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.closest('[contenteditable="true"]') !== null;
    setIsInTextField(isTextField);
  };

  // Copy selected text
  const handleCopyText = async () => {
    if (selectedText) {
      try {
        await navigator.clipboard.writeText(selectedText);
        toast.success('Text copied to clipboard');
      } catch (error) {
        toast.error('Failed to copy text');
      }
    }
  };

  // Paste text at cursor position
  const handlePasteText = async () => {
    try {
      const text = await navigator.clipboard.readText();
      // Insert text at current cursor position
      document.execCommand('insertText', false, text);
      toast.success('Text pasted');
    } catch (error) {
      toast.error('Failed to paste text');
    }
  };

  // Select all text
  const handleSelectAll = () => {
    document.execCommand('selectAll', false);
    toast.success('All text selected');
  };

  // Cut selected text
  const handleCutText = async () => {
    if (selectedText) {
      try {
        await navigator.clipboard.writeText(selectedText);
        document.execCommand('delete', false);
        toast.success('Text cut to clipboard');
      } catch (error) {
        toast.error('Failed to cut text');
      }
    }
  };

  // Clear all text
  const handleClearText = () => {
    document.execCommand('selectAll', false);
    document.execCommand('delete', false);
    toast.success('Text cleared');
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card className="relative" onContextMenu={handleContextMenu}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 flex-1">
            <Badge variant="outline">
              {item.question_type === 'section_header' ? 'Section Header' :
               item.question_type === 'page_break' ? 'Page Break' :
               `Question ${questionNumber ?? index + 1}`}
            </Badge>
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
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {selectedType ? (
                    <div className="flex items-center gap-2">
                      {SelectedIcon && <SelectedIcon className="h-4 w-4" />}
                      {selectedType.label}
                    </div>
                  ) : (
                    "Select question type..."
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0">
                <Command>
                  <CommandInput placeholder="Search question type..." />
                  <CommandList>
                    <CommandEmpty>No question type found.</CommandEmpty>
                    <CommandGroup>
                      {questionTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                          <CommandItem
                            key={type.value}
                            value={type.value}
                            onSelect={(currentValue) => {
                              onUpdateQuestion(index, 'question_type', currentValue);
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                item.question_type === type.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <Icon className="mr-2 h-4 w-4" />
                            {type.label}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
            {item.options?.map((option, optionIndex) => (
              <div key={optionIndex} className="flex gap-2 items-center">
                {item.question_type === 'multiple_choice' ? (
                  <RadioGroup value={item.correct_answer?.toString()} onValueChange={(value) => onUpdateQuestion(index, 'correct_answer', parseInt(value))}>
                    <RadioGroupItem value={optionIndex.toString()} />
                  </RadioGroup>
                ) : (
                  <Checkbox
                    checked={Array.isArray(item.correct_answer) && (item.correct_answer as number[]).includes(optionIndex)}
                    onCheckedChange={(checked) => {
                      const currentAnswers = Array.isArray(item.correct_answer) ? item.correct_answer as number[] : [];
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
                {(item.options?.length ?? 0) > 2 && (
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
                  value={String(answer)}
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

        {item.question_type === 'dropdown' && (
          <div className="space-y-2">
            <Label>Dropdown Options</Label>
            {item.options?.map((option, optionIndex) => (
              <div key={optionIndex} className="flex gap-2 items-center">
                <RadioGroup value={item.correct_answer?.toString()} onValueChange={(value) => onUpdateQuestion(index, 'correct_answer', parseInt(value))}>
                  <RadioGroupItem value={optionIndex.toString()} />
                </RadioGroup>
                <Input
                  value={option}
                  onChange={(e) => onUpdateOption(index, optionIndex, e.target.value)}
                  placeholder={`Option ${optionIndex + 1}`}
                />
                {(item.options?.length ?? 0) > 2 && (
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

        {item.question_type === 'scale' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum Value</Label>
                <Input
                  type="number"
                  value={item.scale_min || 1}
                  onChange={(e) => onUpdateQuestion(index, 'scale_min', parseInt(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Maximum Value</Label>
                <Input
                  type="number"
                  value={item.scale_max || 5}
                  onChange={(e) => onUpdateQuestion(index, 'scale_max', parseInt(e.target.value))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Minimum Label (Optional)</Label>
                <Input
                  value={item.scale_min_label || ''}
                  onChange={(e) => onUpdateQuestion(index, 'scale_min_label', e.target.value)}
                  placeholder="e.g., Strongly Disagree"
                />
              </div>
              <div className="space-y-2">
                <Label>Maximum Label (Optional)</Label>
                <Input
                  value={item.scale_max_label || ''}
                  onChange={(e) => onUpdateQuestion(index, 'scale_max_label', e.target.value)}
                  placeholder="e.g., Strongly Agree"
                />
              </div>
            </div>
          </div>
        )}

        {item.question_type === 'date' && (
          <div className="space-y-2">
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={item.include_time || false}
                  onCheckedChange={(checked) => onUpdateQuestion(index, 'include_time', checked)}
                />
                <Label>Include Time</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={item.include_year || false}
                  onCheckedChange={(checked) => onUpdateQuestion(index, 'include_year', checked)}
                />
                <Label>Include Year</Label>
              </div>
            </div>
          </div>
        )}

        {item.question_type === 'time' && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={item.duration || false}
                onCheckedChange={(checked) => onUpdateQuestion(index, 'duration', checked)}
              />
              <Label>Duration (instead of time of day)</Label>
            </div>
          </div>
        )}

        {item.question_type === 'file_upload' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Maximum Files</Label>
                <Input
                  type="number"
                  value={item.max_files || 1}
                  onChange={(e) => onUpdateQuestion(index, 'max_files', parseInt(e.target.value))}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Max File Size (MB)</Label>
                <Input
                  type="number"
                  value={Math.round((item.max_file_size || 10485760) / 1048576)}
                  onChange={(e) => onUpdateQuestion(index, 'max_file_size', parseInt(e.target.value) * 1048576)}
                  min="1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Allowed File Types</Label>
              <Input
                value={(item.allowed_types || ['ANY']).join(', ')}
                onChange={(e) => onUpdateQuestion(index, 'allowed_types', e.target.value.split(',').map(t => t.trim()))}
                placeholder="e.g., PDF, DOC, DOCX or ANY for all types"
              />
            </div>
          </div>
        )}

        {item.question_type === 'rating' && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rating Scale</Label>
                <Select
                  value={item.rating_scale?.toString() || '5'}
                  onValueChange={(value) => onUpdateQuestion(index, 'rating_scale', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Icon Type</Label>
                <Select
                  value={item.rating_icon || 'STAR'}
                  onValueChange={(value) => onUpdateQuestion(index, 'rating_icon', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STAR">
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        Star
                      </div>
                    </SelectItem>
                    <SelectItem value="HEART">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Heart
                      </div>
                    </SelectItem>
                    <SelectItem value="THUMB">
                      <div className="flex items-center gap-2">
                        <ThumbsUp className="h-4 w-4" />
                        Thumb
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {item.question_type === 'coding' && (
          <div className="space-y-2">
            <Label>Starter Code</Label>
            <Button
              variant="outline"
              className="w-full h-32 flex flex-col items-center justify-center gap-3 border-2 border-dashed hover:border-primary hover:bg-accent/50 transition-all"
              onClick={() => onOpenCodeEditor?.(index)}
            >
              <Code className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <div className="text-base font-medium">Open Fullscreen Code Editor</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {item.starter_files?.length || 1} file(s) • Click to edit code
                </div>
              </div>
            </Button>
            <div className="space-y-2 mt-4">
              <Label>Test Cases (Optional)</Label>
              <TextEditor
                id={`question-${item.question_id}-test-cases`}
                value={item.test_cases || ''}
                onChange={(value) => onUpdateQuestion(index, 'test_cases', value)}
                placeholder="Describe the test cases or expected output"
                minHeight={80}
              />
            </div>
          </div>
        )}

        {item.question_type === 'section_header' && (
          <div className="space-y-2">
            <Label>Description</Label>
            <TextEditor
              id={`question-${item.question_id}-description`}
              value={item.description || ''}
              onChange={(value) => onUpdateQuestion(index, 'description', value)}
              placeholder="Section description"
              minHeight={80}
            />
          </div>
        )}

        {item.question_type === 'page_break' && (
          <div className="text-center py-4 text-muted-foreground">
            This will create a page break in the exam
          </div>
        )}

        {item.question_type !== 'section_header' && item.question_type !== 'page_break' && (
          <div className="space-y-2">
            <Label>Explanation (Optional)</Label>
            <TextEditor
              id={`question-${item.question_id}-explanation`}
              value={item.explanation || ''}
              onChange={(value) => onUpdateQuestion(index, 'explanation', value)}
              placeholder="Provide an explanation for the answer"
              minHeight={80}
            />
          </div>
        )}
      </CardContent>
    </Card>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {isInTextField ? (
          // Text field menu - Always available in text fields
          <>
            {hasTextSelection && (
              <>
                <ContextMenuItem onClick={handleCopyText}>
                  <Clipboard className="mr-2 h-4 w-4" />
                  <span>Copy</span>
                </ContextMenuItem>
                <ContextMenuItem onClick={handleCutText}>
                  <Scissors className="mr-2 h-4 w-4" />
                  <span>Cut</span>
                </ContextMenuItem>
              </>
            )}
            <ContextMenuItem onClick={handlePasteText}>
              <ClipboardPaste className="mr-2 h-4 w-4" />
              <span>Paste</span>
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={handleSelectAll}>
              <MousePointerClick className="mr-2 h-4 w-4" />
              <span>Select All</span>
            </ContextMenuItem>
            {hasTextSelection && (
              <ContextMenuItem onClick={handleClearText}>
                <Trash2Icon className="mr-2 h-4 w-4" />
                <span>Clear Selection</span>
              </ContextMenuItem>
            )}
          </>
        ) : (
          // Question menu
          <>
            {/* Insert Actions */}
            {onInsertAbove && (
              <ContextMenuItem onClick={() => onInsertAbove(index)}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Insert Question Above</span>
              </ContextMenuItem>
            )}
            {onInsertBelow && (
              <ContextMenuItem onClick={() => onInsertBelow(index)}>
                <Plus className="mr-2 h-4 w-4" />
                <span>Insert Question Below</span>
              </ContextMenuItem>
            )}
            
            {(onInsertAbove || onInsertBelow) && <ContextMenuSeparator />}

            {/* Copy/Paste Actions */}
            {onDuplicateQuestion && (
              <ContextMenuItem onClick={() => onDuplicateQuestion(index)}>
                <Copy className="mr-2 h-4 w-4" />
                <span>Duplicate Question</span>
              </ContextMenuItem>
            )}
            {onCopyQuestion && (
              <ContextMenuItem onClick={() => onCopyQuestion(index)}>
                <ClipboardCopy className="mr-2 h-4 w-4" />
                <span>Copy Question</span>
              </ContextMenuItem>
            )}
            {onCutQuestion && (
              <ContextMenuItem onClick={() => onCutQuestion(index)}>
                <Scissors className="mr-2 h-4 w-4" />
                <span>Cut Question</span>
              </ContextMenuItem>
            )}
            {onPasteQuestion && (
              <ContextMenuItem onClick={() => onPasteQuestion(index)}>
                <ClipboardPaste className="mr-2 h-4 w-4" />
                <span>Paste Question</span>
              </ContextMenuItem>
            )}
            
            {(onDuplicateQuestion || onCopyQuestion || onCutQuestion || onPasteQuestion) && <ContextMenuSeparator />}

            {/* Move Actions */}
            {onMoveUp && index > 0 && (
              <ContextMenuItem onClick={() => onMoveUp(index)}>
                <ArrowUp className="mr-2 h-4 w-4" />
                <span>Move Up</span>
              </ContextMenuItem>
            )}
            {onMoveDown && totalQuestions && index < totalQuestions - 1 && (
              <ContextMenuItem onClick={() => onMoveDown(index)}>
                <ArrowDown className="mr-2 h-4 w-4" />
                <span>Move Down</span>
              </ContextMenuItem>
            )}
            
            {((onMoveUp && index > 0) || (onMoveDown && totalQuestions && index < totalQuestions - 1)) && <ContextMenuSeparator />}

            {/* Quick Settings */}
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <Hash className="mr-2 h-4 w-4" />
                <span>Set Points</span>
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {[1, 2, 3, 5, 10, 15, 20, 25, 50, 100].map((points) => (
                  <ContextMenuItem
                    key={points}
                    onClick={() => onUpdateQuestion(index, 'points', points)}
                  >
                    <span className={item.points === points ? 'font-semibold' : ''}>
                      {points} {points === 1 ? 'point' : 'points'}
                    </span>
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <ListChecks className="mr-2 h-4 w-4" />
                <span>Change Type</span>
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-56">
                {questionTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <ContextMenuItem
                      key={type.value}
                      onClick={() => onUpdateQuestion(index, 'question_type', type.value)}
                      disabled={item.question_type === type.value}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <span className={item.question_type === type.value ? 'font-semibold' : ''}>
                        {type.label}
                      </span>
                    </ContextMenuItem>
                  );
                })}
              </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuCheckboxItem
              checked={item.required}
              onCheckedChange={(checked) => onUpdateQuestion(index, 'required', checked)}
            >
              Required Question
            </ContextMenuCheckboxItem>

            <ContextMenuSeparator />

            {/* Additional Features */}
            {(item.question_type === 'multiple_choice' || item.question_type === 'multiple_select' || item.question_type === 'dropdown') && item.options && item.options.length > 1 && (
              <>
                <ContextMenuSub>
                  <ContextMenuSubTrigger>
                    <Sparkles className="mr-2 h-4 w-4" />
                    <span>Options</span>
                  </ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    {onShuffleOptions && (
                      <ContextMenuItem onClick={() => onShuffleOptions(index)}>
                        <Shuffle className="mr-2 h-4 w-4" />
                        <span>Shuffle Options</span>
                      </ContextMenuItem>
                    )}
                    {onClearOptions && (
                      <ContextMenuItem onClick={() => onClearOptions(index)}>
                        <Trash2Icon className="mr-2 h-4 w-4" />
                        <span>Clear All Options</span>
                      </ContextMenuItem>
                    )}
                    <ContextMenuItem onClick={() => onAddOption(index)}>
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Add Option</span>
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
              </>
            )}

            {onResetQuestion && (
              <ContextMenuItem onClick={() => onResetQuestion(index)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                <span>Reset Question</span>
              </ContextMenuItem>
            )}

            {onExportQuestion && (
              <ContextMenuItem onClick={() => onExportQuestion(index)}>
                <FileDown className="mr-2 h-4 w-4" />
                <span>Export as JSON</span>
              </ContextMenuItem>
            )}

            <ContextMenuSeparator />

            {/* Delete Action */}
            <ContextMenuItem 
              variant="destructive"
              onClick={() => onRemoveQuestion(index)}
            >
              <Trash2Icon className="mr-2 h-4 w-4" />
              <span>Delete Question</span>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
});

// Sortable wrapper component
interface SortableQuestionCardProps extends QuestionCardProps {
  id: UniqueIdentifier;
}

export default function SortableQuestionCard(props: SortableQuestionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.id,
    // Disable transform animation for better performance with complex components
    animateLayoutChanges: () => false,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex gap-2 items-start"
      data-dragging={isDragging ? "true" : "false"}
    >
      <div
        {...attributes}
        {...listeners}
        className="mt-3 cursor-grab active:cursor-grabbing hover:bg-accent p-1 rounded shrink-0"
        style={{ pointerEvents: 'auto' }} // Keep pointer events on drag handle
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <QuestionCard {...props} />
      </div>
    </div>
  );
}