'use client';

import { useEffect, useRef, useCallback } from 'react';
import { registerEditor } from './floating-format-dock';
import { cn } from '@/lib/utils';
import './text-editor.css';
import Quill from 'quill';

interface TextEditorProps {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  minHeight?: number;
}

interface EventHandler {
  event: string;
  handler: EventListener;
  element: HTMLElement;
}

export default function TextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  id,
  className,
  disabled = false,
  error = false
}: TextEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const isInitialized = useRef<boolean>(false);
  const editorId = useRef<string>(id || `editor-${Date.now()}`);
  const prevValueRef = useRef<string>(value);
  const observerRef = useRef<MutationObserver | null>(null);

  const handleChange = useCallback(() => {
    if (!quillRef.current || !onChange) return;
    
    const html = quillRef.current.root.innerHTML;
    const text = quillRef.current.getText();
    const isEmpty = ['<p><br></p>', '<p></p>', ''].includes(html) || !text.trim();
    const newValue = isEmpty ? '' : html;
    
    console.log('TextEditor handleChange:', {
      html: html?.substring(0, 100),
      text: text?.substring(0, 100),
      isEmpty,
      newValue: newValue?.substring(0, 100)
    });
    
    prevValueRef.current = newValue;
    onChange(newValue);
  }, [onChange]);

  useEffect(() => {
    let eventHandlers: EventHandler[] = [];

    const initQuill = async () => {
      if (typeof window !== 'undefined' && containerRef.current && !isInitialized.current) {
        isInitialized.current = true;

        const QuillModule = (await import('quill')).default;
        
        const editorContainer = document.createElement('div');
        editorContainer.className = cn('text-editor-container', disabled && 'disabled', error && 'error');
        containerRef.current.appendChild(editorContainer);

        quillRef.current = new QuillModule(editorContainer, {
          theme: 'snow',
          formats: ['bold', 'italic', 'underline', 'strike', 'code', 'link', 'blockquote', 'header', 'list', 'script', 'indent', 'direction', 'size', 'color', 'background', 'font', 'align'],
          modules: {
            toolbar: false,
            keyboard: {
              bindings: {
                enter: {
                  key: 'Enter',
                  handler: function(range) {
                    const format = this.quill.getFormat(range);
                    
                    // Define block formats that should NOT persist to new line
                    const blockFormats = ['header', 'blockquote', 'code-block', 'list', 'align'];
                    
                    // Keep all inline formats including 'code' (inline code, not code-block)
                    const inlineFormats = Object.keys(format).reduce((acc, key) => {
                      // Preserve all formats that are not block formats
                      if (!blockFormats.includes(key)) {
                        acc[key] = format[key];
                      }
                      return acc;
                    }, {});
                    
                    // Insert a newline
                    this.quill.insertText(range.index, '\n');
                    
                    // If there are inline formats to preserve
                    if (Object.keys(inlineFormats).length > 0) {
                      // Insert a zero-width space to maintain formatting
                      this.quill.insertText(range.index + 1, '\u200B', inlineFormats);
                      // Set selection after the zero-width space
                      this.quill.setSelection(range.index + 2);
                      // Delete the zero-width space but cursor stays formatted
                      setTimeout(() => {
                        const currentRange = this.quill.getSelection();
                        if (currentRange && currentRange.index > 0) {
                          const prevChar = this.quill.getText(currentRange.index - 1, 1);
                          if (prevChar === '\u200B') {
                            this.quill.deleteText(currentRange.index - 1, 1);
                          }
                        }
                      }, 0);
                    } else {
                      // No formats to preserve, move cursor normally
                      this.quill.setSelection(range.index + 1);
                    }
                    
                    return false;
                  }
                },
                'shift enter': {
                  key: 'Enter',
                  shiftKey: true,
                  handler: function(range) {
                    const format = this.quill.getFormat(range);
                    
                    // Insert newline
                    this.quill.insertText(range.index, '\n');
                    
                    // Move cursor to new line
                    this.quill.setSelection(range.index + 1);
                    
                    // Apply ALL formats (including block formats) with Shift+Enter
                    Object.entries(format).forEach(([formatName, formatValue]) => {
                      this.quill.format(formatName, formatValue);
                    });
                    
                    return false;
                  }
                },
                'tab': {
                  key: 'Tab',
                  handler: function(range) {
                    // Insert two non-breaking spaces instead of tab
                    this.quill.insertText(range.index, '\u00A0\u00A0');
                    // Move cursor after the spaces
                    this.quill.setSelection(range.index + 2);
                    return false;
                  }
                },
                'shift tab': {
                  key: 'Tab',
                  shiftKey: true,
                  handler: function(range) {
                    // Check if there are two non-breaking spaces before cursor that we can remove
                    if (range.index >= 2) {
                      const prevText = this.quill.getText(range.index - 2, 2);
                      if (prevText === '\u00A0\u00A0' || prevText === '  ') {
                        this.quill.deleteText(range.index - 2, 2);
                        this.quill.setSelection(range.index - 2);
                      }
                    }
                    return false;
                  }
                }
              }
            }
          },
          placeholder,
          readOnly: disabled
        });
        
        const el = quillRef.current.root;
        const delayedChange = () => setTimeout(handleChange, 10);
        
        const { handleFocus, handleBlur, updateFormats } = registerEditor(quillRef, editorId.current);
        
        // Add MutationObserver for better change detection
        observerRef.current = new MutationObserver(handleChange);
        observerRef.current.observe(el, {
          childList: true,
          subtree: true,
          characterData: true
        });
        
        const handlers = {
          keyup: () => { handleChange(); updateFormats(); },
          keydown: updateFormats,
          mouseup: updateFormats,
          mousedown: updateFormats,
          input: handleChange,
          paste: () => { delayedChange(); setTimeout(updateFormats, 20); },
          cut: () => { delayedChange(); setTimeout(updateFormats, 20); },
          focus: () => { handleFocus(); updateFormats(); },
          click: () => { handleFocus(); updateFormats(); },
          blur: (e) => setTimeout(() => !el.contains(document.activeElement) && handleBlur({ relatedTarget: e.relatedTarget }), 100)
        };
        
        Object.entries(handlers).forEach(([event, handler]) => {
          el.addEventListener(event, handler);
          eventHandlers.push({ event, handler, element: el });
        });
        
        quillRef.current.on('selection-change', (range) => {
          range ? (handleFocus(), updateFormats()) : handleBlur({ relatedTarget: document.activeElement });
        });
        
        quillRef.current.on('text-change', () => {
          updateFormats();
        });
        
        // Set initial value if provided
        if (value) {
          console.log('Setting initial value:', value?.substring(0, 100));
          const delta = quillRef.current.clipboard.convert({ html: value });
          quillRef.current.setContents(delta, 'silent');
          prevValueRef.current = value;
        }
      }
    };

    initQuill();

    return () => {
      if (quillRef.current) {
        quillRef.current.off('text-change');
        quillRef.current.off('selection-change');
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      eventHandlers.forEach(({ event, handler, element }) => {
        element.removeEventListener(event, handler);
      });
    };
  }, [handleChange, placeholder, disabled, id]);
  
  useEffect(() => {
    if (quillRef.current && isInitialized.current && value !== prevValueRef.current) {
      const currentHtml = quillRef.current.root.innerHTML;
      const isEmpty = !value;
      const currentIsEmpty = ['<p><br></p>', '<p></p>', ''].includes(currentHtml) || !quillRef.current.getText().trim();
      
      console.log('TextEditor value update:', {
        value: value?.substring(0, 100),
        currentHtml: currentHtml?.substring(0, 100),
        isEmpty,
        currentIsEmpty
      });
      
      if (isEmpty && !currentIsEmpty) {
        quillRef.current.setText('');
      } else if (!isEmpty && value !== currentHtml) {
        const selection = quillRef.current.getSelection();
        // Temporarily disconnect observer to prevent loops
        if (observerRef.current) observerRef.current.disconnect();
        
        // Use Quill's clipboard to properly parse HTML
        const delta = quillRef.current.clipboard.convert({ html: value });
        quillRef.current.setContents(delta, 'silent');
        
        // Reconnect observer
        if (observerRef.current && quillRef.current.root) {
          observerRef.current.observe(quillRef.current.root, {
            childList: true,
            subtree: true,
            characterData: true
          });
        }
        
        if (selection) {
          setTimeout(() => {
            try { quillRef.current?.setSelection(selection); } catch (e) {}
          }, 0);
        }
      }
      prevValueRef.current = value;
    } else if (!isInitialized.current) {
      prevValueRef.current = value;
    }
  }, [value]);

  useEffect(() => {
    if (quillRef.current) {
      quillRef.current.enable(!disabled);
      containerRef.current?.querySelector('.text-editor-container')?.classList.toggle('disabled', disabled);
    }
  }, [disabled]);

  useEffect(() => {
    containerRef.current?.querySelector('.text-editor-container')?.classList.toggle('error', error);
  }, [error]);

  return (
    <div 
      className={cn('text-editor-wrapper', className)} 
      ref={containerRef}
      data-editor-id={editorId.current}
    />
  );
}