'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  X,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Singleton instance to manage the dock globally
let dockInstance = null;

export function useFloatingDock() {
  const [activeEditor, setActiveEditor] = useState(null);
  
  useEffect(() => {
    if (!dockInstance) {
      dockInstance = {
        setActiveEditor,
        activeEditor: null
      };
    } else {
      dockInstance.setActiveEditor = setActiveEditor;
    }
    
    return () => {
      if (dockInstance?.setActiveEditor === setActiveEditor) {
        dockInstance.setActiveEditor = null;
      }
    };
  }, []);
  
  return { activeEditor };
}

export function registerEditor(editorRef, editorId) {
  const handleFocus = () => {
    if (dockInstance?.setActiveEditor) {
      dockInstance.activeEditor = { ref: editorRef, id: editorId };
      dockInstance.setActiveEditor({ ref: editorRef, id: editorId });
    }
  };
  
  const handleBlur = (e) => {
    // Don't hide if clicking within the dock
    if (!e.relatedTarget?.closest('.floating-format-dock')) {
      setTimeout(() => {
        if (dockInstance?.activeEditor?.id === editorId) {
          dockInstance.activeEditor = null;
          dockInstance.setActiveEditor?.(null);
        }
      }, 200);
    }
  };
  
  return { handleFocus, handleBlur };
}

export default function FloatingFormatDock() {
  const { activeEditor } = useFloatingDock();
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeFormats, setActiveFormats] = useState({});
  const dockRef = useRef(null);

  useEffect(() => {
    setIsVisible(!!activeEditor);
    if (activeEditor?.ref?.current) {
      updateActiveFormats();
    }
  }, [activeEditor]);

  const updateActiveFormats = useCallback(() => {
    if (activeEditor?.ref?.current) {
      const selection = activeEditor.ref.current.getSelection();
      if (selection) {
        const formats = activeEditor.ref.current.getFormat(selection);
        setActiveFormats(formats);
      }
    }
  }, [activeEditor]);

  const applyFormat = useCallback((format, value = true) => {
    if (activeEditor?.ref?.current) {
      const quill = activeEditor.ref.current;
      const selection = quill.getSelection();
      
      if (!selection) {
        quill.focus();
        return;
      }

      if (format === 'header') {
        const currentHeader = quill.getFormat(selection).header;
        quill.format('header', currentHeader === value ? false : value);
      } else if (format === 'list') {
        const currentList = quill.getFormat(selection).list;
        quill.format('list', currentList === value ? false : value);
      } else if (format === 'align') {
        quill.format('align', value);
      } else if (format === 'clean') {
        quill.removeFormat(selection.index, selection.length);
      } else if (format === 'link') {
        const url = prompt('Enter URL:');
        if (url) {
          quill.format('link', url);
        }
      } else if (format === 'image') {
        const url = prompt('Enter image URL:');
        if (url) {
          quill.insertEmbed(selection.index, 'image', url);
        }
      } else {
        quill.format(format, value);
      }
      
      updateActiveFormats();
    }
  }, [activeEditor, updateActiveFormats]);

  const FormatButton = ({ format, icon: Icon, title, formatValue, className }) => (
    <Toggle
      size="sm"
      pressed={formatValue !== undefined ? activeFormats[format] === formatValue : activeFormats[format]}
      onPressedChange={() => applyFormat(format, formatValue)}
      aria-label={title}
      title={title}
      className={cn("h-9 px-3", className)}
    >
      <Icon className="h-4 w-4" />
    </Toggle>
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          ref={dockRef}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="floating-format-dock fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
        >
          <div className={cn(
            "bg-background/95 backdrop-blur-md border rounded-lg shadow-2xl",
            "transition-all duration-200",
            isMinimized ? "w-auto" : "w-auto max-w-3xl"
          )}>
            {isMinimized ? (
              <div className="flex items-center gap-2 p-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsMinimized(false)}
                  className="h-8"
                >
                  <ChevronDown className="h-4 w-4 rotate-180" />
                  <span className="ml-2 text-xs">Format</span>
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 p-2">
                {/* Text formatting */}
                <div className="flex items-center gap-1">
                  <FormatButton
                    format="bold"
                    icon={Bold}
                    title="Bold (Ctrl+B)"
                  />
                  <FormatButton
                    format="italic"
                    icon={Italic}
                    title="Italic (Ctrl+I)"
                  />
                  <FormatButton
                    format="underline"
                    icon={Underline}
                    title="Underline (Ctrl+U)"
                  />
                  <FormatButton
                    format="strike"
                    icon={Strikethrough}
                    title="Strikethrough"
                  />
                </div>

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Headers */}
                <div className="flex items-center gap-1">
                  <FormatButton
                    format="header"
                    formatValue={1}
                    icon={Heading1}
                    title="Heading 1"
                  />
                  <FormatButton
                    format="header"
                    formatValue={2}
                    icon={Heading2}
                    title="Heading 2"
                  />
                  <FormatButton
                    format="header"
                    formatValue={3}
                    icon={Heading3}
                    title="Heading 3"
                  />
                  <FormatButton
                    format="header"
                    formatValue={false}
                    icon={Type}
                    title="Normal"
                  />
                </div>

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Lists */}
                <div className="flex items-center gap-1">
                  <FormatButton
                    format="list"
                    formatValue="bullet"
                    icon={List}
                    title="Bullet List"
                  />
                  <FormatButton
                    format="list"
                    formatValue="ordered"
                    icon={ListOrdered}
                    title="Numbered List"
                  />
                </div>

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Alignment */}
                <div className="flex items-center gap-1">
                  <FormatButton
                    format="align"
                    formatValue={false}
                    icon={AlignLeft}
                    title="Align Left"
                  />
                  <FormatButton
                    format="align"
                    formatValue="center"
                    icon={AlignCenter}
                    title="Align Center"
                  />
                  <FormatButton
                    format="align"
                    formatValue="right"
                    icon={AlignRight}
                    title="Align Right"
                  />
                </div>

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Special */}
                <div className="flex items-center gap-1">
                  <FormatButton
                    format="code"
                    icon={Code}
                    title="Code"
                  />
                  <FormatButton
                    format="blockquote"
                    icon={Quote}
                    title="Quote"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => applyFormat('link')}
                    title="Insert Link"
                    className="h-9 px-3"
                  >
                    <Link className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => applyFormat('image')}
                    title="Insert Image"
                    className="h-9 px-3"
                  >
                    <Image className="h-4 w-4" />
                  </Button>
                </div>

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Colors */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-9 px-3">
                      <Palette className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-3">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-2">Text Color</p>
                        <div className="grid grid-cols-8 gap-1">
                          {[
                            '#000000', '#434343', '#666666', '#999999',
                            '#dc2626', '#ea580c', '#facc15', '#16a34a',
                            '#0891b2', '#2563eb', '#7c3aed', '#db2777'
                          ].map(color => (
                            <button
                              key={`text-${color}`}
                              onClick={() => applyFormat('color', color)}
                              className="h-6 w-6 rounded border hover:scale-110 transition-transform"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Highlight</p>
                        <div className="grid grid-cols-8 gap-1">
                          {[
                            'transparent', '#fef3c7', '#fed7aa', '#fecaca',
                            '#e0e7ff', '#ddd6fe', '#fce7f3', '#ccfbf1',
                            '#d1fae5', '#e9d5ff', '#bfdbfe', '#fbcfe8'
                          ].map(color => (
                            <button
                              key={`bg-${color}`}
                              onClick={() => applyFormat('background', color === 'transparent' ? false : color)}
                              className="h-6 w-6 rounded border hover:scale-110 transition-transform"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => applyFormat('clean')}
                  title="Clear Formatting"
                  className="h-9 px-3"
                >
                  <Eraser className="h-4 w-4" />
                </Button>

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Controls */}
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsMinimized(true)}
                    className="h-9 w-9 p-0"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsVisible(false)}
                    className="h-9 w-9 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}