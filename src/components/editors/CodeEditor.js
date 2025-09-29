import dynamic from 'next/dynamic';
import { useState, useEffect, useRef } from 'react';
import { formatHex, formatRgb, parse } from 'culori';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react'),
  { ssr: false }
);

// Function to get CSS variable value
const getCSSVariable = (variable) => {
  if (typeof window !== 'undefined') {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(variable)
      .trim();
  }
  return '';
};

// Convert OKLCH to Hex for Monaco
const oklchToHex = (oklchString) => {
  try {
    const color = parse(oklchString);
    if (color) {
      return formatHex(color);
    }
  } catch (error) {
    console.error('Error parsing color:', oklchString, error);
  }
  return '#000000';
};

export default function CodeEditor({language="javascript", height, width}) {
  const [code, setCode] = useState(`// Welcome to your custom themed editor
function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return {
    message: "Welcome",
    timestamp: Date.now()
  };
}

// Example usage
const result = greet("World");
console.log(result);`);

  const [theme, setTheme] = useState('custom-light');
  const [isThemeRegistered, setIsThemeRegistered] = useState(false);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);

  const defineCustomThemes = (monaco) => {
    // Get CSS variables and convert OKLCH to Hex
    const getColor = (cssVar) => {
      const value = getCSSVariable(cssVar);
      return oklchToHex(value);
    };

    // Define light theme
    monaco.editor.defineTheme('custom-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: getColor('--muted-foreground').slice(1), fontStyle: 'italic' },
        { token: 'keyword', foreground: getColor('--primary').slice(1), fontStyle: 'bold' },
        { token: 'string', foreground: getColor('--chart-1').slice(1) },
        { token: 'number', foreground: getColor('--chart-2').slice(1) },
        { token: 'type', foreground: getColor('--chart-4').slice(1) },
        { token: 'variable', foreground: getColor('--foreground').slice(1) },
        { token: 'function', foreground: getColor('--chart-5').slice(1) },
        { token: 'constant', foreground: getColor('--primary').slice(1), fontStyle: 'bold' },
        { token: 'class', foreground: getColor('--chart-3').slice(1) },
        { token: 'interface', foreground: getColor('--chart-4').slice(1) },
        { token: 'namespace', foreground: getColor('--primary').slice(1) },
        { token: 'parameter', foreground: getColor('--foreground').slice(1) },
        { token: 'property', foreground: getColor('--chart-1').slice(1) },
        { token: 'operator', foreground: getColor('--foreground').slice(1) },
        { token: 'tag', foreground: getColor('--primary').slice(1) },
        { token: 'attribute.name', foreground: getColor('--chart-5').slice(1) },
        { token: 'attribute.value', foreground: getColor('--chart-1').slice(1) },
      ],
      colors: {
        'editor.background': getColor('--background'),
        'editor.foreground': getColor('--foreground'),
        'editor.lineHighlightBackground': getColor('--muted') + '40',
        'editor.selectionBackground': getColor('--accent') + '60',
        'editor.inactiveSelectionBackground': getColor('--accent') + '30',
        'editorLineNumber.foreground': getColor('--muted-foreground'),
        'editorLineNumber.activeForeground': getColor('--foreground'),
        'editorCursor.foreground': getColor('--primary'),
        'editor.findMatchBackground': getColor('--chart-3') + '40',
        'editor.findMatchHighlightBackground': getColor('--chart-3') + '20',
        'editorBracketMatch.background': getColor('--accent') + '30',
        'editorBracketMatch.border': getColor('--accent'),
        'editorIndentGuide.background': getColor('--border') + '40',
        'editorIndentGuide.activeBackground': getColor('--border'),
        'editorRuler.foreground': getColor('--border'),
        'editorOverviewRuler.border': getColor('--border'),
        'editorGutter.background': getColor('--background'),
        'editorWidget.background': getColor('--popover'),
        'editorWidget.foreground': getColor('--popover-foreground'),
        'editorWidget.border': getColor('--border'),
        'editorSuggestWidget.background': getColor('--popover'),
        'editorSuggestWidget.border': getColor('--border'),
        'editorSuggestWidget.foreground': getColor('--popover-foreground'),
        'editorSuggestWidget.highlightForeground': getColor('--primary'),
        'editorSuggestWidget.selectedBackground': getColor('--accent'),
        'editorHoverWidget.background': getColor('--popover'),
        'editorHoverWidget.border': getColor('--border'),
        'editorHoverWidget.foreground': getColor('--popover-foreground'),
        'scrollbar.shadow': getColor('--border') + '40',
        'scrollbarSlider.background': getColor('--border') + '40',
        'scrollbarSlider.hoverBackground': getColor('--border') + '60',
        'scrollbarSlider.activeBackground': getColor('--border') + '80',
      }
    });

    // Define dark theme
    monaco.editor.defineTheme('custom-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: getColor('--muted-foreground').slice(1), fontStyle: 'italic' },
        { token: 'keyword', foreground: getColor('--primary').slice(1), fontStyle: 'bold' },
        { token: 'string', foreground: getColor('--chart-1').slice(1) },
        { token: 'number', foreground: getColor('--chart-2').slice(1) },
        { token: 'type', foreground: getColor('--chart-4').slice(1) },
        { token: 'variable', foreground: getColor('--foreground').slice(1) },
        { token: 'function', foreground: getColor('--chart-5').slice(1) },
        { token: 'constant', foreground: getColor('--primary').slice(1), fontStyle: 'bold' },
        { token: 'class', foreground: getColor('--chart-3').slice(1) },
        { token: 'interface', foreground: getColor('--chart-4').slice(1) },
        { token: 'namespace', foreground: getColor('--primary').slice(1) },
        { token: 'parameter', foreground: getColor('--foreground').slice(1) },
        { token: 'property', foreground: getColor('--chart-1').slice(1) },
        { token: 'operator', foreground: getColor('--foreground').slice(1) },
        { token: 'tag', foreground: getColor('--primary').slice(1) },
        { token: 'attribute.name', foreground: getColor('--chart-5').slice(1) },
        { token: 'attribute.value', foreground: getColor('--chart-1').slice(1) },
      ],
      colors: {
        'editor.background': getColor('--background'),
        'editor.foreground': getColor('--foreground'),
        'editor.lineHighlightBackground': getColor('--muted') + '20',
        'editor.selectionBackground': getColor('--accent') + '40',
        'editor.inactiveSelectionBackground': getColor('--accent') + '20',
        'editorLineNumber.foreground': getColor('--muted-foreground'),
        'editorLineNumber.activeForeground': getColor('--foreground'),
        'editorCursor.foreground': getColor('--primary'),
        'editor.findMatchBackground': getColor('--chart-3') + '40',
        'editor.findMatchHighlightBackground': getColor('--chart-3') + '20',
        'editorBracketMatch.background': getColor('--accent') + '30',
        'editorBracketMatch.border': getColor('--accent'),
        'editorIndentGuide.background': getColor('--border') + '20',
        'editorIndentGuide.activeBackground': getColor('--border') + '40',
        'editorRuler.foreground': getColor('--border'),
        'editorOverviewRuler.border': getColor('--border'),
        'editorGutter.background': getColor('--background'),
        'editorWidget.background': getColor('--popover'),
        'editorWidget.foreground': getColor('--popover-foreground'),
        'editorWidget.border': getColor('--border'),
        'editorSuggestWidget.background': getColor('--popover'),
        'editorSuggestWidget.border': getColor('--border'),
        'editorSuggestWidget.foreground': getColor('--popover-foreground'),
        'editorSuggestWidget.highlightForeground': getColor('--primary'),
        'editorSuggestWidget.selectedBackground': getColor('--accent'),
        'editorHoverWidget.background': getColor('--popover'),
        'editorHoverWidget.border': getColor('--border'),
        'editorHoverWidget.foreground': getColor('--popover-foreground'),
        'scrollbar.shadow': getColor('--border') + '40',
        'scrollbarSlider.background': getColor('--border') + '20',
        'scrollbarSlider.hoverBackground': getColor('--border') + '40',
        'scrollbarSlider.activeBackground': getColor('--border') + '60',
      }
    });

    setIsThemeRegistered(true);
  };

  // Detect system/app theme changes
  useEffect(() => {
    const detectTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'custom-dark' : 'custom-light');
    };

    // Initial detection
    detectTheme();

    // Watch for theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          detectTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Define custom themes
    defineCustomThemes(monaco);
    
    // Set initial theme
    const isDark = document.documentElement.classList.contains('dark');
    monaco.editor.setTheme(isDark ? 'custom-dark' : 'custom-light');
  };

  const handleEditorChange = (value) => {
    setCode(value);
  };

  // Update theme when it changes
  useEffect(() => {
    if (monacoRef.current && isThemeRegistered) {
      monacoRef.current.editor.setTheme(theme);
    }
  }, [theme, isThemeRegistered]);

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      {/* Editor Container */}
      <div className="flex-1 relative">
        <MonacoEditor
          height={height}
          width={width}
          language={language}
          value={code}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme={theme}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: true,
            scrollBeyondLastLine: false,
            readOnly: false,
            automaticLayout: true,
            wordWrap: 'on',
            suggestOnTriggerCharacters: true,
            formatOnPaste: true,
            formatOnType: true,
            folding: true,
            showFoldingControls: 'mouseover',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            fontFamily: 'var(--font-mono)',
            renderWhitespace: 'selection',
            bracketPairColorization: {
              enabled: true,
            },
            guides: {
              indentation: true,
              bracketPairs: true,
            },
          }}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-card p-2 px-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>JavaScript • UTF-8</span>
          <span>{code.length} characters</span>
        </div>
      </div>
    </div>
  );
}