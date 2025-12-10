'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
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
import {
  Plus,
  Copy,
  ClipboardCopy,
  ClipboardPaste,
  Clipboard,
  Scissors,
  ArrowUp,
  ArrowDown,
  Hash,
  ListChecks,
  RefreshCw,
  FileDown,
  Trash2,
  Sparkles,
  Shuffle,
  MousePointerClick,
  Trash2 as Trash2Icon,
  ListTodoIcon,
  ListChecksIcon,
  TextAlignStartIcon,
  NotepadTextIcon,
  CircleSlashIcon,
  ChevronDown,
  SlidersHorizontal,
  Calendar,
  Clock,
  Upload,
  Star,
  Code,
  Heading,
  Minus,
} from 'lucide-react';
import { ExamItem, QuestionTypeOption } from '@/types/exam';

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

interface QuestionContextMenuProps {
  item: ExamItem;
  index: number;
  totalQuestions?: number;
  onUpdateQuestion: (index: number, field: keyof ExamItem, value: any) => void;
  onAddOption: (questionIndex: number) => void;
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
  selectedIndices?: number[]; // Array of selected question indices (for multi-select operations)
  children: React.ReactNode;
}

/**
 * Context menu component for question operations (duplicate, copy, cut, paste, delete, etc.)
 * Provides right-click menu functionality for question items
 * @param {QuestionContextMenuProps} props - Component props
 * @param {ExamItem} props.item - The question item
 * @param {number} props.index - Index of the question in the items array
 * @param {number} [props.totalQuestions] - Total number of questions (for validation)
 * @param {(index: number, field: keyof ExamItem, value: any) => void} props.onUpdateQuestion - Callback when question is updated
 * @param {(questionIndex: number) => void} props.onAddOption - Callback to add an option
 * @param {(index: number) => void} props.onRemoveQuestion - Callback to remove question
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
 * @param {number[]} [props.selectedIndices] - Array of selected question indices for multi-select operations
 * @param {React.ReactNode} props.children - Child elements that trigger the context menu
 * @returns {JSX.Element} Context menu wrapper component
 */
export default function QuestionContextMenu({
  item,
  index,
  totalQuestions,
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
  selectedIndices = [index], // Default to current index if not provided
  children,
}: QuestionContextMenuProps) {
  const [hasTextSelection, setHasTextSelection] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [isInTextField, setIsInTextField] = useState(false);

  // Check for text selection and input field when context menu opens
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
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
  }, []);

  // Copy selected text
  const handleCopyText = useCallback(async () => {
    if (selectedText) {
      try {
        await navigator.clipboard.writeText(selectedText);
        toast.success('Text copied to clipboard');
      } catch (error) {
        toast.error('Failed to copy text');
      }
    }
  }, [selectedText]);

  // Paste text at cursor position
  const handlePasteText = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      // Insert text at current cursor position
      document.execCommand('insertText', false, text);
      toast.success('Text pasted');
    } catch (error) {
      toast.error('Failed to paste text');
    }
  }, []);

  // Select all text
  const handleSelectAll = useCallback(() => {
    document.execCommand('selectAll', false);
    toast.success('All text selected');
  }, []);

  // Cut selected text
  const handleCutText = useCallback(async () => {
    if (selectedText) {
      try {
        await navigator.clipboard.writeText(selectedText);
        document.execCommand('delete', false);
        toast.success('Text cut to clipboard');
      } catch (error) {
        toast.error('Failed to cut text');
      }
    }
  }, [selectedText]);

  // Clear all text
  const handleClearText = useCallback(() => {
    document.execCommand('selectAll', false);
    document.execCommand('delete', false);
    toast.success('Text cleared');
  }, []);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild onContextMenu={handleContextMenu}>
        {children}
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
              <ContextMenuItem onClick={() => {
                // Duplicate all selected questions, or just the current one
                const indicesToDuplicate = selectedIndices.length > 1 ? selectedIndices : [index];
                indicesToDuplicate.forEach(idx => onDuplicateQuestion(idx));
                toast.success(`${indicesToDuplicate.length} question${indicesToDuplicate.length === 1 ? '' : 's'} duplicated`);
              }}>
                <Copy className="mr-2 h-4 w-4" />
                <span>Duplicate {selectedIndices.length > 1 ? `${selectedIndices.length} Questions` : 'Question'}</span>
              </ContextMenuItem>
            )}
            {onCopyQuestion && (
              <ContextMenuItem onClick={() => {
                // Copy all selected questions, or just the current one
                const indicesToCopy = selectedIndices.length > 1 ? selectedIndices : [index];
                onCopyQuestion(indicesToCopy);
              }}>
                <ClipboardCopy className="mr-2 h-4 w-4" />
                <span>Copy {selectedIndices.length > 1 ? `${selectedIndices.length} Questions` : 'Question'}</span>
              </ContextMenuItem>
            )}
            {onCutQuestion && (
              <ContextMenuItem onClick={() => {
                // Cut all selected questions, or just the current one
                const indicesToCut = selectedIndices.length > 1 ? selectedIndices : [index];
                onCutQuestion(indicesToCut);
              }}>
                <Scissors className="mr-2 h-4 w-4" />
                <span>Cut {selectedIndices.length > 1 ? `${selectedIndices.length} Questions` : 'Question'}</span>
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
              onClick={() => {
                // Delete all selected questions, or just the current one
                const indicesToDelete = selectedIndices.length > 1 ? selectedIndices : [index];
                // Delete in reverse order to maintain correct indices
                indicesToDelete.sort((a, b) => b - a).forEach(idx => onRemoveQuestion(idx));
                toast.success(`${indicesToDelete.length} question${indicesToDelete.length === 1 ? '' : 's'} deleted`);
              }}
            >
              <Trash2Icon className="mr-2 h-4 w-4" />
              <span>Delete {selectedIndices.length > 1 ? `${selectedIndices.length} Questions` : 'Question'}</span>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

