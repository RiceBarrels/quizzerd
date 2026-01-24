'use client';

import { useEffect, useRef, useCallback, RefObject } from 'react';
import { registerEditor } from './floating-format-dock';
import { registerMathBlots } from './math-blot';
import { cn } from '@/lib/utils';
import './text-editor.css';
import 'katex/dist/katex.min.css';
import Quill from 'quill';

// Register math blots globally
let mathBlotsRegistered = false;

export interface CollaboratorSelection {
  oditorId: string;
  index: number;
  length: number;
  userName: string;
  color: string;
}

interface TextEditorProps {
  value: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onSelectionChange?: (editorId: string, index: number, length: number) => void;
  collaboratorSelections?: CollaboratorSelection[];
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

/**
 * Rich text editor component using Quill.js with floating format dock integration
 * @param {TextEditorProps} props - Component props
 * @param {string} props.value - Current HTML content value of the editor
 * @param {(value: string) => void} [props.onChange] - Callback function called when content changes
 * @param {string} [props.placeholder="Start typing..."] - Placeholder text shown when editor is empty
 * @param {string} [props.id] - Optional unique identifier for the editor
 * @param {string} [props.className] - Optional additional CSS classes
 * @param {boolean} [props.disabled=false] - Whether the editor is disabled
 * @param {boolean} [props.error=false] - Whether to show error styling
 * @param {number} [props.minHeight] - Optional minimum height for the editor
 * @returns {JSX.Element} Text editor component with Quill.js integration
 */
export default function TextEditor({
  value,
  onChange,
  onFocus,
  onSelectionChange,
  collaboratorSelections = [],
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
  const onChangeRef = useRef(onChange);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const formatUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const selectionHighlightsRef = useRef<HTMLDivElement[]>([]);

  // Internal function to actually trigger onChange
  const triggerChange = useCallback(() => {
    const quill = quillRef.current;
    const onChangeFn = onChangeRef.current;

    if (!quill || !onChangeFn) return;

    const html = quill.root.innerHTML;
    const text = quill.getText();
    const isEmpty = ['<p><br></p>', '<p></p>', ''].includes(html) || !text.trim();
    const newValue = isEmpty ? '' : html;
    
    // Only call onChange if value actually changed
    if (newValue !== prevValueRef.current) {
      // Log only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('TextEditor handleChange:', {
          html: html?.substring(0, 100),
          text: text?.substring(0, 100),
          isEmpty,
          newValue: newValue?.substring(0, 100)
        });
      }
      
      prevValueRef.current = newValue;
      onChangeFn(newValue);
    }
  }, []);

  // Debounced change handler to prevent excessive updates
  const handleChange = useCallback(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the onChange call
    debounceTimerRef.current = setTimeout(() => {
      triggerChange();
    }, 300); // Debounce by 300ms to batch rapid changes while still being responsive
  }, [triggerChange]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  // Expose triggerChange for use in event handlers
  const triggerChangeRef = useRef(triggerChange);
  useEffect(() => {
    triggerChangeRef.current = triggerChange;
  }, [triggerChange]);

  useEffect(() => {
    let eventHandlers: EventHandler[] = [];

    const initQuill = async () => {
      if (typeof window !== 'undefined' && containerRef.current && !isInitialized.current) {
        isInitialized.current = true;

        // Register math blots once
        if (!mathBlotsRegistered) {
          registerMathBlots();
          mathBlotsRegistered = true;
        }

        const QuillModule = (await import('quill')).default;
        
        const editorContainer = document.createElement('div');
        editorContainer.className = cn('text-editor-container', disabled && 'disabled', error && 'error');
        containerRef.current.appendChild(editorContainer);

        quillRef.current = new QuillModule(editorContainer, {
          theme: 'snow',
          formats: ['bold', 'italic', 'underline', 'strike', 'code', 'link', 'blockquote', 'header', 'list', 'script', 'indent', 'direction', 'size', 'color', 'background', 'font', 'align', 'formula', 'display-formula'],
          modules: {
            toolbar: false,
            keyboard: {
              bindings: {
                enter: {
                  key: 'Enter',
                  handler: function(this: { quill: Quill }, range: { index: number; length: number }) {
                    const format = this.quill.getFormat(range);
                    
                    // Define block formats that should NOT persist to new line
                    const blockFormats = ['header', 'blockquote', 'code-block', 'list', 'align'];
                    
                    // Keep all inline formats including 'code' (inline code, not code-block)
                    const inlineFormats = Object.keys(format).reduce((acc: Record<string, any>, key) => {
                      // Preserve all formats that are not block formats
                      if (!blockFormats.includes(key)) {
                        acc[key] = format[key];
                      }
                      return acc;
                    }, {} as Record<string, any>);
                    
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
                  handler: function(this: { quill: Quill }, range: { index: number; length: number }) {
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
                  handler: function(this: { quill: Quill }, range: { index: number; length: number }) {
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
                  handler: function(this: { quill: Quill }, range: { index: number; length: number }) {
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
        
        if (!quillRef.current) return;
        
        const { handleFocus, handleBlur, updateFormats } = registerEditor(quillRef as RefObject<Quill>, editorId.current);
        
        // Debounce updateFormats to prevent excessive calls (use separate timer)
        const debouncedUpdateFormats = () => {
          if (formatUpdateTimerRef.current) {
            clearTimeout(formatUpdateTimerRef.current);
          }
          formatUpdateTimerRef.current = setTimeout(updateFormats, 50);
        };
        
        // Use Quill's text-change event instead of multiple DOM events
        // This is more efficient and prevents duplicate change handlers
        quillRef.current.on('text-change', () => {
          handleChange();
          debouncedUpdateFormats();
        });
        
        // Only listen to selection changes and focus/blur for format updates
        quillRef.current.on('selection-change', (range) => {
          if (range) {
            handleFocus();
            debouncedUpdateFormats();
            // Call onFocus callback when editor gains focus
            if (onFocus) {
              onFocus();
            }
            // Report selection change for collaboration
            if (onSelectionChangeRef.current) {
              onSelectionChangeRef.current(editorId.current, range.index, range.length);
            }
          } else {
            handleBlur({ relatedTarget: document.activeElement });
            // Clear selection when losing focus
            if (onSelectionChangeRef.current) {
              onSelectionChangeRef.current(editorId.current, 0, 0);
            }
          }
        });
        
        // Handle paste and cut separately as they need immediate processing
        const handlePaste = () => {
          handleChange();
          setTimeout(updateFormats, 20);
        };
        
        const handleCut = () => {
          handleChange();
          setTimeout(updateFormats, 20);
        };
        
        // Ensure changes are saved on blur
        const handleBlurEvent = (e: Event) => {
          // Fire any pending changes immediately on blur
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
            triggerChangeRef.current();
          }

          setTimeout(() => {
            const activeEl = document.activeElement;
            // Don't trigger blur if focus moved to the format dock or its popups
            const isInDock = activeEl?.closest('.floating-format-dock');
            const isInMathDialog = activeEl?.closest('[data-math-dialog]');
            const isInPopperWrapper = activeEl?.closest('[data-radix-popper-content-wrapper]');
            const isInRadixPopover = activeEl?.closest('[data-radix-popover-content]');
            const isInSelect = activeEl?.closest('[data-radix-select-content]');

            // Also check if there's any open radix popover in the document
            const hasOpenPopover = document.querySelector('[data-radix-popper-content-wrapper]');

            if (!el.contains(activeEl) && !isInDock && !isInMathDialog && !isInPopperWrapper && !isInRadixPopover && !isInSelect && !hasOpenPopover) {
              handleBlur({ relatedTarget: (e as FocusEvent).relatedTarget });
            }
          }, 150);
        };

        // Minimal event handlers - Quill's text-change covers most typing
        const handlers = {
          paste: handlePaste,
          cut: handleCut,
          focus: () => { handleFocus(); updateFormats(); },
          click: () => { handleFocus(); debouncedUpdateFormats(); },
          blur: handleBlurEvent
        };
        
        Object.entries(handlers).forEach(([event, handler]) => {
          el.addEventListener(event, handler);
          eventHandlers.push({ event, handler, element: el });
        });
        
        // Set initial value if provided
        if (value) {
          // Log only in development
          if (process.env.NODE_ENV === 'development') {
            console.log('Setting initial value:', value?.substring(0, 100));
          }
          const delta = quillRef.current.clipboard.convert({ html: value });
          quillRef.current.setContents(delta, 'silent');
          prevValueRef.current = value;
        }
      }
    };

    initQuill();

    return () => {
      // Clear debounce timers
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (formatUpdateTimerRef.current) {
        clearTimeout(formatUpdateTimerRef.current);
        formatUpdateTimerRef.current = null;
      }
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
      
      // Log only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('TextEditor value update:', {
          value: value?.substring(0, 100),
          currentHtml: currentHtml?.substring(0, 100),
          isEmpty,
          currentIsEmpty
        });
      }
      
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

  // Render collaborator selection highlights
  useEffect(() => {
    if (!quillRef.current || !isInitialized.current) return;

    // Clear existing highlights
    selectionHighlightsRef.current.forEach(el => el.remove());
    selectionHighlightsRef.current = [];

    const quill = quillRef.current;
    const editorRoot = quill.root;

    collaboratorSelections.forEach((selection) => {
      if (selection.length <= 0) return;

      try {
        // Get the bounds for the selection range
        const bounds = quill.getBounds(selection.index, selection.length);
        if (!bounds) return;

        // Create highlight element
        const highlight = document.createElement('div');
        highlight.className = 'collaborator-selection-highlight';
        highlight.style.cssText = `
          position: absolute;
          background-color: ${selection.color}30;
          border-left: 2px solid ${selection.color};
          pointer-events: none;
          z-index: 1;
          top: ${bounds.top}px;
          left: ${bounds.left}px;
          width: ${bounds.width}px;
          height: ${bounds.height}px;
          border-radius: 2px;
        `;

        // Add name label for longer selections
        if (selection.length > 5) {
          const label = document.createElement('div');
          label.className = 'collaborator-selection-label';
          label.textContent = selection.userName.split(' ')[0];
          label.style.cssText = `
            position: absolute;
            top: -16px;
            left: 0;
            font-size: 10px;
            padding: 1px 4px;
            border-radius: 3px;
            background-color: ${selection.color};
            color: white;
            white-space: nowrap;
            font-weight: 500;
          `;
          highlight.appendChild(label);
        }

        editorRoot.appendChild(highlight);
        selectionHighlightsRef.current.push(highlight);
      } catch (e) {
        // Ignore bounds errors for invalid ranges
      }
    });

    return () => {
      selectionHighlightsRef.current.forEach(el => el.remove());
      selectionHighlightsRef.current = [];
    };
  }, [collaboratorSelections]);

  return (
    <div 
      className={cn('text-editor-wrapper', className)} 
      ref={containerRef}
      data-editor-id={editorId.current}
    />
  );
}