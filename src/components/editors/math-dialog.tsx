'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Sigma, Info } from 'lucide-react';
import katex from 'katex';

interface MathDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (formula: string, displayMode: boolean) => void;
  initialValue?: string;
}

// Common math symbols and templates
const MATH_SYMBOLS = {
  'Greek Letters': [
    { label: 'Alpha', latex: '\\alpha' },
    { label: 'Beta', latex: '\\beta' },
    { label: 'Gamma', latex: '\\gamma' },
    { label: 'Delta', latex: '\\delta' },
    { label: 'Epsilon', latex: '\\epsilon' },
    { label: 'Theta', latex: '\\theta' },
    { label: 'Lambda', latex: '\\lambda' },
    { label: 'Mu', latex: '\\mu' },
    { label: 'Pi', latex: '\\pi' },
    { label: 'Sigma', latex: '\\sigma' },
    { label: 'Phi', latex: '\\phi' },
    { label: 'Omega', latex: '\\omega' },
  ],
  'Operators': [
    { label: 'Plus/Minus', latex: '\\pm' },
    { label: 'Times', latex: '\\times' },
    { label: 'Divide', latex: '\\div' },
    { label: 'Not Equal', latex: '\\neq' },
    { label: 'Less/Equal', latex: '\\leq' },
    { label: 'Greater/Equal', latex: '\\geq' },
    { label: 'Approx', latex: '\\approx' },
    { label: 'Infinity', latex: '\\infty' },
  ],
  'Functions': [
    { label: 'Fraction', latex: '\\frac{a}{b}' },
    { label: 'Square Root', latex: '\\sqrt{x}' },
    { label: 'Nth Root', latex: '\\sqrt[n]{x}' },
    { label: 'Superscript', latex: 'x^{2}' },
    { label: 'Subscript', latex: 'x_{i}' },
    { label: 'Sum', latex: '\\sum_{i=1}^{n}' },
    { label: 'Product', latex: '\\prod_{i=1}^{n}' },
    { label: 'Integral', latex: '\\int_{a}^{b}' },
    { label: 'Limit', latex: '\\lim_{x \\to \\infty}' },
  ],
  'Structures': [
    { label: 'Matrix 2x2', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}' },
    { label: 'Cases', latex: '\\begin{cases} x & \\text{if } x > 0 \\\\ -x & \\text{if } x \\leq 0 \\end{cases}' },
    { label: 'Aligned', latex: '\\begin{aligned} a &= b + c \\\\ d &= e + f \\end{aligned}' },
  ],
};

/**
 * Math formula input dialog with live preview and symbol palette
 */
export default function MathDialog({ open, onOpenChange, onInsert, initialValue = '' }: MathDialogProps) {
  const [formula, setFormula] = useState(initialValue);
  const [displayMode, setDisplayMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update preview when formula changes
  useEffect(() => {
    if (previewRef.current && formula) {
      try {
        katex.render(formula, previewRef.current, {
          throwOnError: true,
          displayMode: displayMode,
          output: 'html'
        });
        setError(null);
      } catch (e: any) {
        previewRef.current.innerHTML = '';
        setError(e.message || 'Invalid LaTeX');
      }
    } else if (previewRef.current) {
      previewRef.current.innerHTML = '<span class="text-muted-foreground">Preview will appear here...</span>';
      setError(null);
    }
  }, [formula, displayMode]);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setFormula(initialValue);
      setError(null);
    }
  }, [open, initialValue]);

  const insertSymbol = (latex: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newFormula = formula.slice(0, start) + latex + formula.slice(end);
      setFormula(newFormula);
      // Focus and set cursor position after the inserted symbol
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = start + latex.length;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    } else {
      setFormula(formula + latex);
    }
  };

  const handleInsert = () => {
    if (formula.trim()) {
      onInsert(formula.trim(), displayMode);
      setFormula('');
      onOpenChange(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <span />
      </PopoverTrigger>
      <PopoverContent
        className="w-[500px] p-0"
        side="top"
        align="center"
        data-math-dialog="true"
        onMouseDown={(e) => {
          // Only prevent default for non-interactive elements to keep editor focused
          const target = e.target as HTMLElement;
          const isInteractive = target.closest('input, textarea, button, [role="tab"], [role="button"], [role="checkbox"]');
          if (!isInteractive) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sigma className="h-5 w-5" />
              <h3 className="font-semibold">Insert Math Formula</h3>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2">
                  <Info className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 text-sm">
                <p className="font-medium mb-2">LaTeX Tips:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>Use ^ for superscripts: x^2</li>
                  <li>Use _ for subscripts: x_i</li>
                  <li>Use \frac{"{a}{b}"} for fractions</li>
                  <li>Use \sqrt{"{x}"} for square roots</li>
                  <li>Wrap text in \text{"{...}"}</li>
                </ul>
              </PopoverContent>
            </Popover>
          </div>

          {/* LaTeX Input */}
          <div className="space-y-2">
            <Label htmlFor="formula">LaTeX Formula</Label>
            <Textarea
              ref={textareaRef}
              id="formula"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              placeholder="Enter LaTeX formula, e.g., \frac{-b \pm \sqrt{b^2-4ac}}{2a}"
              className="font-mono text-sm min-h-[80px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault();
                  handleInsert();
                }
              }}
            />
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div
              className={`min-h-[60px] p-4 border rounded-lg bg-muted/30 flex items-center ${displayMode ? 'justify-center' : 'justify-start'}`}
            >
              <div ref={previewRef} className="overflow-x-auto" />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          {/* Symbol Palette */}
          <div className="space-y-2">
            <Label>Quick Insert</Label>
            <Tabs defaultValue="Greek Letters" className="w-full">
              <TabsList className="w-full h-auto flex-wrap justify-start">
                {Object.keys(MATH_SYMBOLS).map((category) => (
                  <TabsTrigger key={category} value={category} className="text-xs px-2 py-1">
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
              {Object.entries(MATH_SYMBOLS).map(([category, symbols]) => (
                <TabsContent key={category} value={category} className="mt-2">
                  <ScrollArea className="h-[100px]">
                    <div className="flex flex-wrap gap-1">
                      {symbols.map((symbol) => (
                        <Button
                          key={symbol.latex}
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 font-mono text-xs"
                          onClick={() => insertSymbol(symbol.latex)}
                          title={symbol.label}
                        >
                          <span
                            dangerouslySetInnerHTML={{
                              __html: katex.renderToString(symbol.latex.replace(/\{[a-z]\}/g, '{}').replace(/\\text\{.*?\}/g, ''), { throwOnError: false })
                            }}
                          />
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Options and Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={displayMode}
                onChange={(e) => setDisplayMode(e.target.checked)}
                className="rounded"
              />
              Display mode (centered, larger)
            </label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleInsert} disabled={!formula.trim() || !!error}>
                Insert Formula
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
