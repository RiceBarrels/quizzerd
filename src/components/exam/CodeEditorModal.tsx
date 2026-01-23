'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import CodeEditor from '@/components/editors/CodeEditor';

interface CodeEditorModalProps {
  isOpen: boolean;
  questionIndex: number | null;
  files: { name: string; content: string }[];
  onClose: () => void;
  onChange: (files: { name: string; content: string }[]) => void;
}

/**
 * Full-screen modal component for editing code files for a question
 * Provides a code editor interface with file management
 * @param {CodeEditorModalProps} props - Component props
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {number | null} props.questionIndex - Index of the question being edited (null if not applicable)
 * @param {{name: string; content: string}[]} props.files - Array of code files to edit
 * @param {() => void} props.onClose - Callback function called when modal is closed
 * @param {(files: {name: string; content: string}[]) => void} props.onChange - Callback when files are modified
 * @returns {JSX.Element | null} Full-screen code editor modal or null if not open
 */
export default function CodeEditorModal({
  isOpen,
  questionIndex,
  files,
  onClose,
  onChange,
}: CodeEditorModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
      {/* Title Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-sm text-foreground">
            Starter Code - Question {questionIndex !== null ? questionIndex + 1 : ''}
          </span>
          <span className="text-xs text-muted-foreground">
            {files.length} file{files.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-4">
            Press ESC to close
          </span>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1 text-sm text-foreground hover:bg-accent rounded"
          >
            <X className="h-4 w-4" />
            Close
          </button>
        </div>
      </div>

      {/* Full Screen Editor */}
      <div className="flex-1 overflow-hidden">
        <CodeEditor
          key={`modal-code-editor-${questionIndex}`}
          files={files}
          onChange={onChange}
          height="calc(100vh - 44px)"
          fullscreen
        />
      </div>
    </div>
  );
}

