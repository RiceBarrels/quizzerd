import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, memo } from 'react';
import { formatHex, parse } from 'culori';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, FileCode } from 'lucide-react';
import type * as Monaco from 'monaco-editor';

const MonacoEditor = dynamic(
  () => import('@monaco-editor/react'),
  { ssr: false }
);

export interface CodeFile {
  name: string;
  content: string;
}

interface CodeEditorProps {
  files?: CodeFile[];
  onChange?: (files: CodeFile[]) => void;
  height?: string;
  width?: string;
}

type LanguageMap = Record<string, string>;

// Function to get CSS variable value
const getCSSVariable = (variable: string): string => {
  if (typeof window !== 'undefined') {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(variable)
      .trim();
  }
  return '';
};

// Convert OKLCH to Hex for Monaco
const oklchToHex = (oklchString: string): string => {
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

const getLanguageFromFileName = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const languageMap: LanguageMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'html': 'html',
    'htm': 'html',
    'xml': 'xml',
    'json': 'json',
    'md': 'markdown',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'swift': 'swift',
    'kt': 'kotlin',
    'sql': 'sql',
    'sh': 'shell',
    'yaml': 'yaml',
    'yml': 'yaml',
    'txt': 'plaintext'
  };
  return languageMap[ext || ''] || 'plaintext';
};

const CodeEditor = memo(function CodeEditor({
  files = [{ name: 'index.js', content: '// Write your code here' }],
  onChange,
  height = '400px',
  width = '100%'
}: CodeEditorProps) {
  const [editorFiles, setEditorFiles] = useState<CodeFile[]>(files);
  const [activeFile, setActiveFile] = useState<string>(files[0]?.name || 'index.js');
  const [newFileName, setNewFileName] = useState<string>('');
  const [showAddFile, setShowAddFile] = useState<boolean>(false);

  const [theme, setTheme] = useState<'custom-light' | 'custom-dark'>('custom-light');
  const [isThemeRegistered, setIsThemeRegistered] = useState<boolean>(false);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const modelsRef = useRef<Map<string, Monaco.editor.ITextModel>>(new Map());
  const isInitializedRef = useRef<boolean>(false);
  const lastSyncedFilesRef = useRef<string>('');

  // Sync external files prop with internal state only when files structurally change
  useEffect(() => {
    if (files && files.length > 0) {
      // Create a signature of the files to detect actual changes
      const filesSignature = files.map(f => f.name).join(',');
      
      // Only update if the structure has actually changed
      if (filesSignature !== lastSyncedFilesRef.current) {
        lastSyncedFilesRef.current = filesSignature;
        setEditorFiles(files);
        
        // Update active file if current one doesn't exist
        if (!files.find(f => f.name === activeFile)) {
          setActiveFile(files[0].name);
        }
      }
    }
  }, [files, activeFile]);

  const defineCustomThemes = (monaco: typeof Monaco) => {
    // Get CSS variables and convert OKLCH to Hex
    const getColor = (cssVar: string): string => {
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

  const registerLanguageSupport = (monaco: typeof Monaco) => {
    // Python language configuration
    monaco.languages.register({ id: 'python' });
    monaco.languages.setMonarchTokensProvider('python', {
      defaultToken: '',
      tokenPostfix: '.python',
      keywords: [
        'and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif',
        'else', 'except', 'exec', 'finally', 'for', 'from', 'global', 'if', 'import',
        'in', 'is', 'lambda', 'not', 'or', 'pass', 'print', 'raise', 'return', 'try',
        'while', 'with', 'yield', 'async', 'await', 'nonlocal'
      ],
      builtins: [
        '__import__', 'abs', 'all', 'any', 'bin', 'bool', 'bytearray', 'callable',
        'chr', 'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir', 'divmod',
        'enumerate', 'eval', 'filter', 'float', 'format', 'frozenset', 'getattr',
        'globals', 'hasattr', 'hash', 'help', 'hex', 'id', 'input', 'int', 'isinstance',
        'issubclass', 'iter', 'len', 'list', 'locals', 'map', 'max', 'memoryview',
        'min', 'next', 'object', 'oct', 'open', 'ord', 'pow', 'print', 'property',
        'range', 'repr', 'reversed', 'round', 'set', 'setattr', 'slice', 'sorted',
        'staticmethod', 'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip'
      ],
      operators: [
        '+', '-', '*', '/', '%', '//', '**', '==', '!=', '<', '>', '<=', '>=',
        '=', '+=', '-=', '*=', '/=', '%=', '//=', '**=', '&=', '|=', '^=',
        '>>=', '<<=', '&', '|', '^', '~', '<<', '>>'
      ],
      symbols: /[=><!~?:&|+\-*\/\^%]+/,
      escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
      tokenizer: {
        root: [
          [/[a-zA-Z_]\w*/, {
            cases: {
              '@keywords': 'keyword',
              '@builtins': 'type.identifier',
              '@default': 'identifier'
            }
          }],
          { include: '@whitespace' },
          [/[{}()\[\]]/, '@brackets'],
          [/@symbols/, {
            cases: {
              '@operators': 'operator',
              '@default': 'delimiter'
            }
          }],
          [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
          [/0[xX][0-9a-fA-F]+/, 'number.hex'],
          [/0[oO][0-7]+/, 'number.octal'],
          [/0[bB][01]+/, 'number.binary'],
          [/\d+/, 'number'],
          [/[;,.]/, 'delimiter'],
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/"""/, 'string', '@string_triple_double'],
          [/'''/, 'string', '@string_triple_single'],
          [/"/, 'string', '@string_double'],
          [/'/, 'string', '@string_single'],
        ],
        whitespace: [
          [/\s+/, 'white'],
          [/#.*$/, 'comment'],
        ],
        string_double: [
          [/[^\\"]+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/"/, 'string', '@pop']
        ],
        string_single: [
          [/[^\\']+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/'/, 'string', '@pop']
        ],
        string_triple_double: [
          [/[^\\"]+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/"""/, 'string', '@pop'],
          [/./, 'string']
        ],
        string_triple_single: [
          [/[^\\']+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/'''/, 'string', '@pop'],
          [/./, 'string']
        ],
      }
    });

    // Java language configuration
    monaco.languages.register({ id: 'java' });
    monaco.languages.setMonarchTokensProvider('java', {
      defaultToken: '',
      tokenPostfix: '.java',
      keywords: [
        'abstract', 'continue', 'for', 'new', 'switch', 'assert', 'default',
        'goto', 'package', 'synchronized', 'boolean', 'do', 'if', 'private',
        'this', 'break', 'double', 'implements', 'protected', 'throw', 'byte',
        'else', 'import', 'public', 'throws', 'case', 'enum', 'instanceof', 'return',
        'transient', 'catch', 'extends', 'int', 'short', 'try', 'char', 'final',
        'interface', 'static', 'void', 'class', 'finally', 'long', 'strictfp',
        'volatile', 'const', 'float', 'native', 'super', 'while', 'true', 'false', 'null'
      ],
      operators: [
        '=', '>', '<', '!', '~', '?', ':',
        '==', '<=', '>=', '!=', '&&', '||', '++', '--',
        '+', '-', '*', '/', '&', '|', '^', '%', '<<',
        '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=',
        '^=', '%=', '<<=', '>>=', '>>>='
      ],
      symbols: /[=><!~?:&|+\-*\/\^%]+/,
      escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
      tokenizer: {
        root: [
          [/[a-zA-Z_$][\w$]*/, {
            cases: {
              '@keywords': 'keyword',
              '@default': 'identifier'
            }
          }],
          { include: '@whitespace' },
          [/[{}()\[\]]/, '@brackets'],
          [/@symbols/, {
            cases: {
              '@operators': 'operator',
              '@default': ''
            }
          }],
          [/\d*\.\d+([eE][\-+]?\d+)?[fFdD]?/, 'number.float'],
          [/0[xX][0-9a-fA-F]+[Ll]?/, 'number.hex'],
          [/0[bB][01]+[Ll]?/, 'number.binary'],
          [/\d+[lL]?/, 'number'],
          [/[;,.]/, 'delimiter'],
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string'],
          [/'[^\\']'/, 'string'],
          [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],
          [/'/, 'string.invalid']
        ],
        whitespace: [
          [/[ \t\r\n]+/, ''],
          [/\/\*/, 'comment', '@comment'],
          [/\/\/.*$/, 'comment'],
        ],
        comment: [
          [/[^\/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[\/*]/, 'comment']
        ],
        string: [
          [/[^\\"]+/, 'string'],
          [/@escapes/, 'string.escape'],
          [/\\./, 'string.escape.invalid'],
          [/"/, 'string', '@pop']
        ],
      }
    });

    // C/C++ language configuration (already supported but we can enhance)
    monaco.languages.setLanguageConfiguration('c', {
      comments: {
        lineComment: '//',
        blockComment: ['/*', '*/']
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')']
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" }
      ]
    });

    // Python IntelliSense
    monaco.languages.registerCompletionItemProvider('python', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };
        
        const suggestions = [
          {
            label: 'def',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'def ${1:function_name}(${2:params}):\n    ${3:pass}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Define a function',
            range: range
          },
          {
            label: 'class',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'class ${1:ClassName}:\n    def __init__(self${2:, params}):\n        ${3:pass}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Define a class',
            range: range
          },
          {
            label: 'if',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'if ${1:condition}:\n    ${2:pass}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'If statement',
            range: range
          },
          {
            label: 'for',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'for ${1:item} in ${2:iterable}:\n    ${3:pass}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'For loop',
            range: range
          },
          {
            label: 'while',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'while ${1:condition}:\n    ${2:pass}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'While loop',
            range: range
          },
          {
            label: 'try',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${4:pass}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Try-except block',
            range: range
          }
        ];
        return { suggestions };
      }
    });

    // Java IntelliSense
    monaco.languages.registerCompletionItemProvider('java', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };
        
        const suggestions = [
          {
            label: 'main',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'public static void main(String[] args) {\n    ${1}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Main method',
            range: range
          },
          {
            label: 'sysout',
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: 'System.out.println(${1});',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Print to console',
            range: range
          },
          {
            label: 'for',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'for (${1:int i = 0}; ${2:i < length}; ${3:i++}) {\n    ${4}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'For loop',
            range: range
          },
          {
            label: 'if',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'if (${1:condition}) {\n    ${2}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'If statement',
            range: range
          },
          {
            label: 'class',
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: 'public class ${1:ClassName} {\n    ${2}\n}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Class definition',
            range: range
          }
        ];
        return { suggestions };
      }
    });

  };

  const setupLinting = (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    let pythonValidationTimeout: NodeJS.Timeout;
    let javaValidationTimeout: NodeJS.Timeout;

    // Listen to content changes
    editor.onDidChangeModelContent(() => {
      const model = editor.getModel();
      if (!model) return;

      const language = model.getLanguageId();

      // Python linting
      if (language === 'python') {
        clearTimeout(pythonValidationTimeout);
        pythonValidationTimeout = setTimeout(() => {
          const code = model.getValue();
          const markers: any[] = [];
          const lines = code.split('\n');

          lines.forEach((line, lineNumber) => {
            // Check for missing colons
            const controlStructures = /^\s*(if|elif|else|for|while|def|class|try|except|finally|with)\s+.*[^:]\s*$/;
            if (controlStructures.test(line) && !line.trim().endsWith(':')) {
              markers.push({
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: lineNumber + 1,
                startColumn: line.length + 1,
                endLineNumber: lineNumber + 1,
                endColumn: line.length + 1,
                message: 'Missing colon (:) at end of statement'
              });
            }

            // Check for inconsistent indentation
            if (line.trim() && /^\s+/.test(line)) {
              const matchResult = line.match(/^\s+/);
              if (matchResult) {
                const spaces = matchResult[0];
                if (spaces.includes('\t') && spaces.includes(' ')) {
                  markers.push({
                    severity: monaco.MarkerSeverity.Warning,
                    startLineNumber: lineNumber + 1,
                    startColumn: 1,
                    endLineNumber: lineNumber + 1,
                    endColumn: spaces.length + 1,
                    message: 'Mixed tabs and spaces in indentation'
                  });
                }
              }
            }
          });

          monaco.editor.setModelMarkers(model, 'python', markers);
        }, 500);
      }

      // Java linting
      if (language === 'java') {
        clearTimeout(javaValidationTimeout);
        javaValidationTimeout = setTimeout(() => {
          const code = model.getValue();
          const markers: any[] = [];
          const lines = code.split('\n');

          lines.forEach((line, lineNumber) => {
            // Check for missing semicolons
            const needsSemicolon = /^\s*(int|long|double|float|boolean|char|String|byte|short|var)\s+\w+\s*=\s*.+[^;{}\s]\s*$/;
            if (needsSemicolon.test(line)) {
              markers.push({
                severity: monaco.MarkerSeverity.Error,
                startLineNumber: lineNumber + 1,
                startColumn: line.length + 1,
                endLineNumber: lineNumber + 1,
                endColumn: line.length + 1,
                message: 'Missing semicolon (;)'
              });
            }

            // Check for method calls without semicolons
            if (/^\s*\w+\([^)]*\)\s*$/.test(line) && !line.includes('if') && !line.includes('for') && !line.includes('while')) {
              if (!lines[lineNumber - 1]?.includes('public') && !lines[lineNumber - 1]?.includes('private')) {
                markers.push({
                  severity: monaco.MarkerSeverity.Error,
                  startLineNumber: lineNumber + 1,
                  startColumn: line.length + 1,
                  endLineNumber: lineNumber + 1,
                  endColumn: line.length + 1,
                  message: 'Missing semicolon (;)'
                });
              }
            }
          });

          monaco.editor.setModelMarkers(model, 'java', markers);
        }, 500);
      }
    });
  };

  const handleEditorDidMount = (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    // Check if editor is already disposed
    try {
      if (!editor || typeof editor.getModel !== 'function' || (editor as any)._isDisposed) {
        console.warn('Editor is already disposed, skipping initialization');
        return;
      }
    } catch (e) {
      console.warn('Editor validation failed:', e);
      return;
    }

    // Prevent double initialization (but allow re-init if previous was disposed)
    if (isInitializedRef.current && editorRef.current && !(editorRef.current as any)._isDisposed) {
      console.warn('Editor already initialized, skipping...');
      return;
    }

    isInitializedRef.current = true;
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register language support only once globally
    if (!(window as any).__monacoLanguageRegistered) {
      registerLanguageSupport(monaco);
      (window as any).__monacoLanguageRegistered = true;
    }

    // Setup linting
    setupLinting(editor, monaco);

    // Define custom themes only once globally
    if (!(window as any).__monacoThemesRegistered) {
      defineCustomThemes(monaco);
      (window as any).__monacoThemesRegistered = true;
    }

    // Set initial theme
    const isDark = document.documentElement.classList.contains('dark');
    monaco.editor.setTheme(isDark ? 'custom-dark' : 'custom-light');

    // Create models for all files
    editorFiles.forEach(file => {
      if (!modelsRef.current.has(file.name)) {
        const language = getLanguageFromFileName(file.name);
        const model = monaco.editor.createModel(file.content, language);
        modelsRef.current.set(file.name, model);

        // Listen to model changes
        model.onDidChangeContent(() => {
          const updatedContent = model.getValue();
          const fileName = Array.from(modelsRef.current.entries()).find(([_, m]) => m === model)?.[0];

          if (fileName) {
            setEditorFiles(prev => {
              const updated = prev.map(f =>
                f.name === fileName ? { ...f, content: updatedContent } : f
              );

              // Call onChange with updated files
              if (onChange) {
                onChange(updated);
              }

              return updated;
            });
          }
        });
      }
    });

    // Set the initial model (wrapped in try-catch for React Strict Mode)
    try {
      const initialModel = modelsRef.current.get(activeFile);
      if (initialModel && !initialModel.isDisposed()) {
        editor.setModel(initialModel);
      }
    } catch (error) {
      // Editor might be disposed during React Strict Mode double-mounting
      console.warn('Could not set initial model:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Only dispose models if we're truly unmounting (not during drag)
      // Check if the component is being unmounted due to drag operation
      const isDragging = document.querySelector('[data-dragging="true"]');

      if (!isDragging) {
        // Dispose the editor instance first
        if (editorRef.current) {
          try {
            editorRef.current.dispose();
          } catch (e) {
            console.warn('Error disposing editor:', e);
          }
        }

        // Then dispose all models to prevent memory leaks
        modelsRef.current.forEach(model => {
          try {
            if (!model.isDisposed()) {
              model.dispose();
            }
          } catch (e) {
            // Model already disposed
          }
        });
        modelsRef.current.clear();
      }

      // Clear the refs
      editorRef.current = null;
      monacoRef.current = null;
      isInitializedRef.current = false;
    };
  }, []);


  const addFile = () => {
    if (!newFileName.trim()) return;

    if (!newFileName.includes('.')) {
      alert('Please include a file extension (e.g., script.js)');
      return;
    }

    if (editorFiles.find(f => f.name === newFileName)) {
      alert('File already exists');
      return;
    }

    const ext = newFileName.split('.').pop()?.toLowerCase();
    const defaultContent: Record<string, string> = {
      'js': '// JavaScript code here',
      'jsx': '// React component here',
      'ts': '// TypeScript code here',
      'tsx': '// React TypeScript component here',
      'css': '/* CSS styles here */',
      'scss': '/* SCSS styles here */',
      'html': '<!-- HTML markup here -->',
      'json': '{\n  \n}',
      'md': '# Markdown content',
      'py': '# Python code here',
      'java': '// Java code here',
      'c': '// C code here',
      'cpp': '// C++ code here',
      'txt': ''
    };

    const newFile: CodeFile = {
      name: newFileName,
      content: defaultContent[ext || ''] || ''
    };

    const updatedFiles = [...editorFiles, newFile];
    setEditorFiles(updatedFiles);
    setActiveFile(newFileName);
    setNewFileName('');
    setShowAddFile(false);
    
    // Update the ref to prevent re-sync from overwriting
    lastSyncedFilesRef.current = updatedFiles.map(f => f.name).join(',');

    // Create a model for the new file
    if (monacoRef.current && !modelsRef.current.has(newFileName)) {
      const language = getLanguageFromFileName(newFileName);
      const model = monacoRef.current.editor.createModel(newFile.content, language);
      modelsRef.current.set(newFileName, model);

      // Listen to model changes - use a function to get the current fileName
      model.onDidChangeContent(() => {
        const updatedContent = model.getValue();
        // Find the fileName from the model map
        const fileName = Array.from(modelsRef.current.entries()).find(([_, m]) => m === model)?.[0];
        
        if (fileName) {
          setEditorFiles(prev => {
            const updated = prev.map(f =>
              f.name === fileName ? { ...f, content: updatedContent } : f
            );

            // Call onChange with updated files
            if (onChange) {
              onChange(updated);
            }

            return updated;
          });
        }
      });

      // Switch to the new model only if editor exists and isn't disposed
      if (editorRef.current && !(editorRef.current as any)._isDisposed) {
        try {
          editorRef.current.setModel(model);
        } catch (e) {
          console.warn('Could not set model for new file:', e);
        }
      }
    }

    // Call onChange with updated files list
    if (onChange) {
      onChange(updatedFiles);
    }
  };

  const removeFile = (fileName: string) => {
    if (editorFiles.length === 1) {
      alert('Cannot remove the last file');
      return;
    }

    const updatedFiles = editorFiles.filter(f => f.name !== fileName);
    setEditorFiles(updatedFiles);
    
    // Update the ref to prevent re-sync from overwriting
    lastSyncedFilesRef.current = updatedFiles.map(f => f.name).join(',');

    // Dispose the model for the removed file
    const model = modelsRef.current.get(fileName);
    if (model) {
      try {
        if (!model.isDisposed()) {
          model.dispose();
        }
        modelsRef.current.delete(fileName);
      } catch (e) {
        console.warn('Error disposing model:', e);
        modelsRef.current.delete(fileName);
      }
    }

    if (activeFile === fileName) {
      const newActiveFile = updatedFiles[0].name;
      setActiveFile(newActiveFile);

      // Switch to the new active file's model only if editor is not disposed
      if (editorRef.current && !(editorRef.current as any)._isDisposed) {
        const newModel = modelsRef.current.get(newActiveFile);
        if (newModel && !newModel.isDisposed()) {
          try {
            editorRef.current.setModel(newModel);
          } catch (e) {
            console.warn('Could not set model after file removal:', e);
          }
        }
      }
    }

    if (onChange) {
      onChange(updatedFiles);
    }
  };

  // Update theme when it changes
  useEffect(() => {
    if (monacoRef.current && isThemeRegistered) {
      monacoRef.current.editor.setTheme(theme);
    }
  }, [theme, isThemeRegistered]);

  // Handle file switching by changing models
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    // Check if editor is disposed before trying to use it
    try {
      // Check if editor is disposed
      if (!editorRef.current || (editorRef.current as any)._isDisposed || typeof editorRef.current.getModel !== 'function') {
        console.warn('Editor is disposed, skipping model switch');
        return;
      }

      const currentModel = editorRef.current.getModel();

      let model = modelsRef.current.get(activeFile);

      // Create model if it doesn't exist
      if (!model) {
        const currentFile = editorFiles.find(f => f.name === activeFile);
        if (currentFile) {
          const language = getLanguageFromFileName(activeFile);
          const newModel = monacoRef.current.editor.createModel(currentFile.content, language);
          modelsRef.current.set(activeFile, newModel);

          // Listen to model changes - use a closure-safe approach
          newModel.onDidChangeContent(() => {
            const updatedContent = newModel.getValue();
            // Find the fileName from the model map to avoid closure issues
            const fileName = Array.from(modelsRef.current.entries()).find(([_, m]) => m === newModel)?.[0];
            
            if (fileName) {
              setEditorFiles(prev => {
                const updated = prev.map(f =>
                  f.name === fileName ? { ...f, content: updatedContent } : f
                );

                // Call onChange with updated files
                if (onChange) {
                  onChange(updated);
                }

                return updated;
              });
            }
          });

          model = newModel;
        }
      }

      // Switch to the model only if it's different from the current one and not disposed
      if (model && currentModel !== model && !model.isDisposed()) {
        editorRef.current.setModel(model);
      }
    } catch (error) {
      // Editor was disposed, ignore the error
      console.warn('Editor was disposed during model switch:', error);
    }
  }, [activeFile, editorFiles]);

  const currentFile = editorFiles.find(f => f.name === activeFile);
  const currentLanguage = getLanguageFromFileName(activeFile);

  return (
    <div className="w-full flex flex-col bg-background border rounded-lg overflow-hidden">
      {/* File Tabs */}
      <div className="flex items-center gap-2 p-2 bg-muted/50 border-b">
        <Tabs value={activeFile} onValueChange={setActiveFile} className="flex-1">
          <div className="flex items-center gap-2">
            <TabsList className="h-8">
              {editorFiles.map(file => (
                <div key={file.name} className="flex items-center">
                  <TabsTrigger value={file.name} className="h-7 text-xs px-3">
                    <FileCode className="w-3 h-3 mr-1" />
                    {file.name}
                  </TabsTrigger>
                  {editorFiles.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(file.name);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </TabsList>

            {showAddFile ? (
              <div className="flex items-center gap-2">
                <Input
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="filename.js"
                  className="h-7 w-32 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addFile();
                    if (e.key === 'Escape') {
                      setShowAddFile(false);
                      setNewFileName('');
                    }
                  }}
                  autoFocus
                />
                <Button size="sm" className="h-7" onClick={addFile}>
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7"
                  onClick={() => {
                    setShowAddFile(false);
                    setNewFileName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7"
                onClick={() => setShowAddFile(true)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add File
              </Button>
            )}
          </div>
        </Tabs>
      </div>

      {/* Editor Container */}
      <div className="relative" style={{ height }}>
        <MonacoEditor
          height={height}
          width={width}
          onMount={handleEditorDidMount}
          theme={theme}
          options={{
            minimap: { enabled: false },
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
          <span>{currentLanguage.toUpperCase()} • UTF-8</span>
          <span>{currentFile?.content?.length || 0} characters</span>
        </div>
      </div>
    </div>
  );
});

export default CodeEditor;