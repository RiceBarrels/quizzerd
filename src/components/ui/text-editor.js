'use client';

import { useEffect, useRef, useCallback } from 'react';
import { registerEditor } from './floating-format-dock';
import { cn } from '@/lib/utils';
import './text-editor.css';

export default function TextEditor({ 
  value, 
  onChange, 
  placeholder = 'Start typing...', 
  minHeight = 64, 
  id,
  className,
  disabled = false,
  error = false
}) {
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  const isInitialized = useRef(false);
  const editorId = useRef(id || `editor-${Date.now()}`);

  const handleChange = useCallback(() => {
    if (quillRef.current) {
      const html = quillRef.current.root.innerHTML;
      if (html === '<p><br></p>') {
        onChange && onChange('');
      } else {
        onChange && onChange(html);
      }
    }
  }, [onChange]);

  useEffect(() => {
    const initQuill = async () => {
      if (typeof window !== 'undefined' && containerRef.current && !isInitialized.current) {
        isInitialized.current = true;
        
        const Quill = (await import('quill')).default;
        
        // Create editor container
        const editorContainer = document.createElement('div');
        editorContainer.className = cn(
          'text-editor-container',
          disabled && 'disabled',
          error && 'error'
        );
        containerRef.current.appendChild(editorContainer);
        
        // Initialize Quill without toolbar
        quillRef.current = new Quill(editorContainer, {
          theme: 'snow',
          modules: {
            toolbar: false // No toolbar - we use the floating dock
          },
          placeholder: placeholder,
          readOnly: disabled
        });

        // Apply custom min-height to editor
        if (quillRef.current.root) {
          quillRef.current.root.style.minHeight = `${minHeight}px`;
        }

        // Set initial content
        if (value && value !== '<p><br></p>' && value !== '') {
          quillRef.current.root.innerHTML = value;
        }

        // Handle text change
        quillRef.current.on('text-change', handleChange);
        
        // Register with floating dock
        const { handleFocus, handleBlur } = registerEditor(quillRef, editorId.current);
        quillRef.current.on('selection-change', (range) => {
          if (range) {
            handleFocus();
          } else {
            handleBlur({ relatedTarget: document.activeElement });
          }
        });
      }
    };

    initQuill();

    return () => {
      if (quillRef.current) {
        quillRef.current.off('text-change', handleChange);
        quillRef.current.off('selection-change');
      }
    };
  }, [handleChange, placeholder, minHeight, disabled]);

  // Update content when value prop changes
  useEffect(() => {
    if (quillRef.current && value !== undefined) {
      const currentHtml = quillRef.current.root.innerHTML;
      if (value !== currentHtml) {
        const selection = quillRef.current.getSelection();
        if (value && value !== '') {
          quillRef.current.root.innerHTML = value;
        } else {
          quillRef.current.setText('');
        }
        if (selection) {
          setTimeout(() => {
            quillRef.current.setSelection(selection);
          }, 0);
        }
      }
    }
  }, [value]);

  // Update disabled state
  useEffect(() => {
    if (quillRef.current) {
      quillRef.current.enable(!disabled);
      const container = containerRef.current?.querySelector('.text-editor-container');
      if (container) {
        if (disabled) {
          container.classList.add('disabled');
        } else {
          container.classList.remove('disabled');
        }
      }
    }
  }, [disabled]);

  // Update error state
  useEffect(() => {
    const container = containerRef.current?.querySelector('.text-editor-container');
    if (container) {
      if (error) {
        container.classList.add('error');
      } else {
        container.classList.remove('error');
      }
    }
  }, [error]);

  return (
    <div 
      className={cn('text-editor-wrapper', className)} 
      ref={containerRef}
      data-editor-id={editorId.current}
    />
  );
}