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
  Highlighter,
  Link,
  Code,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Type,
  Sparkles,
  X
} from 'lucide-react';

export default function TextEditorDock({ 
  quillRef,
  position = 'bottom',
  visible = true,
  onClose,
  className,
  activeFormats = {},
  onFormatChange
}) {
  const [isFloating, setIsFloating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [localFormats, setLocalFormats] = useState(activeFormats);
  const dockRef = useRef(null);

  useEffect(() => {
    setLocalFormats(activeFormats);
  }, [activeFormats]);

  const applyFormat = useCallback((format, value = true) => {
    if (quillRef?.current) {
      const selection = quillRef.current.getSelection();
      if (selection) {
        quillRef.current.format(format, value);
        if (onFormatChange) {
          onFormatChange(format, value);
        }
        // Update local formats
        const newFormats = quillRef.current.getFormat(selection);
        setLocalFormats(newFormats);
      }
    }
  }, [quillRef, onFormatChange]);

  const applyStyle = useCallback((styleName) => {
    if (!quillRef?.current) return;
    
    const selection = quillRef.current.getSelection();
    if (!selection) return;

    // Predefined style combinations
    const styles = {
      heading: {
        header: 1,
        bold: true
      },
      subheading: {
        header: 2,
        bold: false
      },
      body: {
        header: false,
        bold: false,
        italic: false
      },
      emphasis: {
        italic: true,
        color: '#e11d48'
      },
      highlight: {
        background: '#fef3c7'
      },
      code: {
        'code-block': true
      },
      quote: {
        blockquote: true,
        italic: true
      },
      important: {
        bold: true,
        underline: true,
        color: '#dc2626'
      }
    };

    const style = styles[styleName];
    if (style) {
      Object.entries(style).forEach(([key, value]) => {
        quillRef.current.format(key, value);
      });
      
      // Update formats
      const newFormats = quillRef.current.getFormat(selection);
      setLocalFormats(newFormats);
    }
  }, [quillRef]);

  const handleDragStart = (e) => {
    setIsDragging(true);
    const rect = dockRef.current.getBoundingClientRect();
    setDragPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleDrag = (e) => {
    if (isDragging && dockRef.current) {
      const newX = e.clientX - dragPosition.x;
      const newY = e.clientY - dragPosition.y;
      dockRef.current.style.left = `${newX}px`;
      dockRef.current.style.top = `${newY}px`;
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrag);
      document.addEventListener('mouseup', handleDragEnd);
      return () => {
        document.removeEventListener('mousemove', handleDrag);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [isDragging, dragPosition]);

  const positionClasses = {
    top: 'top-2 left-1/2 -translate-x-1/2',
    bottom: 'bottom-2 left-1/2 -translate-x-1/2',
    left: 'left-2 top-1/2 -translate-y-1/2',
    right: 'right-2 top-1/2 -translate-y-1/2',
    floating: 'fixed'
  };

  const FormatButton = ({ format, icon: Icon, title, formatValue }) => (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={localFormats[format] === (formatValue ?? true)}
            onPressedChange={() => applyFormat(format, formatValue)}
            className="h-8 w-8 p-0"
          >
            <Icon className="h-4 w-4" />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>
          <p>{title}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const StyleButton = ({ styleName, icon: Icon, title, color }) => (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => applyStyle(styleName)}
            className="h-8 w-8 p-0"
            style={color ? { color } : {}}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{title}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  if (!visible) return null;

  return (
    <div
      ref={dockRef}
      className={cn(
        'z-50 flex items-center gap-1 p-2 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg',
        isFloating ? 'fixed cursor-move' : positionClasses[position],
        className
      )}
      onMouseDown={isFloating ? handleDragStart : undefined}
    >
      {/* Quick Styles */}
      <div className="flex items-center gap-1 px-1">
        <StyleButton
          styleName="heading"
          icon={Type}
          title="Apply Heading Style"
        />
        <StyleButton
          styleName="emphasis"
          icon={Italic}
          title="Apply Emphasis"
          color="#e11d48"
        />
        <StyleButton
          styleName="highlight"
          icon={Highlighter}
          title="Highlight Text"
        />
        <StyleButton
          styleName="important"
          icon={Sparkles}
          title="Mark as Important"
          color="#dc2626"
        />
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Basic Formatting */}
      <div className="flex items-center gap-1 px-1">
        <FormatButton
          format="bold"
          icon={Bold}
          title="Bold"
        />
        <FormatButton
          format="italic"
          icon={Italic}
          title="Italic"
        />
        <FormatButton
          format="underline"
          icon={Underline}
          title="Underline"
        />
        <FormatButton
          format="strike"
          icon={Strikethrough}
          title="Strikethrough"
        />
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Alignment */}
      <div className="flex items-center gap-1 px-1">
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
        <FormatButton
          format="align"
          formatValue="justify"
          icon={AlignJustify}
          title="Justify"
        />
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Special Formats */}
      <div className="flex items-center gap-1 px-1">
        <FormatButton
          format="code"
          icon={Code}
          title="Inline Code"
        />
        <FormatButton
          format="blockquote"
          icon={Quote}
          title="Quote"
        />
        <FormatButton
          format="link"
          icon={Link}
          title="Add Link"
        />
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Color Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2">
          <div className="space-y-2">
            <p className="text-xs font-medium">Quick Colors</p>
            <div className="grid grid-cols-6 gap-1">
              {[
                '#000000', '#dc2626', '#ea580c', '#facc15', '#16a34a', '#0891b2',
                '#2563eb', '#7c3aed', '#db2777', '#64748b', '#f43f5e', '#8b5cf6'
              ].map(color => (
                <button
                  key={color}
                  onClick={() => applyFormat('color', color)}
                  className="h-6 w-6 rounded border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Dock Controls */}
      <div className="flex items-center gap-1 ml-2 pl-2 border-l">
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsFloating(!isFloating)}
                className="h-8 w-8 p-0"
              >
                {isFloating ? '📌' : '🔓'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isFloating ? 'Pin dock' : 'Float dock'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {onClose && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Close dock</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}