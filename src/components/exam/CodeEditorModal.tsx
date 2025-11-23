'use client';

import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import CodeEditor from '@/components/editors/CodeEditor';

interface CodeEditorModalProps {
  isOpen: boolean;
  questionIndex: number | null;
  files: { name: string; content: string }[];
  onClose: () => void;
  onChange: (files: { name: string; content: string }[]) => void;
}

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
      {/* Modal Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/50">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">
            Code Editor - Question {questionIndex !== null ? questionIndex + 1 : ''}
          </h2>
          <Badge variant="secondary">
            {files.length} file(s)
          </Badge>
          <Badge variant="outline" className="text-xs font-normal">
            Press ESC to close
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          Close Editor
        </Button>
      </div>
      
      {/* Modal Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto h-full">
          <CodeEditor
            key={`modal-code-editor-${questionIndex}`}
            files={files}
            onChange={onChange}
            height="calc(100vh - 200px)"
          />
        </div>
      </div>
    </div>
  );
}

