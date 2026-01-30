'use client';

import { useEffect, useRef, useCallback, RefObject, useState } from 'react';
import { registerEditor } from './floating-format-dock';
import { registerMathBlots } from './math-blot';
import { cn } from '@/lib/utils';
import './text-editor.css';
import 'katex/dist/katex.min.css';
import Quill from 'quill';
import QuillCursors from 'quill-cursors';

// Register modules globally
let mathBlotsRegistered = false;
let cursorsRegistered = false;

export interface CollaboratorSelection {
  editorId: string;
  index: number;
  length: number;
  userName: string;
  color: string;
  isTyping?: boolean;
  message?: string;
  messageTimestamp?: number;
}

interface TextEditorProps {
  value: string;
  onChange?: (value: string) => void;
  onFocus?: () => void;
  onSelectionChange?: (editorId: string, index: number, length: number) => void;
  onActivity?: (editorId: string, isTyping: boolean) => void;
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
  onActivity,
  collaboratorSelections = [],
  placeholder = 'Start typing...',
  id,
  className,
  disabled = false,
  error = false
}: TextEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const cursorsRef = useRef<QuillCursors | null>(null);
  const isInitialized = useRef<boolean>(false);
  const editorId = useRef<string>(id || `editor-${Date.now()}`);
  const prevValueRef = useRef<string>(value);
  const observerRef = useRef<MutationObserver | null>(null);
  const onChangeRef = useRef(onChange);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onActivityRef = useRef(onActivity);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const formatUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);
  const activeCursorsRef = useRef<Set<string>>(new Set());
  // Counter to force cursor refresh after external content updates
  const [cursorRefreshCounter, setCursorRefreshCounter] = useState(0);
  // Flag to suppress onChange when applying external value updates (e.g., from collaborators)
  const isApplyingExternalUpdateRef = useRef(false);

  // Helper to normalize HTML for comparison (handles Quill's variations)
  const normalizeHtml = useCallback((html: string): string => {
    if (!html) return '';
    // Normalize common Quill HTML variations
    return html
      .replace(/\s+/g, ' ')  // Normalize whitespace
      .replace(/<p><br><\/p>/g, '<p><br></p>')  // Normalize self-closing br
      .replace(/<br\s*\/?>/g, '<br>')  // Normalize br tags
      .trim();
  }, []);

  // Check if content is truly empty (not just whitespace/newlines)
  const isContentEmpty = useCallback((html: string, text: string): boolean => {
    // Only these specific patterns are "empty"
    const emptyPatterns = ['<p><br></p>', '<p></p>', ''];
    if (emptyPatterns.includes(html)) return true;
    // Check if text is only the trailing newline Quill adds
    if (text === '\n') return true;
    return false;
  }, []);

  // Internal function to actually trigger onChange
  const triggerChange = useCallback(() => {
    const quill = quillRef.current;
    const onChangeFn = onChangeRef.current;

    if (!quill || !onChangeFn) return;

    // Skip if we're applying an external update (from collaborator)
    if (isApplyingExternalUpdateRef.current) {
      return;
    }

    const html = quill.root.innerHTML;
    const text = quill.getText();
    const isEmpty = isContentEmpty(html, text);
    const newValue = isEmpty ? '' : html;

    // Compare normalized versions to avoid false positives from HTML variations
    const normalizedNew = normalizeHtml(newValue);
    const normalizedPrev = normalizeHtml(prevValueRef.current);

    // Only call onChange if value actually changed
    if (normalizedNew !== normalizedPrev) {
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
  }, [normalizeHtml, isContentEmpty]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useEffect(() => {
    onActivityRef.current = onActivity;
  }, [onActivity]);

  // Report typing activity with cursor position
  const reportTypingActivity = useCallback((isTyping: boolean) => {
    if (isTypingRef.current !== isTyping) {
      isTypingRef.current = isTyping;

      // Get current selection to send cursor position along with typing status
      const selection = quillRef.current?.getSelection();

      if (onActivityRef.current) {
        onActivityRef.current(editorId.current, isTyping);
      }

      // Also send selection position when typing so cursor shows on other devices
      if (isTyping && selection && onSelectionChangeRef.current) {
        onSelectionChangeRef.current(editorId.current, selection.index, selection.length);
      }
    }
  }, []);

  // Debounced change handler to prevent excessive updates
  const handleChange = useCallback(() => {
    // Skip if this is from an external update (collaborator sync)
    if (isApplyingExternalUpdateRef.current) {
      return;
    }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Report that user is typing
    reportTypingActivity(true);

    // Send cursor position update so other users can see where we're typing
    const selection = quillRef.current?.getSelection();
    if (selection && onSelectionChangeRef.current) {
      onSelectionChangeRef.current(editorId.current, selection.index, selection.length);
    }

    // Clear existing typing timeout and set a new one
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    // Stop typing indicator after 2 seconds of no activity
    typingTimeoutRef.current = setTimeout(() => {
      reportTypingActivity(false);
    }, 2000);

    // Debounce the onChange call (shorter for real-time collaboration)
    debounceTimerRef.current = setTimeout(() => {
      triggerChange();
    }, 100); // Reduced from 300ms to 100ms for faster collaboration sync
  }, [triggerChange, reportTypingActivity]);

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

        // Register cursors module once
        if (!cursorsRegistered) {
          QuillModule.register('modules/cursors', QuillCursors);
          cursorsRegistered = true;
        }

        const editorContainer = document.createElement('div');
        editorContainer.className = cn('text-editor-container', disabled && 'disabled', error && 'error');
        containerRef.current.appendChild(editorContainer);

        quillRef.current = new QuillModule(editorContainer, {
          theme: 'snow',
          formats: ['bold', 'italic', 'underline', 'strike', 'code', 'link', 'blockquote', 'header', 'list', 'script', 'indent', 'direction', 'size', 'color', 'background', 'font', 'align', 'formula', 'display-formula'],
          modules: {
            toolbar: false,
            cursors: {
              template: `
                <span class="ql-cursor-selections"></span>
                <span class="ql-cursor-caret-container">
                  <span class="ql-cursor-caret"></span>
                </span>
                <span class="ql-cursor-flag">
                  <span class="ql-cursor-name"></span>
                  <span class="ql-cursor-typing-indicator"></span>
                </span>
              `,
              hideDelayMs: 0, // Never auto-hide the flag
              hideSpeedMs: 0,
              selectionChangeSource: null,
              transformOnTextChange: true,
            },
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

        // Get the cursors module for managing collaborator cursors
        cursorsRef.current = quillRef.current.getModule('cursors') as QuillCursors;

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
          // Update collaborator cursors positions after text changes (with delay to let DOM settle)
          requestAnimationFrame(() => {
            if (cursorsRef.current) {
              cursorsRef.current.update();
            }
          });
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

          // Clear typing timeout and report not typing on blur
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
          }
          if (isTypingRef.current) {
            isTypingRef.current = false;
            if (onActivityRef.current) {
              onActivityRef.current(editorId.current, false);
            }
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
          // Store what Quill actually rendered, not the incoming value
          // This ensures proper change detection for newlines and HTML variations
          prevValueRef.current = quillRef.current.root.innerHTML;
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
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      // Report not typing on unmount
      if (onActivityRef.current && isTypingRef.current) {
        onActivityRef.current(editorId.current, false);
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
      const currentText = quillRef.current.getText();
      const isEmpty = !value;
      // Use the isContentEmpty helper to properly handle newlines
      const currentIsEmpty = isContentEmpty(currentHtml, currentText);

      // Also compare normalized versions to catch HTML variations
      const normalizedValue = normalizeHtml(value || '');
      const normalizedCurrent = normalizeHtml(currentHtml);

      // Skip update if normalized values are the same (just HTML variation)
      if (normalizedValue === normalizedCurrent) {
        prevValueRef.current = value;
        return;
      }

      // Log only in development
      if (process.env.NODE_ENV === 'development') {
        console.log('TextEditor value update (external):', {
          value: value?.substring(0, 100),
          currentHtml: currentHtml?.substring(0, 100),
          isEmpty,
          currentIsEmpty,
          normalizedMatch: normalizedValue === normalizedCurrent
        });
      }

      // Mark as external update to prevent bounce-back
      isApplyingExternalUpdateRef.current = true;

      // Clear any pending debounce to avoid stale onChange calls
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      if (isEmpty && !currentIsEmpty) {
        quillRef.current.setText('', 'silent');
        prevValueRef.current = '';
        // Force cursor refresh after external content change
        requestAnimationFrame(() => {
          if (cursorsRef.current) {
            cursorsRef.current.update();
          }
          // Trigger cursor effect to re-run
          setCursorRefreshCounter(c => c + 1);
        });
      } else if (!isEmpty) {
        const selection = quillRef.current.getSelection();
        // Temporarily disconnect observer to prevent loops
        if (observerRef.current) observerRef.current.disconnect();

        // Use Quill's clipboard to properly parse HTML
        const delta = quillRef.current.clipboard.convert({ html: value });
        quillRef.current.setContents(delta, 'silent');

        // Force cursor refresh after external content change
        requestAnimationFrame(() => {
          if (cursorsRef.current) {
            cursorsRef.current.update();
          }
          // Trigger cursor effect to re-run
          setCursorRefreshCounter(c => c + 1);
        });

        // Reconnect observer
        if (observerRef.current && quillRef.current.root) {
          observerRef.current.observe(quillRef.current.root, {
            childList: true,
            subtree: true,
            characterData: true
          });
        }

        // IMPORTANT: Store what Quill actually rendered, not the incoming value
        // This prevents false change detection due to HTML normalization differences
        prevValueRef.current = quillRef.current.root.innerHTML;

        if (selection) {
          setTimeout(() => {
            try { quillRef.current?.setSelection(selection); } catch (e) {}
          }, 0);
        }
      } else {
        prevValueRef.current = value;
      }

      // Reset external update flag after a short delay
      setTimeout(() => {
        isApplyingExternalUpdateRef.current = false;
      }, 50);
    } else if (!isInitialized.current) {
      prevValueRef.current = value;
    }
  }, [value, isContentEmpty, normalizeHtml]);

  useEffect(() => {
    if (quillRef.current) {
      quillRef.current.enable(!disabled);
      containerRef.current?.querySelector('.text-editor-container')?.classList.toggle('disabled', disabled);
    }
  }, [disabled]);

  useEffect(() => {
    containerRef.current?.querySelector('.text-editor-container')?.classList.toggle('error', error);
  }, [error]);

  // Manage collaborator cursors using quill-cursors module
  useEffect(() => {
    if (!cursorsRef.current || !isInitialized.current) return;

    const cursorsModule = cursorsRef.current;
    const currentCursorIds = new Set<string>();

    // Update or create cursors for each collaborator
    collaboratorSelections.forEach((selection) => {
      const cursorId = `${selection.editorId}-${selection.userName}`;
      currentCursorIds.add(cursorId);

      try {
        // Create cursor if it doesn't exist
        if (!activeCursorsRef.current.has(cursorId)) {
          cursorsModule.createCursor(cursorId, selection.userName, selection.color);
          activeCursorsRef.current.add(cursorId);
        }

        // Move cursor to the current position
        cursorsModule.moveCursor(cursorId, { index: selection.index, length: selection.length });

        // Keep the flag visible (don't auto-hide)
        cursorsModule.toggleFlag(cursorId, true);

        // Access cursor element via quill-cursors API
        // Use type assertion to access private _el property for DOM manipulation
        const allCursors = cursorsModule.cursors();
        const cursorObj = allCursors.find((c) => c.id === cursorId);
        const cursorEl = cursorObj ? (cursorObj as unknown as { _el?: HTMLElement })._el : undefined;

        if (cursorEl) {
          // Remove hidden class if present
          cursorEl.classList.remove('hidden');

          // Add data attribute for potential CSS targeting
          cursorEl.setAttribute('data-cursor-id', cursorId);

          // Add/remove typing class
          cursorEl.classList.toggle('is-typing', !!selection.isTyping);

          // Handle message bubble
          const MESSAGE_DISPLAY_DURATION = 5000;
          const hasRecentMessage = selection.message &&
            selection.messageTimestamp &&
            (Date.now() - selection.messageTimestamp < MESSAGE_DISPLAY_DURATION);

          let messageBubble = cursorEl.querySelector('.ql-cursor-message') as HTMLElement;

          if (hasRecentMessage) {
            if (!messageBubble) {
              messageBubble = document.createElement('div');
              messageBubble.className = 'ql-cursor-message';
              cursorEl.appendChild(messageBubble);
            }
            messageBubble.textContent = selection.message!;
            messageBubble.style.backgroundColor = selection.color;
          } else if (messageBubble) {
            messageBubble.remove();
          }
        }
      } catch (e) {
        // Ignore cursor errors for invalid positions
      }
    });

    // Remove cursors that are no longer present
    activeCursorsRef.current.forEach((cursorId) => {
      if (!currentCursorIds.has(cursorId)) {
        try {
          cursorsModule.removeCursor(cursorId);
        } catch (e) {
          // Ignore removal errors
        }
        activeCursorsRef.current.delete(cursorId);
      }
    });
  }, [collaboratorSelections, cursorRefreshCounter]);

  return (
    <div 
      className={cn('text-editor-wrapper', className)} 
      ref={containerRef}
      data-editor-id={editorId.current}
    />
  );
}