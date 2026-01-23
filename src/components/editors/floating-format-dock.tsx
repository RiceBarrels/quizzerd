'use client';

import { useEffect, useState, useRef, useCallback, RefObject, Dispatch, SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Link,
  Image,
  Code,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Highlighter,
  Eraser,
  ChevronDown,
  MoreHorizontal,
  Minus,
  Plus,
  LucideIcon,
  Sigma
} from 'lucide-react';
import MathDialog from './math-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import Quill from 'quill';

interface EditorInstance {
  ref: RefObject<Quill>;
  id: string;
}

interface DockInstance {
  setActiveEditor: Dispatch<SetStateAction<EditorInstance | null>> | null;
  activeEditor: EditorInstance | null;
  updateFormats: (() => void) | null;
  hideTimeout?: NodeJS.Timeout;
  isPopoverOpen?: boolean;
}

// Singleton instance to manage the dock globally
let dockInstance: DockInstance | null = null;

/**
 * Custom hook for managing the floating format dock state
 * Provides access to the active editor and update trigger for format synchronization
 * @returns {Object} Object containing activeEditor and updateTrigger state
 */
export function useFloatingDock() {
  const [activeEditor, setActiveEditor] = useState<EditorInstance | null>(null);
  const [updateTrigger, setUpdateTrigger] = useState<number>(0);

  useEffect(() => {
    if (!dockInstance) {
      dockInstance = {
        setActiveEditor,
        activeEditor: null,
        updateFormats: () => setUpdateTrigger(prev => prev + 1)
      };
    } else {
      dockInstance.setActiveEditor = setActiveEditor;
      dockInstance.updateFormats = () => setUpdateTrigger(prev => prev + 1);
    }

    return () => {
      if (dockInstance?.setActiveEditor === setActiveEditor) {
        dockInstance.setActiveEditor = null;
        dockInstance.updateFormats = null;
      }
    };
  }, []);

  return { activeEditor, updateTrigger };
}

/**
 * Registers a Quill editor instance with the floating format dock
 * Sets up focus and blur handlers to manage the active editor state
 * @param {RefObject<Quill>} editorRef - React ref to the Quill editor instance
 * @param {string} editorId - Unique identifier for the editor
 * @returns {Object} Object containing event handlers (handleFocus, handleBlur, updateFormats)
 */
export function registerEditor(editorRef: RefObject<Quill>, editorId: string) {
  const handleFocus = () => {
    if (dockInstance?.setActiveEditor) {
      dockInstance.activeEditor = { ref: editorRef, id: editorId };
      dockInstance.setActiveEditor({ ref: editorRef, id: editorId });
    }
  };
  
  const handleBlur = (e: { relatedTarget?: EventTarget | null }) => {
    // Don't hide if a popover is open
    if (dockInstance?.isPopoverOpen) {
      return;
    }

    // Don't hide if clicking within the dock, its popovers, select dropdowns, context menus, or math dialog
    const relatedTarget = e?.relatedTarget as Element | null;
    if (!relatedTarget?.closest('.floating-format-dock') &&
        !relatedTarget?.closest('[role="dialog"]') &&
        !relatedTarget?.closest('[data-radix-select-content]') &&
        !relatedTarget?.closest('[data-radix-popover-content]') &&
        !relatedTarget?.closest('[data-radix-context-menu-content]') &&
        !relatedTarget?.closest('[data-slot="context-menu"]') &&
        !relatedTarget?.closest('[data-math-dialog]') &&
        !relatedTarget?.closest('[data-radix-popper-content-wrapper]')) {
      const timeoutId = setTimeout(() => {
        // Don't hide if a popover is open
        if (dockInstance?.isPopoverOpen) {
          return;
        }

        // Double check that focus hasn't returned to dock, editor, select, popover, context menu, or math dialog
        const activeEl = document.activeElement;
        const isInDock = activeEl?.closest('.floating-format-dock');
        const isInPopover = activeEl?.closest('[role="dialog"]');
        const isInEditor = activeEl?.closest('.ql-editor');
        const isInSelect = activeEl?.closest('[data-radix-select-content]');
        const isInRadixPopover = activeEl?.closest('[data-radix-popover-content]');
        const isInContextMenu = activeEl?.closest('[data-radix-context-menu-content]');
        const isInTextEditor = activeEl?.closest('.text-editor-wrapper');
        const isInMathDialog = activeEl?.closest('[data-math-dialog]');
        const isInPopperWrapper = activeEl?.closest('[data-radix-popper-content-wrapper]');

        if (!isInDock && !isInPopover && !isInEditor && !isInSelect &&
            !isInRadixPopover && !isInContextMenu && !isInTextEditor &&
            !isInMathDialog && !isInPopperWrapper) {
          if (dockInstance?.activeEditor?.id === editorId) {
            dockInstance.activeEditor = null;
            dockInstance.setActiveEditor?.(null);
          }
        }
      }, 300); // Increased timeout for better stability
      
      // Store timeout ID so it can be cancelled
      if (dockInstance) {
        dockInstance.hideTimeout = timeoutId;
      }
    }
  };
  
  const updateFormats = () => {
    if (dockInstance?.updateFormats) {
      dockInstance.updateFormats();
    }
  };
  
  return { handleFocus, handleBlur, updateFormats };
}

/**
 * Floating format dock component that provides formatting tools for active text editors
 * Appears when a text editor is focused and provides formatting options like bold, italic, colors, etc.
 * @returns {JSX.Element} Floating format dock UI component
 */
export default function FloatingFormatDock() {
  const { activeEditor, updateTrigger } = useFloatingDock();
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [activeFormats, setActiveFormats] = useState<Record<string, any>>({});
  const [fontSize, setFontSize] = useState<number>(16);
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [textColor, setTextColor] = useState<string>('#000000');
  const [bgColor, setBgColor] = useState<string>('#FFFF00');
  const [showLinkDialog, setShowLinkDialog] = useState<boolean>(false);
  const [showImageDialog, setShowImageDialog] = useState<boolean>(false);
  const [showColorDialog, setShowColorDialog] = useState<boolean>(false);
  const [showBgColorDialog, setShowBgColorDialog] = useState<boolean>(false);
  const [showMathDialog, setShowMathDialog] = useState<boolean>(false);
  const [showAlignPopover, setShowAlignPopover] = useState<boolean>(false);
  const [showMorePopover, setShowMorePopover] = useState<boolean>(false);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const updateFormatsTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
      // Cleanup timer on unmount
      if (updateFormatsTimerRef.current) {
        clearTimeout(updateFormatsTimerRef.current);
        updateFormatsTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Always show the dock, update formats when editor changes
    setIsVisible(true);
    if (activeEditor?.ref?.current) {
      updateActiveFormats();
    }
  }, [activeEditor, updateTrigger]);

  const updateActiveFormats = useCallback((skipSizeUpdate = false) => {
    // Clear existing timer
    if (updateFormatsTimerRef.current) {
      clearTimeout(updateFormatsTimerRef.current);
    }
    
    // Debounce format updates
    updateFormatsTimerRef.current = setTimeout(() => {
      if (activeEditor?.ref?.current) {
        const selection = activeEditor.ref.current.getSelection();
        if (selection) {
          const formats = activeEditor.ref.current.getFormat(selection);
          setActiveFormats(formats);
          
          // Update font size state based on current selection (unless we're actively changing it)
          if (!skipSizeUpdate) {
            if (formats.size) {
              // Extract number from size string (e.g., "18px" -> 18)
              const sizeNum = parseInt(String(formats.size));
              if (!isNaN(sizeNum)) {
                setFontSize(sizeNum);
              }
            } else {
              // Reset to default if no size is set
              setFontSize(16);
            }
          }
        }
      }
    }, 100); // Debounce by 100ms
  }, [activeEditor]);

  const applyFormat = useCallback((format: string, value: any = true) => {
    if (activeEditor?.ref?.current) {
      const quill = activeEditor.ref.current;
      const selection = quill.getSelection();
      
      if (!selection) {
        quill.focus();
        return;
      }

      if (format === 'header') {
        const currentHeader = activeFormats.header;
        if (currentHeader === value) {
          quill.format('header', false);
        } else {
          quill.format('header', value);
        }
      } else if (format === 'clean') {
        quill.removeFormat(selection.index, selection.length);
      } else if (format === 'link') {
        const currentLink = quill.getFormat(selection).link;
        if (currentLink) {
          quill.format('link', false);
        } else {
          // Will be handled by dialog
          setShowLinkDialog(true);
        }
      } else if (format === 'image') {
        // Will be handled by dialog
        setShowImageDialog(true);
      } else if (format === 'size') {
        if (value === 'default' || value === false) {
          quill.format('size', false);
          setFontSize(16); // Reset to default
        } else {
          // Check if value already includes 'px' or is a number
          const sizeValue = typeof value === 'number' ? value + 'px' : value;
          quill.format('size', sizeValue);
          // Update the font size state
          if (typeof value === 'number') {
            setFontSize(value);
          } else {
            const num = parseInt(value);
            if (!isNaN(num)) {
              setFontSize(num);
            }
          }
        }
      } else if (format === 'color') {
        if (value && value !== true) {
          quill.format('color', value);
        } else {
          setShowColorDialog(true);
        }
      } else if (format === 'background') {
        if (value && value !== true) {
          quill.format('background', value);
        } else {
          setShowBgColorDialog(true);
        }
      } else if (format === 'list') {
        // Toggle list format
        const currentList = activeFormats.list;
        if (currentList === value) {
          quill.format('list', false);
        } else {
          quill.format('list', value);
        }
      } else if (format === 'align') {
        // Toggle alignment
        const currentAlign = activeFormats.align;
        if (currentAlign === value || (value === false && !currentAlign)) {
          quill.format('align', false);
        } else {
          quill.format('align', value);
        }
      } else if (format === 'blockquote') {
        // Toggle blockquote format
        const currentValue = activeFormats.blockquote;
        if (currentValue) {
          quill.format('blockquote', false);
        } else {
          quill.format('blockquote', true);
        }
      } else if (format === 'code') {
        // Toggle inline code format
        const currentValue = activeFormats.code;
        if (currentValue) {
          quill.format('code', false);
        } else {
          quill.format('code', true);
        }
      } else if (format === 'code-block') {
        // Toggle code block format
        const currentValue = activeFormats['code-block'];
        if (currentValue) {
          quill.format('code-block', false);
        } else {
          quill.format('code-block', true);
        }
      } else {
        // For basic formats like bold, italic, underline, strike
        const currentValue = activeFormats[format];
        if (currentValue === value || currentValue === true) {
          quill.format(format, false);
        } else {
          quill.format(format, value);
        }
      }
      
      // Small delay to ensure Quill has applied the format
      // Skip size update when we just changed the size
      updateActiveFormats(format === 'size');

      // Refocus the editor after applying format
      setTimeout(() => {
        quill.focus();
      }, 10);
    }
  }, [activeEditor, activeFormats, updateActiveFormats]);

  const applyLink = () => {
    if (activeEditor?.ref?.current && linkUrl) {
      const quill = activeEditor.ref.current;
      quill.format('link', linkUrl);
      setLinkUrl('');
      setShowLinkDialog(false);
      updateActiveFormats();
      // Refocus the editor
      setTimeout(() => quill.focus(), 10);
    }
  };

  const insertImage = () => {
    if (activeEditor?.ref?.current && imageUrl) {
      const quill = activeEditor.ref.current;
      const range = quill.getSelection();
      if (range) {
        quill.insertEmbed(range.index, 'image', imageUrl);
        setImageUrl('');
        setShowImageDialog(false);
        // Refocus the editor
        setTimeout(() => quill.focus(), 10);
      }
    }
  };

  const insertFormula = (formula: string, displayMode: boolean) => {
    if (activeEditor?.ref?.current && formula) {
      const quill = activeEditor.ref.current;
      const range = quill.getSelection();
      if (range) {
        const blotName = displayMode ? 'display-formula' : 'formula';
        quill.insertEmbed(range.index, blotName, formula);
        quill.setSelection(range.index + 1);
        setShowMathDialog(false);
        // Refocus the editor
        setTimeout(() => quill.focus(), 10);
      }
    }
  };

  // Prevent mousedown from stealing focus from the editor for non-interactive elements
  const preventFocusLoss = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('input, textarea, button, [role="button"], [role="tab"], [role="checkbox"], [type="color"]');
    if (!isInteractive) {
      e.preventDefault();
    }
    // Cancel any pending hide timeout
    if (dockInstance?.hideTimeout) {
      clearTimeout(dockInstance.hideTimeout);
      dockInstance.hideTimeout = undefined;
    }
  };

  const FormatButton = ({ format, icon: Icon, title, formatValue, className }: any) => {
    const isPressed = formatValue !== undefined ? activeFormats[format] === formatValue : activeFormats[format];
    
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={isPressed}
              onPressedChange={() => applyFormat(format, formatValue)}
              aria-label={title}
              className={cn(
                "h-8 w-8 p-0 transition-all",
                isPressed && "bg-primary text-primary-foreground hover:bg-primary/90",
                className
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </Toggle>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>{title}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const dockContent = (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={dockRef}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="floating-format-dock fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] flex items-center gap-1 bg-background/95 backdrop-blur-sm border rounded-lg px-2 py-1 shadow-lg"
          style={{ isolation: 'isolate' }}
          onMouseDown={(e) => {
            e.preventDefault();
            // Cancel any pending hide timeout
            if (dockInstance?.hideTimeout) {
              clearTimeout(dockInstance.hideTimeout);
              dockInstance.hideTimeout = undefined;
            }
          }}
          onClick={() => {
            // Keep dock visible and re-focus the editor if needed
            if (dockInstance?.hideTimeout) {
              clearTimeout(dockInstance.hideTimeout);
              dockInstance.hideTimeout = undefined;
            }
            // Ensure editor stays active
            if (activeEditor?.ref?.current) {
              activeEditor.ref.current.focus();
            }
          }}
          onFocus={() => {
            // Cancel hide when dock gains focus
            if (dockInstance?.hideTimeout) {
              clearTimeout(dockInstance.hideTimeout);
              dockInstance.hideTimeout = undefined;
            }
          }}
          onMouseEnter={() => {
            // Cancel hide when mouse enters dock
            if (dockInstance?.hideTimeout) {
              clearTimeout(dockInstance.hideTimeout);
              dockInstance.hideTimeout = undefined;
            }
          }}
        >
          {/* Basic formatting */}
          <div className="flex items-center gap-0.5">
            <FormatButton format="bold" icon={Bold} title="Bold (Ctrl+B)" />
            <FormatButton format="italic" icon={Italic} title="Italic (Ctrl+I)" />
            <FormatButton format="underline" icon={Underline} title="Underline (Ctrl+U)" />
            <FormatButton format="strike" icon={Strikethrough} title="Strikethrough" />
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Quote, Code, and Math buttons */}
          <div className="flex items-center gap-0.5">
            <FormatButton format="blockquote" icon={Quote} title="Quote" />
            <FormatButton format="code" icon={Code} title="Inline Code" />
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => setShowMathDialog(true)}
                    aria-label="Insert Math Formula"
                  >
                    <Sigma className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p>Math Formula</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <MathDialog
              open={showMathDialog}
              onOpenChange={setShowMathDialog}
              onInsert={insertFormula}
            />
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Text type select */}
          <Select
            value={
              activeFormats.header === 1 ? 'h1' :
              activeFormats.header === 2 ? 'h2' :
              activeFormats.header === 3 ? 'h3' :
              'normal'
            }
            onOpenChange={(open) => {
              // Cancel hide timeout when select opens
              if (open && dockInstance?.hideTimeout) {
                clearTimeout(dockInstance.hideTimeout);
                dockInstance.hideTimeout = undefined;
              }
            }}
            onValueChange={(value) => {
              // First clear all text style formats
              applyFormat('header', false);
              
              // Then apply the selected format
              switch(value) {
                case 'normal':
                  // Already cleared above
                  break;
                case 'h1':
                  applyFormat('header', 1);
                  break;
                case 'h2':
                  applyFormat('header', 2);
                  break;
                case 'h3':
                  applyFormat('header', 3);
                  break;
              }
              // Keep editor focused after selection
              if (activeEditor?.ref?.current) {
                setTimeout(() => {
                  activeEditor.ref.current?.focus();
                }, 50);
              }
            }}
          >
            <SelectTrigger className="h-8 w-32">
              <SelectValue placeholder="Normal" />
            </SelectTrigger>
            <SelectContent className="z-[100000]">
              <SelectItem value="normal">
                <span className="flex items-center gap-2">
                  <Type className="h-3.5 w-3.5" />
                  Normal
                </span>
              </SelectItem>
              <SelectItem value="h1">
                <span className="flex items-center gap-2">
                  <Heading1 className="h-4 w-4" />
                  Heading 1
                </span>
              </SelectItem>
              <SelectItem value="h2">
                <span className="flex items-center gap-2">
                  <Heading2 className="h-3.5 w-3.5" />
                  Heading 2
                </span>
              </SelectItem>
              <SelectItem value="h3">
                <span className="flex items-center gap-2">
                  <Heading3 className="h-3 w-3" />
                  Heading 3
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Lists */}
          <div className="flex items-center gap-0.5">
            <FormatButton format="list" icon={List} title="Bullet List" formatValue="bullet" />
            <FormatButton format="list" icon={ListOrdered} title="Numbered List" formatValue="ordered" />
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Alignment popup */}
          <Popover open={showAlignPopover} onOpenChange={setShowAlignPopover} modal={false}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-2 gap-1"
                aria-label="Alignment"
              >
                <AlignLeft className="h-3.5 w-3.5" />
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-36 p-1"
              onMouseDown={preventFocusLoss}
              onInteractOutside={(e) => e.preventDefault()}
              onPointerDownOutside={(e) => e.preventDefault()}
            >
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  variant={!activeFormats.align ? "secondary" : "ghost"}
                  onClick={() => applyFormat('align', false)}
                  className="justify-start h-8 px-2"
                >
                  <AlignLeft className="h-3.5 w-3.5 mr-2" />
                  Align Left
                </Button>
                <Button
                  size="sm"
                  variant={activeFormats.align === 'center' ? "secondary" : "ghost"}
                  onClick={() => applyFormat('align', 'center')}
                  className="justify-start h-8 px-2"
                >
                  <AlignCenter className="h-3.5 w-3.5 mr-2" />
                  Center
                </Button>
                <Button
                  size="sm"
                  variant={activeFormats.align === 'right' ? "secondary" : "ghost"}
                  onClick={() => applyFormat('align', 'right')}
                  className="justify-start h-8 px-2"
                >
                  <AlignRight className="h-3.5 w-3.5 mr-2" />
                  Align Right
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="h-6" />

          {/* More options popup */}
          <Popover open={showMorePopover} onOpenChange={setShowMorePopover} modal={false}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                aria-label="More Options"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-44 p-1"
              onMouseDown={preventFocusLoss}
              onInteractOutside={(e) => e.preventDefault()}
              onPointerDownOutside={(e) => e.preventDefault()}
            >
              <div className="flex flex-col gap-1">
                {/* Link Dialog */}
                <Popover open={showLinkDialog} onOpenChange={setShowLinkDialog} modal={false}>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowLinkDialog(true);
                      }}
                      className="justify-start h-8 px-2"
                    >
                      <Link className="h-3.5 w-3.5 mr-2" />
                      Insert Link
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-80"
                    side="left"
                    onMouseDown={preventFocusLoss}
                    onInteractOutside={(e) => e.preventDefault()}
                    onPointerDownOutside={(e) => e.preventDefault()}
                  >
                    <div className="space-y-2">
                      <Label className="text-xs">URL</Label>
                      <Input
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="h-8"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') applyLink();
                        }}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={applyLink} className="h-8">
                          Apply
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowLinkDialog(false)} className="h-8">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Image Dialog */}
                <Popover open={showImageDialog} onOpenChange={setShowImageDialog} modal={false}>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowImageDialog(true);
                      }}
                      className="justify-start h-8 px-2"
                    >
                      <Image className="h-3.5 w-3.5 mr-2" />
                      Insert Image
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-80"
                    side="left"
                    onMouseDown={preventFocusLoss}
                    onInteractOutside={(e) => e.preventDefault()}
                    onPointerDownOutside={(e) => e.preventDefault()}
                  >
                    <div className="space-y-2">
                      <Label className="text-xs">Image URL</Label>
                      <Input
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="h-8"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') insertImage();
                        }}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={insertImage} className="h-8">
                          Insert
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowImageDialog(false)} className="h-8">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Separator />

                {/* Background Color Dialog */}
                <Popover open={showBgColorDialog} onOpenChange={setShowBgColorDialog} modal={false}>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant={activeFormats.background ? "secondary" : "ghost"}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowBgColorDialog(true);
                      }}
                      className="justify-start h-8 px-2"
                    >
                      <Highlighter className="h-3.5 w-3.5 mr-2" />
                      Highlight
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-64"
                    side="left"
                    onMouseDown={preventFocusLoss}
                    onInteractOutside={(e) => e.preventDefault()}
                    onPointerDownOutside={(e) => e.preventDefault()}
                  >
                    <div className="space-y-2">
                      <Label className="text-xs">Background Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={bgColor}
                          onChange={(e) => {
                            setBgColor(e.target.value);
                            applyFormat('background', e.target.value + '50');
                            setTimeout(() => setShowBgColorDialog(false), 100);
                          }}
                          className="h-8 w-16"
                        />
                        <Input
                          value={bgColor}
                          onChange={(e) => setBgColor(e.target.value)}
                          placeholder="#FFFF00"
                          className="h-8 flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && bgColor) {
                              applyFormat('background', bgColor + '50');
                              setShowBgColorDialog(false);
                            }
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-8 gap-1">
                        {['#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#FFA500', '#FF0000', '#0000FF', '#808080'].map(color => (
                          <Button
                            key={color}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              setBgColor(color);
                              applyFormat('background', color + '50');
                              setShowBgColorDialog(false);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Text Color Dialog */}
                <Popover open={showColorDialog} onOpenChange={setShowColorDialog} modal={false}>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant={activeFormats.color ? "secondary" : "ghost"}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowColorDialog(true);
                      }}
                      className="justify-start h-8 px-2"
                    >
                      <Palette className="h-3.5 w-3.5 mr-2" />
                      Text Color
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-64"
                    side="left"
                    onMouseDown={preventFocusLoss}
                    onInteractOutside={(e) => e.preventDefault()}
                    onPointerDownOutside={(e) => e.preventDefault()}
                  >
                    <div className="space-y-2">
                      <Label className="text-xs">Text Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={textColor}
                          onChange={(e) => {
                            setTextColor(e.target.value);
                            applyFormat('color', e.target.value);
                            setTimeout(() => setShowColorDialog(false), 100);
                          }}
                          className="h-8 w-16"
                        />
                        <Input
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          placeholder="#000000"
                          className="h-8 flex-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && textColor) {
                              applyFormat('color', textColor);
                              setShowColorDialog(false);
                            }
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-8 gap-1">
                        {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#808080'].map(color => (
                          <Button
                            key={color}
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              setTextColor(color);
                              applyFormat('color', color);
                              setShowColorDialog(false);
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
                <Separator />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => applyFormat('clean')}
                  className="justify-start h-8 px-2 text-destructive"
                >
                  <Eraser className="h-3.5 w-3.5 mr-2" />
                  Clear Format
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Use portal to render at document body level to avoid clipping by overflow containers
  if (!mounted) return null;
  return createPortal(dockContent, document.body);
}