'use client';

import React, { memo } from 'react';
import CodeEditor from '@/components/editors/CodeEditor';
import { EditorFile } from '@/types/editor';

interface StableCodeEditorProps {
  questionId: string;
  files: EditorFile[];
  onChange: (files: EditorFile[]) => void;
  height?: string;
}

const StableCodeEditor = memo(function StableCodeEditor({
  questionId,
  files,
  onChange,
  height = "400px"
}: StableCodeEditorProps) {
  return (
    <div
      style={{
        pointerEvents: 'auto',
        isolation: 'isolate',
        contain: 'layout style paint'
      }}
    >
      <CodeEditor
        key={`code-editor-${questionId}`}
        files={files}
        onChange={onChange}
        height={height}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent re-render during drag
  // Only re-render if files content actually changed
  if (prevProps.questionId !== nextProps.questionId) return false;
  if (prevProps.height !== nextProps.height) return false;
  if (prevProps.files.length !== nextProps.files.length) return false;

  // Deep compare files content
  for (let i = 0; i < prevProps.files.length; i++) {
    const prevFile = prevProps.files[i];
    const nextFile = nextProps.files[i];
    if (prevFile.name !== nextFile.name || prevFile.content !== nextFile.content) {
      return false;
    }
  }

  return true; // Props are equal, don't re-render
});

export default StableCodeEditor;