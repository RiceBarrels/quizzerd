import dynamic from 'next/dynamic';
import { useState, useEffect, useRef, memo, useCallback } from 'react';
import type { Terminal as XTerminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';
import { formatHex, parse } from 'culori';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus, X, Play, Terminal, Loader2, Trash2, ChevronDown, ChevronUp, ChevronRight, Eye, MoreVertical, Pencil, Copy, Download,
  Files, Search, Settings, FolderOpen, Folder, FolderPlus,
  FileJson, FileText, FileCode, FileType, File, FileImage,
  Braces, Hash, Code2, Globe, Database, Cog
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import FileTree, { buildTree, getFolders } from './FileTree';
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
  showOutput?: boolean;
  outputHeight?: string;
  fullscreen?: boolean;
}

interface OutputLine {
  type: 'log' | 'error' | 'warn' | 'info' | 'result';
  content: string;
  timestamp: Date;
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

/**
 * Determines the Monaco editor language mode from a file name based on its extension
 * @param {string} fileName - The file name (e.g., "script.js", "style.css")
 * @returns {string} Monaco editor language identifier (e.g., "javascript", "typescript", "css")
 */
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

/**
 * Multi-file code editor component using Monaco Editor
 * Supports multiple files with tabs, syntax highlighting, and theme customization
 * @param {CodeEditorProps} props - Component props
 * @param {CodeFile[]} [props.files] - Array of code files to display (defaults to a single index.html file)
 * @param {(files: CodeFile[]) => void} [props.onChange] - Callback function called when files are modified
 * @param {string} [props.height="400px"] - Height of the editor
 * @param {string} [props.width="100%"] - Width of the editor
 * @returns {JSX.Element} Code editor component with file tabs and Monaco editor
 */
const CodeEditor = memo(function CodeEditor({
  files = [{ name: 'index.html', content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Document</title>\n</head>\n<body>\n    \n</body>\n</html>\n' }],
  onChange,
  height = '400px',
  width = '100%',
  showOutput = true,
  outputHeight = '200px',
  fullscreen = false
}: CodeEditorProps) {
  const [editorFiles, setEditorFiles] = useState<CodeFile[]>(files);
  const [openTabs, setOpenTabs] = useState<string[]>(files.map(f => f.name)); // Track open tabs separately
  const [activeFile, setActiveFile] = useState<string>(files[0]?.name || 'index.html');
  const [newFileName, setNewFileName] = useState<string>('');
  const [showAddFile, setShowAddFile] = useState<boolean>(false);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>('');
  const [showExplorer, setShowExplorer] = useState<boolean>(true);
  const [activePanel, setActivePanel] = useState<'explorer' | 'search' | 'settings'>('explorer');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [explorerExpanded, setExplorerExpanded] = useState<boolean>(true);
  const [openFilesExpanded, setOpenFilesExpanded] = useState<boolean>(true);

  const [theme, setTheme] = useState<'custom-light' | 'custom-dark'>('custom-light');
  const [isThemeRegistered, setIsThemeRegistered] = useState<boolean>(false);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const modelsRef = useRef<Map<string, Monaco.editor.ITextModel>>(new Map());
  const isInitializedRef = useRef<boolean>(false);
  const lastSyncedFilesRef = useRef<string>('');

  // Output panel state
  const [outputLines, setOutputLines] = useState<OutputLine[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [outputExpanded, setOutputExpanded] = useState(true);
  const [outputTab, setOutputTab] = useState<'console' | 'preview'>('console');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const outputRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const pyodideRef = useRef<any>(null);
  const pyodideLoadingRef = useRef<boolean>(false);

  // Terminal emulator refs
  const terminalContainerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XTerminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [terminalReady, setTerminalReady] = useState(false);

  // Input handling for terminal
  const inputResolverRef = useRef<((value: string) => void) | null>(null);
  const currentLineRef = useRef<string>('');

  // Add output line helper
  const addOutput = useCallback((type: OutputLine['type'], content: string) => {
    setOutputLines(prev => [...prev, { type, content, timestamp: new Date() }]);
  }, []);

  // Clear output
  const clearOutput = useCallback(() => {
    setOutputLines([]);
  }, []);

  // Scroll output to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputLines]);

  // Initialize xterm.js terminal
  useEffect(() => {
    let terminal: XTerminal | null = null;
    let fitAddon: FitAddon | null = null;

    const initTerminal = async () => {
      if (!terminalContainerRef.current || terminalRef.current) return;

      // Dynamically import xterm.js
      const { Terminal } = await import('@xterm/xterm');
      const { FitAddon } = await import('@xterm/addon-fit');

      // Import CSS by injecting a link element
      if (!document.getElementById('xterm-css')) {
        const link = document.createElement('link');
        link.id = 'xterm-css';
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.css';
        document.head.appendChild(link);
        // Wait for CSS to load
        await new Promise<void>((resolve) => {
          link.onload = () => resolve();
          setTimeout(resolve, 500); // Fallback timeout
        });
      }

      terminal = new Terminal({
        cursorBlink: true,
        fontSize: 13,
        fontFamily: '"Fira Code", "Cascadia Code", Consolas, Monaco, monospace',
        theme: {
          background: '#1e1e2e',
          foreground: '#cdd6f4',
          cursor: '#f5e0dc',
          cursorAccent: '#1e1e2e',
          selectionBackground: '#585b70',
          black: '#45475a',
          red: '#f38ba8',
          green: '#a6e3a1',
          yellow: '#f9e2af',
          blue: '#89b4fa',
          magenta: '#f5c2e7',
          cyan: '#94e2d5',
          white: '#bac2de',
          brightBlack: '#585b70',
          brightRed: '#f38ba8',
          brightGreen: '#a6e3a1',
          brightYellow: '#f9e2af',
          brightBlue: '#89b4fa',
          brightMagenta: '#f5c2e7',
          brightCyan: '#94e2d5',
          brightWhite: '#a6adc8',
        },
        convertEol: true,
        scrollback: 1000,
      });

      fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(terminalContainerRef.current);
      fitAddon.fit();

      // Handle input
      terminal.onData((data) => {
        // Handle special keys
        if (data === '\r') {
          // Enter key
          terminal?.write('\r\n');
          if (inputResolverRef.current) {
            const line = currentLineRef.current;
            currentLineRef.current = '';
            inputResolverRef.current(line);
            inputResolverRef.current = null;
          }
        } else if (data === '\x7f' || data === '\b') {
          // Backspace
          if (currentLineRef.current.length > 0) {
            currentLineRef.current = currentLineRef.current.slice(0, -1);
            terminal?.write('\b \b');
          }
        } else if (data === '\x03') {
          // Ctrl+C - interrupt
          terminal?.write('^C\r\n');
          currentLineRef.current = '';
          if (inputResolverRef.current) {
            inputResolverRef.current('');
            inputResolverRef.current = null;
          }
        } else if (data >= ' ' || data === '\t') {
          // Regular character
          currentLineRef.current += data;
          terminal?.write(data);
        }
      });

      terminalRef.current = terminal;
      fitAddonRef.current = fitAddon;
      setTerminalReady(true);

      // Write welcome message
      terminal.writeln('\x1b[34m╔══════════════════════════════════════╗\x1b[0m');
      terminal.writeln('\x1b[34m║\x1b[0m  \x1b[1;32mPython Terminal\x1b[0m                     \x1b[34m║\x1b[0m');
      terminal.writeln('\x1b[34m║\x1b[0m  Click "Run" to execute your code    \x1b[34m║\x1b[0m');
      terminal.writeln('\x1b[34m║\x1b[0m  Type input when prompted             \x1b[34m║\x1b[0m');
      terminal.writeln('\x1b[34m╚══════════════════════════════════════╝\x1b[0m');
      terminal.writeln('');

      // Handle resize
      const handleResize = () => {
        fitAddon?.fit();
      };
      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    };

    initTerminal();

    return () => {
      if (terminal) {
        terminal.dispose();
        terminalRef.current = null;
        fitAddonRef.current = null;
        setTerminalReady(false);
      }
    };
  }, []);

  // Fit terminal when output is expanded or resized
  useEffect(() => {
    if (outputExpanded && fitAddonRef.current && terminalRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 100);
    }
  }, [outputExpanded, outputHeight]);

  // Write to terminal
  const writeToTerminal = useCallback((text: string, type?: 'error' | 'info' | 'success') => {
    if (!terminalRef.current) return;
    const colorCodes: Record<string, string> = {
      error: '\x1b[31m', // Red
      info: '\x1b[34m', // Blue
      success: '\x1b[32m', // Green
    };
    const reset = '\x1b[0m';
    const prefix = type ? colorCodes[type] : '';
    const suffix = type ? reset : '';
    terminalRef.current.write(prefix + text + suffix);
  }, []);

  // Clear terminal
  const clearTerminal = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.clear();
      terminalRef.current.write('\x1b[H\x1b[2J'); // Clear screen and move cursor to home
    }
  }, []);

  // Read line from terminal (returns a promise)
  const readLineFromTerminal = useCallback((prompt: string = ''): Promise<string> => {
    return new Promise((resolve) => {
      if (prompt) {
        terminalRef.current?.write(prompt);
      }
      inputResolverRef.current = resolve;
    });
  }, []);

  // Load Pyodide for Python execution
  const loadPyodide = useCallback(async () => {
    if (pyodideRef.current) return pyodideRef.current;
    if (pyodideLoadingRef.current) {
      // Wait for existing load
      while (pyodideLoadingRef.current && !pyodideRef.current) {
        await new Promise(r => setTimeout(r, 100));
      }
      return pyodideRef.current;
    }

    pyodideLoadingRef.current = true;
    addOutput('info', 'Loading Python runtime...');

    try {
      // Dynamically load Pyodide
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js';
      document.head.appendChild(script);

      await new Promise<void>((resolve, reject) => {
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Pyodide'));
      });

      const pyodide = await (window as any).loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.5/full/',
      });

      pyodideRef.current = pyodide;
      addOutput('info', 'Python runtime loaded successfully');
      return pyodide;
    } catch (error) {
      addOutput('error', `Failed to load Python: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      pyodideLoadingRef.current = false;
    }
  }, [addOutput]);

  // Run Python code with xterm.js terminal using Pyodide's stdin/stdout
  const runPython = useCallback(async (code: string) => {
    const pyodide = await loadPyodide();

    // Ensure terminal is ready
    if (!terminalRef.current) {
      addOutput('error', 'Terminal not initialized');
      return;
    }

    // Switch to console tab and expand output
    setOutputTab('console');
    setOutputExpanded(true);

    // Focus terminal for input
    setTimeout(() => {
      terminalRef.current?.focus();
      fitAddonRef.current?.fit();
    }, 100);

    try {
      // Set up the readline function for input()
      (window as any).__pyodide_readline__ = async () => {
        const input = await readLineFromTerminal();
        return input;
      };

      // Set up stdout/stderr to write to terminal and async input
      await pyodide.runPythonAsync(`
import sys
import builtins
import js
from pyodide.ffi import create_proxy

# Store originals
if not hasattr(builtins, '__original_input__'):
    builtins.__original_input__ = builtins.input

# Custom write function for stdout
class TerminalWriter:
    def __init__(self, is_error=False):
        self.is_error = is_error

    def write(self, text):
        if text:
            formatted = text.replace('\\n', '\\r\\n')
            if self.is_error:
                js.window.__terminal_write_error__(formatted)
            else:
                js.window.__terminal_write__(formatted)

    def flush(self):
        pass

# Set up terminal write functions
sys.stdout = TerminalWriter(is_error=False)
sys.stderr = TerminalWriter(is_error=True)

# Async input function
async def async_input(prompt=""):
    if prompt:
        sys.stdout.write(prompt)
        sys.stdout.flush()
    result = await js.window.__pyodide_readline__()
    return str(result)

builtins.input = lambda prompt="": __import__('asyncio').get_event_loop().run_until_complete(async_input(prompt))
`);

      // Set up terminal write functions
      (window as any).__terminal_write__ = (text: string) => {
        terminalRef.current?.write(text);
      };
      (window as any).__terminal_write_error__ = (text: string) => {
        terminalRef.current?.write('\x1b[31m' + text + '\x1b[0m');
      };

      // Execute the code
      const result = await pyodide.runPythonAsync(code);

      if (result !== undefined && result !== null) {
        const resultStr = result.toString();
        if (resultStr !== 'None' && resultStr !== 'undefined') {
          writeToTerminal('\r\n\x1b[32m>>> ' + resultStr + '\x1b[0m');
        }
      }

      writeToTerminal('\r\n\x1b[90m[Program finished]\x1b[0m\r\n');

    } catch (error: any) {
      const errorMsg = error.message || String(error);
      // Format Python tracebacks nicely
      const formattedError = errorMsg.replace(/\n/g, '\r\n');
      writeToTerminal('\r\n\x1b[31m' + formattedError + '\x1b[0m\r\n');
    } finally {
      // Restore original stdout/stderr and input
      try {
        await pyodide.runPythonAsync(`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
if hasattr(builtins, '__original_input__'):
    builtins.input = builtins.__original_input__
`);
      } catch {}

      // Clean up window functions
      delete (window as any).__pyodide_readline__;
      delete (window as any).__terminal_write__;
      delete (window as any).__terminal_write_error__;
    }
  }, [loadPyodide, addOutput, readLineFromTerminal, writeToTerminal]);

  // Run JavaScript code in sandboxed iframe
  const runJavaScript = useCallback((code: string) => {
    // Create a sandboxed iframe for execution
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox.add('allow-scripts');
    document.body.appendChild(iframe);

    const iframeWindow = iframe.contentWindow;
    if (!iframeWindow) {
      addOutput('error', 'Failed to create sandbox');
      document.body.removeChild(iframe);
      return;
    }

    // Override console methods
    const script = `
      const __output__ = [];
      const originalConsole = { ...console };

      console.log = (...args) => {
        __output__.push({ type: 'log', content: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') });
      };
      console.error = (...args) => {
        __output__.push({ type: 'error', content: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') });
      };
      console.warn = (...args) => {
        __output__.push({ type: 'warn', content: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') });
      };
      console.info = (...args) => {
        __output__.push({ type: 'info', content: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') });
      };

      try {
        const __result__ = eval(${JSON.stringify(code)});
        if (__result__ !== undefined) {
          __output__.push({ type: 'result', content: '→ ' + (typeof __result__ === 'object' ? JSON.stringify(__result__, null, 2) : String(__result__)) });
        }
        window.parent.postMessage({ type: 'output', data: __output__ }, '*');
      } catch (e) {
        __output__.push({ type: 'error', content: e.message || String(e) });
        window.parent.postMessage({ type: 'output', data: __output__ }, '*');
      }
    `;

    // Listen for output
    const handleMessage = (event: MessageEvent) => {
      if (event.source === iframeWindow && event.data?.type === 'output') {
        event.data.data.forEach((line: { type: OutputLine['type']; content: string }) => {
          addOutput(line.type, line.content);
        });
        window.removeEventListener('message', handleMessage);
        document.body.removeChild(iframe);
      }
    };

    window.addEventListener('message', handleMessage);

    // Execute in iframe
    const doc = iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(`<script>${script}<\/script>`);
      doc.close();
    }

    // Timeout cleanup
    setTimeout(() => {
      window.removeEventListener('message', handleMessage);
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    }, 5000);
  }, [addOutput]);

  // Run HTML/CSS/JS preview
  const runHtmlPreview = useCallback((files: CodeFile[]) => {
    const htmlFile = files.find(f => f.name.endsWith('.html'));
    const cssFiles = files.filter(f => f.name.endsWith('.css'));
    const jsFiles = files.filter(f => f.name.endsWith('.js') || f.name.endsWith('.ts'));

    if (!htmlFile) {
      addOutput('error', 'No HTML file found for preview');
      return;
    }

    let html = htmlFile.content;

    // Inject CSS
    cssFiles.forEach(cssFile => {
      const styleTag = `<style>/* ${cssFile.name} */\n${cssFile.content}</style>`;
      if (html.includes('</head>')) {
        html = html.replace('</head>', `${styleTag}\n</head>`);
      } else {
        html = styleTag + html;
      }
    });

    // Inject JS with console capture
    const consoleCapture = `
      <script>
        const __output__ = [];
        console.log = (...args) => {
          const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
          __output__.push({ type: 'log', content: msg });
          window.parent.postMessage({ type: 'console', data: { type: 'log', content: msg } }, '*');
        };
        console.error = (...args) => {
          const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
          __output__.push({ type: 'error', content: msg });
          window.parent.postMessage({ type: 'console', data: { type: 'error', content: msg } }, '*');
        };
        console.warn = (...args) => {
          const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
          __output__.push({ type: 'warn', content: msg });
          window.parent.postMessage({ type: 'console', data: { type: 'warn', content: msg } }, '*');
        };
        window.onerror = (msg, src, line, col, err) => {
          window.parent.postMessage({ type: 'console', data: { type: 'error', content: msg + ' (line ' + line + ')' } }, '*');
        };
      <\/script>
    `;

    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${consoleCapture}`);
    } else if (html.includes('<html>')) {
      html = html.replace('<html>', `<html><head>${consoleCapture}</head>`);
    } else {
      html = consoleCapture + html;
    }

    // Inject JS files
    jsFiles.forEach(jsFile => {
      const scriptTag = `<script>/* ${jsFile.name} */\n${jsFile.content}<\/script>`;
      if (html.includes('</body>')) {
        html = html.replace('</body>', `${scriptTag}\n</body>`);
      } else {
        html = html + scriptTag;
      }
    });

    // Set preview HTML and switch to preview tab
    setPreviewHtml(html);
    setOutputTab('preview');
    addOutput('info', 'Preview rendered in iframe');
  }, [addOutput]);

  // Run code based on current language
  const runCode = useCallback(async () => {
    setIsRunning(true);
    clearOutput();

    const currentFile = editorFiles.find(f => f.name === activeFile);
    if (!currentFile) {
      addOutput('error', 'No file selected');
      setIsRunning(false);
      return;
    }

    const language = getLanguageFromFileName(activeFile);
    addOutput('info', `Running ${activeFile}...`);

    try {
      switch (language) {
        case 'python':
          await runPython(currentFile.content);
          break;

        case 'javascript':
        case 'typescript':
          runJavaScript(currentFile.content);
          break;

        case 'html':
          runHtmlPreview(editorFiles);
          break;

        default:
          addOutput('warn', `Language "${language}" is not supported for execution. Supported: Python, JavaScript, HTML`);
      }
    } catch (error) {
      addOutput('error', error instanceof Error ? error.message : String(error));
    } finally {
      setIsRunning(false);
    }
  }, [editorFiles, activeFile, clearOutput, addOutput, runPython, runJavaScript, runHtmlPreview]);

  // Listen for console messages from preview iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'console') {
        addOutput(event.data.data.type, event.data.data.content);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [addOutput]);

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

    // Python IntelliSense - Comprehensive autocomplete
    monaco.languages.registerCompletionItemProvider('python', {
      triggerCharacters: ['.', ' ', '(', ',', '['],
      provideCompletionItems: async (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        // Get the text before cursor to understand context
        const lineContent = model.getLineContent(position.lineNumber);
        const textBeforeCursor = lineContent.substring(0, position.column - 1);
        const fullCode = model.getValue();

        const suggestions: any[] = [];

        // Check if we're after a dot (attribute access)
        const dotMatch = textBeforeCursor.match(/(\w+)\.\s*$/);
        if (dotMatch) {
          const objName = dotMatch[1];

          // String methods
          if (['str', 's', 'string', 'text', 'name', 'line', 'word'].some(n => objName.toLowerCase().includes(n)) || /["']/.test(textBeforeCursor)) {
            const stringMethods = [
              { label: 'upper', detail: '() -> str', doc: 'Return a copy of the string with all characters converted to uppercase.' },
              { label: 'lower', detail: '() -> str', doc: 'Return a copy of the string with all characters converted to lowercase.' },
              { label: 'strip', detail: '(chars=None) -> str', doc: 'Return a copy of the string with leading and trailing whitespace removed.' },
              { label: 'split', detail: '(sep=None, maxsplit=-1) -> list', doc: 'Return a list of the words in the string, using sep as the delimiter.' },
              { label: 'join', detail: '(iterable) -> str', doc: 'Concatenate any number of strings with the string as separator.' },
              { label: 'replace', detail: '(old, new, count=-1) -> str', doc: 'Return a copy with all occurrences of old replaced by new.' },
              { label: 'find', detail: '(sub, start=0, end=len) -> int', doc: 'Return the lowest index where substring sub is found.' },
              { label: 'startswith', detail: '(prefix) -> bool', doc: 'Return True if string starts with the prefix.' },
              { label: 'endswith', detail: '(suffix) -> bool', doc: 'Return True if string ends with the suffix.' },
              { label: 'format', detail: '(*args, **kwargs) -> str', doc: 'Perform string formatting.' },
              { label: 'isdigit', detail: '() -> bool', doc: 'Return True if all characters are digits.' },
              { label: 'isalpha', detail: '() -> bool', doc: 'Return True if all characters are alphabetic.' },
              { label: 'count', detail: '(sub) -> int', doc: 'Return the number of non-overlapping occurrences of substring sub.' },
            ];
            stringMethods.forEach(m => {
              suggestions.push({
                label: m.label,
                kind: monaco.languages.CompletionItemKind.Method,
                insertText: m.label + '($1)',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: m.detail,
                documentation: m.doc,
                range: range
              });
            });
          }

          // List methods
          if (['list', 'arr', 'array', 'items', 'data', 'results'].some(n => objName.toLowerCase().includes(n))) {
            const listMethods = [
              { label: 'append', detail: '(item) -> None', doc: 'Append item to the end of the list.' },
              { label: 'extend', detail: '(iterable) -> None', doc: 'Extend list by appending elements from the iterable.' },
              { label: 'insert', detail: '(index, item) -> None', doc: 'Insert item before index.' },
              { label: 'remove', detail: '(item) -> None', doc: 'Remove first occurrence of item.' },
              { label: 'pop', detail: '(index=-1) -> item', doc: 'Remove and return item at index.' },
              { label: 'clear', detail: '() -> None', doc: 'Remove all items from list.' },
              { label: 'index', detail: '(item) -> int', doc: 'Return first index of item.' },
              { label: 'count', detail: '(item) -> int', doc: 'Return number of occurrences of item.' },
              { label: 'sort', detail: '(key=None, reverse=False) -> None', doc: 'Sort the list in ascending order.' },
              { label: 'reverse', detail: '() -> None', doc: 'Reverse the elements of the list in place.' },
              { label: 'copy', detail: '() -> list', doc: 'Return a shallow copy of the list.' },
            ];
            listMethods.forEach(m => {
              suggestions.push({
                label: m.label,
                kind: monaco.languages.CompletionItemKind.Method,
                insertText: m.label + '($1)',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: m.detail,
                documentation: m.doc,
                range: range
              });
            });
          }

          // Dict methods
          if (['dict', 'map', 'obj', 'config', 'settings', 'options'].some(n => objName.toLowerCase().includes(n))) {
            const dictMethods = [
              { label: 'keys', detail: '() -> dict_keys', doc: 'Return a view of dictionary keys.' },
              { label: 'values', detail: '() -> dict_values', doc: 'Return a view of dictionary values.' },
              { label: 'items', detail: '() -> dict_items', doc: 'Return a view of dictionary items (key-value pairs).' },
              { label: 'get', detail: '(key, default=None) -> value', doc: 'Return value for key, or default if key not present.' },
              { label: 'pop', detail: '(key, default) -> value', doc: 'Remove and return value for key.' },
              { label: 'update', detail: '(other) -> None', doc: 'Update dictionary with key-value pairs from other.' },
              { label: 'setdefault', detail: '(key, default=None) -> value', doc: 'If key is in dict, return its value. If not, insert key with default value.' },
              { label: 'clear', detail: '() -> None', doc: 'Remove all items from dictionary.' },
              { label: 'copy', detail: '() -> dict', doc: 'Return a shallow copy of the dictionary.' },
            ];
            dictMethods.forEach(m => {
              suggestions.push({
                label: m.label,
                kind: monaco.languages.CompletionItemKind.Method,
                insertText: m.label + '($1)',
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                detail: m.detail,
                documentation: m.doc,
                range: range
              });
            });
          }
        }

        // Check if we're typing an import statement
        const importMatch = textBeforeCursor.match(/^\s*(from\s+\w*|import\s+\w*)$/);
        if (importMatch || textBeforeCursor.trim().startsWith('import') || textBeforeCursor.trim().startsWith('from')) {
          const modules = [
            { name: 'os', doc: 'Operating system interfaces' },
            { name: 'sys', doc: 'System-specific parameters and functions' },
            { name: 'json', doc: 'JSON encoder and decoder' },
            { name: 'math', doc: 'Mathematical functions' },
            { name: 'random', doc: 'Generate pseudo-random numbers' },
            { name: 'datetime', doc: 'Basic date and time types' },
            { name: 're', doc: 'Regular expression operations' },
            { name: 'collections', doc: 'Container datatypes' },
            { name: 'itertools', doc: 'Functions creating iterators' },
            { name: 'functools', doc: 'Higher-order functions' },
            { name: 'typing', doc: 'Support for type hints' },
            { name: 'dataclasses', doc: 'Data class decorator and functions' },
            { name: 'pathlib', doc: 'Object-oriented filesystem paths' },
            { name: 'io', doc: 'Core tools for working with streams' },
            { name: 'time', doc: 'Time access and conversions' },
            { name: 'copy', doc: 'Shallow and deep copy operations' },
            { name: 'csv', doc: 'CSV file reading and writing' },
            { name: 'string', doc: 'Common string operations' },
            { name: 'textwrap', doc: 'Text wrapping and filling' },
            { name: 'enum', doc: 'Support for enumerations' },
            { name: 'heapq', doc: 'Heap queue algorithm' },
            { name: 'bisect', doc: 'Array bisection algorithm' },
            { name: 'statistics', doc: 'Mathematical statistics functions' },
          ];
          modules.forEach(m => {
            suggestions.push({
              label: m.name,
              kind: monaco.languages.CompletionItemKind.Module,
              insertText: m.name,
              documentation: m.doc,
              range: range
            });
          });
        }

        // Python built-in functions with documentation
        const builtinFunctions = [
          { name: 'print', sig: '(*objects, sep=" ", end="\\n")', doc: 'Print objects to the text stream file.' },
          { name: 'len', sig: '(s)', doc: 'Return the number of items in a container.' },
          { name: 'range', sig: '(stop) / (start, stop, step)', doc: 'Return an immutable sequence type.' },
          { name: 'str', sig: '(object)', doc: 'Return a string version of object.' },
          { name: 'int', sig: '(x, base=10)', doc: 'Convert a number or string to an integer.' },
          { name: 'float', sig: '(x)', doc: 'Convert a string or number to a floating point number.' },
          { name: 'list', sig: '(iterable)', doc: 'Create a list from an iterable.' },
          { name: 'dict', sig: '(**kwargs)', doc: 'Create a new dictionary.' },
          { name: 'set', sig: '(iterable)', doc: 'Create a new set object.' },
          { name: 'tuple', sig: '(iterable)', doc: 'Create a new tuple object.' },
          { name: 'bool', sig: '(x)', doc: 'Convert a value to a Boolean.' },
          { name: 'type', sig: '(object)', doc: 'Return the type of an object.' },
          { name: 'isinstance', sig: '(object, classinfo)', doc: 'Return whether an object is an instance of a class.' },
          { name: 'input', sig: '(prompt="")', doc: 'Read a line from input.' },
          { name: 'open', sig: '(file, mode="r")', doc: 'Open a file and return a file object.' },
          { name: 'sum', sig: '(iterable, start=0)', doc: 'Sum of all items in iterable.' },
          { name: 'min', sig: '(iterable) / (*args)', doc: 'Return the smallest item.' },
          { name: 'max', sig: '(iterable) / (*args)', doc: 'Return the largest item.' },
          { name: 'abs', sig: '(x)', doc: 'Return the absolute value of a number.' },
          { name: 'round', sig: '(number, ndigits=None)', doc: 'Round a number to ndigits precision.' },
          { name: 'sorted', sig: '(iterable, key=None, reverse=False)', doc: 'Return a new sorted list.' },
          { name: 'reversed', sig: '(seq)', doc: 'Return a reverse iterator.' },
          { name: 'enumerate', sig: '(iterable, start=0)', doc: 'Return an enumerate object.' },
          { name: 'zip', sig: '(*iterables)', doc: 'Iterate over several iterables in parallel.' },
          { name: 'map', sig: '(function, iterable)', doc: 'Apply function to every item of iterable.' },
          { name: 'filter', sig: '(function, iterable)', doc: 'Construct an iterator from elements of iterable for which function returns true.' },
          { name: 'any', sig: '(iterable)', doc: 'Return True if any element of the iterable is true.' },
          { name: 'all', sig: '(iterable)', doc: 'Return True if all elements of the iterable are true.' },
          { name: 'ord', sig: '(c)', doc: 'Return the Unicode code point for a one-character string.' },
          { name: 'chr', sig: '(i)', doc: 'Return the string representing a character.' },
          { name: 'bin', sig: '(x)', doc: 'Convert an integer to a binary string.' },
          { name: 'hex', sig: '(x)', doc: 'Convert an integer to a hexadecimal string.' },
          { name: 'format', sig: '(value, format_spec="")', doc: 'Convert a value to a formatted string.' },
          { name: 'hasattr', sig: '(object, name)', doc: 'Return whether the object has an attribute with the given name.' },
          { name: 'getattr', sig: '(object, name, default)', doc: 'Return the value of the named attribute of object.' },
          { name: 'setattr', sig: '(object, name, value)', doc: 'Set a named attribute on an object.' },
          { name: 'callable', sig: '(object)', doc: 'Return True if object appears callable.' },
          { name: 'repr', sig: '(object)', doc: 'Return a string containing a printable representation.' },
          { name: 'exec', sig: '(code)', doc: 'Execute Python code dynamically.' },
          { name: 'eval', sig: '(expression)', doc: 'Evaluate a Python expression.' },
          { name: 'id', sig: '(object)', doc: 'Return the identity of an object.' },
          { name: 'hash', sig: '(object)', doc: 'Return the hash value of an object.' },
          { name: 'dir', sig: '(object)', doc: 'List of valid attributes for that object.' },
          { name: 'help', sig: '(object)', doc: 'Invoke the built-in help system.' },
          { name: 'vars', sig: '(object)', doc: 'Return the __dict__ attribute.' },
          { name: 'globals', sig: '()', doc: 'Return the dictionary implementing the current module namespace.' },
          { name: 'locals', sig: '()', doc: 'Return a dictionary containing the current scope\'s local variables.' },
          { name: 'iter', sig: '(object)', doc: 'Return an iterator object.' },
          { name: 'next', sig: '(iterator, default)', doc: 'Retrieve the next item from the iterator.' },
          { name: 'slice', sig: '(stop) / (start, stop, step)', doc: 'Return a slice object.' },
          { name: 'object', sig: '()', doc: 'Return a new featureless object.' },
          { name: 'super', sig: '(type, object)', doc: 'Return a proxy object that delegates method calls to a parent.' },
          { name: 'classmethod', sig: '(function)', doc: 'Transform a method into a class method.' },
          { name: 'staticmethod', sig: '(function)', doc: 'Transform a method into a static method.' },
          { name: 'property', sig: '(fget, fset, fdel, doc)', doc: 'Return a property attribute.' },
        ];

        builtinFunctions.forEach(f => {
          suggestions.push({
            label: f.name,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: f.name + '($1)',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: f.sig,
            documentation: f.doc,
            range: range
          });
        });

        // Python keywords
        const keywords = [
          'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
          'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
          'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is',
          'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try',
          'while', 'with', 'yield'
        ];

        keywords.forEach(kw => {
          suggestions.push({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range: range
          });
        });

        // Code snippets
        const snippets = [
          {
            label: 'def',
            insertText: 'def ${1:function_name}(${2:params}):\n    ${3:pass}',
            doc: 'Define a function'
          },
          {
            label: 'class',
            insertText: 'class ${1:ClassName}:\n    def __init__(self${2:, params}):\n        ${3:pass}',
            doc: 'Define a class'
          },
          {
            label: 'if',
            insertText: 'if ${1:condition}:\n    ${2:pass}',
            doc: 'If statement'
          },
          {
            label: 'ifelse',
            insertText: 'if ${1:condition}:\n    ${2:pass}\nelse:\n    ${3:pass}',
            doc: 'If-else statement'
          },
          {
            label: 'ifelif',
            insertText: 'if ${1:condition}:\n    ${2:pass}\nelif ${3:condition}:\n    ${4:pass}\nelse:\n    ${5:pass}',
            doc: 'If-elif-else statement'
          },
          {
            label: 'for',
            insertText: 'for ${1:item} in ${2:iterable}:\n    ${3:pass}',
            doc: 'For loop'
          },
          {
            label: 'forrange',
            insertText: 'for ${1:i} in range(${2:n}):\n    ${3:pass}',
            doc: 'For loop with range'
          },
          {
            label: 'forenumerate',
            insertText: 'for ${1:i}, ${2:item} in enumerate(${3:iterable}):\n    ${4:pass}',
            doc: 'For loop with enumerate'
          },
          {
            label: 'while',
            insertText: 'while ${1:condition}:\n    ${2:pass}',
            doc: 'While loop'
          },
          {
            label: 'try',
            insertText: 'try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${4:pass}',
            doc: 'Try-except block'
          },
          {
            label: 'tryfinally',
            insertText: 'try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${4:pass}\nfinally:\n    ${5:pass}',
            doc: 'Try-except-finally block'
          },
          {
            label: 'with',
            insertText: 'with ${1:context_manager} as ${2:var}:\n    ${3:pass}',
            doc: 'With statement (context manager)'
          },
          {
            label: 'withopen',
            insertText: 'with open(${1:filename}, "${2:r}") as ${3:f}:\n    ${4:data = f.read()}',
            doc: 'Open file with context manager'
          },
          {
            label: 'lambda',
            insertText: 'lambda ${1:x}: ${2:x}',
            doc: 'Lambda function'
          },
          {
            label: 'listcomp',
            insertText: '[${1:expr} for ${2:item} in ${3:iterable}]',
            doc: 'List comprehension'
          },
          {
            label: 'listcompif',
            insertText: '[${1:expr} for ${2:item} in ${3:iterable} if ${4:condition}]',
            doc: 'List comprehension with condition'
          },
          {
            label: 'dictcomp',
            insertText: '{${1:key}: ${2:value} for ${3:item} in ${4:iterable}}',
            doc: 'Dictionary comprehension'
          },
          {
            label: 'setcomp',
            insertText: '{${1:expr} for ${2:item} in ${3:iterable}}',
            doc: 'Set comprehension'
          },
          {
            label: 'genexp',
            insertText: '(${1:expr} for ${2:item} in ${3:iterable})',
            doc: 'Generator expression'
          },
          {
            label: 'main',
            insertText: 'if __name__ == "__main__":\n    ${1:main()}',
            doc: 'Main entry point'
          },
          {
            label: 'defmain',
            insertText: 'def main():\n    ${1:pass}\n\n\nif __name__ == "__main__":\n    main()',
            doc: 'Main function with entry point'
          },
          {
            label: '@property',
            insertText: '@property\ndef ${1:name}(self):\n    return self._${1:name}',
            doc: 'Property decorator'
          },
          {
            label: '@staticmethod',
            insertText: '@staticmethod\ndef ${1:method_name}(${2:params}):\n    ${3:pass}',
            doc: 'Static method decorator'
          },
          {
            label: '@classmethod',
            insertText: '@classmethod\ndef ${1:method_name}(cls${2:, params}):\n    ${3:pass}',
            doc: 'Class method decorator'
          },
          {
            label: 'dataclass',
            insertText: 'from dataclasses import dataclass\n\n@dataclass\nclass ${1:ClassName}:\n    ${2:field}: ${3:type}',
            doc: 'Dataclass definition'
          },
          {
            label: 'async def',
            insertText: 'async def ${1:function_name}(${2:params}):\n    ${3:pass}',
            doc: 'Async function definition'
          },
          {
            label: 'await',
            insertText: 'await ${1:coroutine}',
            doc: 'Await expression'
          },
        ];

        snippets.forEach(s => {
          suggestions.push({
            label: s.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: s.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: s.doc,
            range: range
          });
        });

        // Extract local variables and functions from current code
        const variablePattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g;
        const functionPattern = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
        const classPattern = /class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[:(]/g;

        const localVars = new Set<string>();
        const localFuncs = new Set<string>();
        const localClasses = new Set<string>();

        let match;
        while ((match = variablePattern.exec(fullCode)) !== null) {
          localVars.add(match[1]);
        }
        while ((match = functionPattern.exec(fullCode)) !== null) {
          localFuncs.add(match[1]);
        }
        while ((match = classPattern.exec(fullCode)) !== null) {
          localClasses.add(match[1]);
        }

        localVars.forEach(v => {
          if (!keywords.includes(v) && !builtinFunctions.some(f => f.name === v)) {
            suggestions.push({
              label: v,
              kind: monaco.languages.CompletionItemKind.Variable,
              insertText: v,
              detail: 'Local variable',
              range: range
            });
          }
        });

        localFuncs.forEach(f => {
          if (!builtinFunctions.some(bf => bf.name === f)) {
            suggestions.push({
              label: f,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: f + '($1)',
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: 'Local function',
              range: range
            });
          }
        });

        localClasses.forEach(c => {
          suggestions.push({
            label: c,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: c + '($1)',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: 'Local class',
            range: range
          });
        });

        return { suggestions };
      }
    });

    // Python signature help (function parameter hints)
    monaco.languages.registerSignatureHelpProvider('python', {
      signatureHelpTriggerCharacters: ['(', ','],
      provideSignatureHelp: (model, position) => {
        const lineContent = model.getLineContent(position.lineNumber);
        const textBeforeCursor = lineContent.substring(0, position.column - 1);

        // Find the function name
        const funcMatch = textBeforeCursor.match(/(\w+)\s*\([^)]*$/);
        if (!funcMatch) return null;

        const funcName = funcMatch[1];

        // Built-in function signatures
        const signatures: Record<string, { label: string; doc: string; params: { label: string; doc: string }[] }> = {
          'print': {
            label: 'print(*objects, sep=" ", end="\\n", file=sys.stdout, flush=False)',
            doc: 'Print objects to the text stream file, separated by sep and followed by end.',
            params: [
              { label: '*objects', doc: 'Values to be printed' },
              { label: 'sep=" "', doc: 'String inserted between values' },
              { label: 'end="\\n"', doc: 'String appended after the last value' },
              { label: 'file=sys.stdout', doc: 'A file-like object (stream)' },
              { label: 'flush=False', doc: 'Whether to forcibly flush the stream' },
            ]
          },
          'range': {
            label: 'range(stop) / range(start, stop[, step])',
            doc: 'Return an immutable sequence type.',
            params: [
              { label: 'start', doc: 'Start value (default 0)' },
              { label: 'stop', doc: 'Stop value (exclusive)' },
              { label: 'step', doc: 'Step value (default 1)' },
            ]
          },
          'len': {
            label: 'len(s)',
            doc: 'Return the number of items in a container.',
            params: [
              { label: 's', doc: 'A sequence (string, bytes, tuple, list, or range) or a collection (dictionary, set)' },
            ]
          },
          'open': {
            label: 'open(file, mode="r", buffering=-1, encoding=None, errors=None, newline=None, closefd=True, opener=None)',
            doc: 'Open file and return a corresponding file object.',
            params: [
              { label: 'file', doc: 'A path-like object giving the pathname' },
              { label: 'mode="r"', doc: '"r" open for reading, "w" for writing, "a" for appending, "b" for binary' },
              { label: 'encoding', doc: 'Name of the encoding used to decode or encode the file' },
            ]
          },
          'sorted': {
            label: 'sorted(iterable, *, key=None, reverse=False)',
            doc: 'Return a new sorted list from the items in iterable.',
            params: [
              { label: 'iterable', doc: 'Items to sort' },
              { label: 'key=None', doc: 'A function of one argument that extracts a comparison key' },
              { label: 'reverse=False', doc: 'If True, sort in descending order' },
            ]
          },
          'enumerate': {
            label: 'enumerate(iterable, start=0)',
            doc: 'Return an enumerate object.',
            params: [
              { label: 'iterable', doc: 'A sequence or iterator' },
              { label: 'start=0', doc: 'The count starts from this value' },
            ]
          },
          'zip': {
            label: 'zip(*iterables, strict=False)',
            doc: 'Iterate over several iterables in parallel.',
            params: [
              { label: '*iterables', doc: 'Any number of iterables' },
              { label: 'strict=False', doc: 'If True, raise error if iterables have different lengths' },
            ]
          },
          'map': {
            label: 'map(function, iterable, *iterables)',
            doc: 'Return an iterator that applies function to every item of iterable.',
            params: [
              { label: 'function', doc: 'A function to apply' },
              { label: 'iterable', doc: 'An iterable whose items are passed to function' },
            ]
          },
          'filter': {
            label: 'filter(function, iterable)',
            doc: 'Construct an iterator from those elements of iterable for which function returns true.',
            params: [
              { label: 'function', doc: 'A function that returns True/False' },
              { label: 'iterable', doc: 'An iterable to filter' },
            ]
          },
          'input': {
            label: 'input(prompt="")',
            doc: 'Read a line from input.',
            params: [
              { label: 'prompt=""', doc: 'The prompt string, if given' },
            ]
          },
        };

        const sig = signatures[funcName];
        if (!sig) return null;

        // Count commas to determine active parameter
        const afterParen = textBeforeCursor.substring(textBeforeCursor.lastIndexOf('(') + 1);
        const commaCount = (afterParen.match(/,/g) || []).length;

        return {
          value: {
            signatures: [{
              label: sig.label,
              documentation: sig.doc,
              parameters: sig.params.map(p => ({
                label: p.label,
                documentation: p.doc
              }))
            }],
            activeSignature: 0,
            activeParameter: Math.min(commaCount, sig.params.length - 1)
          },
          dispose: () => {}
        };
      }
    });

    // Python hover provider
    monaco.languages.registerHoverProvider('python', {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const hoveredWord = word.word;

        // Built-in function documentation
        const docs: Record<string, string> = {
          'print': '**print**(*objects, sep=" ", end="\\n")\n\nPrint objects to the text stream.',
          'len': '**len**(s) → int\n\nReturn the number of items in a container.',
          'range': '**range**(stop) / **range**(start, stop[, step])\n\nReturn an immutable sequence.',
          'str': '**str**(object="") → str\n\nReturn a string version of object.',
          'int': '**int**(x, base=10) → int\n\nConvert a number or string to an integer.',
          'float': '**float**(x) → float\n\nConvert a string or number to floating point.',
          'list': '**list**([iterable]) → list\n\nBuild a list from an iterable.',
          'dict': '**dict**(**kwargs) → dict\n\nCreate a new dictionary.',
          'set': '**set**([iterable]) → set\n\nBuild an unordered collection of unique elements.',
          'tuple': '**tuple**([iterable]) → tuple\n\nBuild an immutable sequence.',
          'bool': '**bool**(x) → bool\n\nConvert a value to a Boolean.',
          'type': '**type**(object) → type\n\nReturn the type of an object.',
          'isinstance': '**isinstance**(object, classinfo) → bool\n\nReturn True if object is an instance.',
          'input': '**input**(prompt="") → str\n\nRead a line from input.',
          'open': '**open**(file, mode="r") → file object\n\nOpen a file and return a file object.',
          'sum': '**sum**(iterable, start=0) → number\n\nReturn the sum of all items.',
          'min': '**min**(iterable) / **min**(*args) → value\n\nReturn the smallest item.',
          'max': '**max**(iterable) / **max**(*args) → value\n\nReturn the largest item.',
          'sorted': '**sorted**(iterable, key=None, reverse=False) → list\n\nReturn a new sorted list.',
          'reversed': '**reversed**(seq) → iterator\n\nReturn a reverse iterator.',
          'enumerate': '**enumerate**(iterable, start=0) → iterator\n\nReturn an enumerate object.',
          'zip': '**zip**(*iterables) → iterator\n\nIterate over several iterables in parallel.',
          'map': '**map**(function, iterable) → iterator\n\nApply function to every item.',
          'filter': '**filter**(function, iterable) → iterator\n\nFilter items based on function.',
          'any': '**any**(iterable) → bool\n\nReturn True if any element is true.',
          'all': '**all**(iterable) → bool\n\nReturn True if all elements are true.',
          'abs': '**abs**(x) → number\n\nReturn the absolute value.',
          'round': '**round**(number[, ndigits]) → number\n\nRound a number to ndigits precision.',
          'def': '**def** function_name(parameters):\n\nDefine a function.',
          'class': '**class** ClassName:\n\nDefine a class.',
          'if': '**if** condition:\n\nConditional statement.',
          'for': '**for** item **in** iterable:\n\nIterate over items.',
          'while': '**while** condition:\n\nLoop while condition is true.',
          'try': '**try**:\n    ...\n**except** Exception:\n    ...\n\nHandle exceptions.',
          'with': '**with** expression **as** variable:\n\nContext manager.',
          'import': '**import** module\n\nImport a module.',
          'from': '**from** module **import** name\n\nImport specific names from a module.',
          'return': '**return** [expression]\n\nReturn a value from a function.',
          'yield': '**yield** [expression]\n\nProduce a value in a generator.',
          'lambda': '**lambda** arguments: expression\n\nCreate an anonymous function.',
          'raise': '**raise** [exception]\n\nRaise an exception.',
          'assert': '**assert** condition[, message]\n\nRaise AssertionError if condition is false.',
          'pass': '**pass**\n\nNull operation — do nothing.',
          'break': '**break**\n\nExit the innermost loop.',
          'continue': '**continue**\n\nContinue with the next iteration of the loop.',
          'global': '**global** name\n\nDeclare a global variable.',
          'nonlocal': '**nonlocal** name\n\nDeclare a non-local variable.',
          'async': '**async def** function_name():\n\nDefine an asynchronous function.',
          'await': '**await** coroutine\n\nSuspend execution until coroutine completes.',
          'True': '**True**\n\nBoolean true value.',
          'False': '**False**\n\nBoolean false value.',
          'None': '**None**\n\nThe null object.',
        };

        const doc = docs[hoveredWord];
        if (!doc) return null;

        return {
          range: {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn
          },
          contents: [
            { value: doc }
          ]
        };
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

  // Python syntax validation using Pyodide
  const validatePythonSyntax = useCallback(async (code: string, monaco: typeof Monaco, model: Monaco.editor.ITextModel) => {
    const markers: Monaco.editor.IMarkerData[] = [];

    // First, do basic checks that don't need Pyodide
    const lines = code.split('\n');
    lines.forEach((line, lineNumber) => {
      // Check for inconsistent indentation (tabs and spaces mixed)
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

    // If Pyodide is loaded, use it for real syntax validation
    if (pyodideRef.current) {
      try {
        // Use Python's ast module to check syntax
        await pyodideRef.current.runPythonAsync(`
import ast
import sys
from io import StringIO

_syntax_errors = []

try:
    ast.parse(${JSON.stringify(code)})
except SyntaxError as e:
    _syntax_errors.append({
        'line': e.lineno or 1,
        'col': e.offset or 1,
        'msg': e.msg or str(e),
        'end_line': getattr(e, 'end_lineno', e.lineno) or 1,
        'end_col': getattr(e, 'end_offset', e.offset) or 1
    })
except Exception as e:
    _syntax_errors.append({
        'line': 1,
        'col': 1,
        'msg': str(e),
        'end_line': 1,
        'end_col': 1
    })
        `);

        const errors = await pyodideRef.current.runPythonAsync('_syntax_errors');
        const errorList = errors.toJs();

        errorList.forEach((err: any) => {
          markers.push({
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: err.get('line'),
            startColumn: err.get('col'),
            endLineNumber: err.get('end_line'),
            endColumn: err.get('end_col') + 1,
            message: `SyntaxError: ${err.get('msg')}`
          });
        });

        // Clean up
        await pyodideRef.current.runPythonAsync('del _syntax_errors');
      } catch (e) {
        // Pyodide error, fall back to basic checks
        console.warn('Pyodide syntax check failed:', e);
      }
    } else {
      // Fallback: Basic regex checks when Pyodide isn't loaded
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
      });
    }

    monaco.editor.setModelMarkers(model, 'python', markers);
  }, []);

  const setupLinting = (editor: Monaco.editor.IStandaloneCodeEditor, monaco: typeof Monaco) => {
    let pythonValidationTimeout: NodeJS.Timeout;
    let javaValidationTimeout: NodeJS.Timeout;

    // Listen to content changes
    editor.onDidChangeModelContent(() => {
      const model = editor.getModel();
      if (!model) return;

      const language = model.getLanguageId();

      // Python linting with Pyodide
      if (language === 'python') {
        clearTimeout(pythonValidationTimeout);
        pythonValidationTimeout = setTimeout(() => {
          const code = model.getValue();
          validatePythonSyntax(code, monaco, model);
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

              // Call onChange with updated files - defer to avoid calling during render
              if (onChange) {
                setTimeout(() => {
                  onChange(updated);
                }, 0);
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
      'html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Document</title>\n</head>\n<body>\n    \n</body>\n</html>\n',
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
    setOpenTabs(prev => [...prev, newFileName]); // Add to open tabs
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

    // Also remove from open tabs
    setOpenTabs(prev => prev.filter(name => name !== fileName));

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

  // Close a tab without deleting the file
  const closeTab = (fileName: string) => {
    if (openTabs.length === 1) {
      // Don't close the last tab
      return;
    }

    const newOpenTabs = openTabs.filter(name => name !== fileName);
    setOpenTabs(newOpenTabs);

    // If closing the active tab, switch to another tab
    if (activeFile === fileName) {
      const currentIndex = openTabs.indexOf(fileName);
      // Prefer the tab to the left, or the first remaining tab
      const newActiveFile = newOpenTabs[Math.max(0, currentIndex - 1)] || newOpenTabs[0];
      setActiveFile(newActiveFile);

      // Switch to the new active file's model
      if (editorRef.current && !(editorRef.current as any)._isDisposed) {
        const newModel = modelsRef.current.get(newActiveFile);
        if (newModel && !newModel.isDisposed()) {
          try {
            editorRef.current.setModel(newModel);
          } catch (e) {
            console.warn('Could not set model after tab close:', e);
          }
        }
      }
    }
  };

  // Open a file in a new tab (or focus if already open)
  const openFile = (fileName: string) => {
    if (!openTabs.includes(fileName)) {
      setOpenTabs(prev => [...prev, fileName]);
    }
    setActiveFile(fileName);

    // Switch to the file's model
    if (editorRef.current && !(editorRef.current as any)._isDisposed) {
      const model = modelsRef.current.get(fileName);
      if (model && !model.isDisposed()) {
        try {
          editorRef.current.setModel(model);
        } catch (e) {
          console.warn('Could not set model when opening file:', e);
        }
      }
    }
  };

  const startRename = (fileName: string) => {
    setRenamingFile(fileName);
    setRenameValue(fileName);
  };

  const confirmRename = () => {
    if (!renamingFile || !renameValue.trim()) {
      setRenamingFile(null);
      setRenameValue('');
      return;
    }

    if (!renameValue.includes('.')) {
      alert('Please include a file extension (e.g., script.js)');
      return;
    }

    if (renameValue !== renamingFile && editorFiles.find(f => f.name === renameValue)) {
      alert('A file with this name already exists');
      return;
    }

    const updatedFiles = editorFiles.map(f =>
      f.name === renamingFile ? { ...f, name: renameValue } : f
    );

    // Update the model reference
    const model = modelsRef.current.get(renamingFile);
    if (model) {
      modelsRef.current.delete(renamingFile);
      modelsRef.current.set(renameValue, model);
    }

    setEditorFiles(updatedFiles);
    lastSyncedFilesRef.current = updatedFiles.map(f => f.name).join(',');

    // Update the tab name in openTabs
    setOpenTabs(prev => prev.map(name => name === renamingFile ? renameValue : name));

    if (activeFile === renamingFile) {
      setActiveFile(renameValue);
    }

    setRenamingFile(null);
    setRenameValue('');

    if (onChange) {
      onChange(updatedFiles);
    }
  };

  const duplicateFile = (fileName: string) => {
    const fileToDuplicate = editorFiles.find(f => f.name === fileName);
    if (!fileToDuplicate) return;

    const ext = fileName.split('.').pop() || '';
    const baseName = fileName.replace(`.${ext}`, '');
    let counter = 1;
    let newName = `${baseName}_copy.${ext}`;

    while (editorFiles.find(f => f.name === newName)) {
      counter++;
      newName = `${baseName}_copy${counter}.${ext}`;
    }

    const newFile: CodeFile = {
      name: newName,
      content: fileToDuplicate.content
    };

    const updatedFiles = [...editorFiles, newFile];
    setEditorFiles(updatedFiles);
    setOpenTabs(prev => [...prev, newName]); // Add to open tabs
    setActiveFile(newName);
    lastSyncedFilesRef.current = updatedFiles.map(f => f.name).join(',');

    // Create model for the new file
    if (monacoRef.current) {
      const language = getLanguageFromFileName(newName);
      const model = monacoRef.current.editor.createModel(newFile.content, language);
      modelsRef.current.set(newName, model);

      model.onDidChangeContent(() => {
        const updatedContent = model.getValue();
        const fName = Array.from(modelsRef.current.entries()).find(([_, m]) => m === model)?.[0];

        if (fName) {
          setEditorFiles(prev => {
            const updated = prev.map(f =>
              f.name === fName ? { ...f, content: updatedContent } : f
            );
            if (onChange) {
              onChange(updated);
            }
            return updated;
          });
        }
      });

      if (editorRef.current && !(editorRef.current as any)._isDisposed) {
        try {
          editorRef.current.setModel(model);
        } catch (e) {
          console.warn('Could not set model for duplicated file:', e);
        }
      }
    }

    if (onChange) {
      onChange(updatedFiles);
    }
  };

  const downloadFile = (fileName: string) => {
    const file = editorFiles.find(f => f.name === fileName);
    if (!file) return;

    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.split('/').pop() || fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Create a folder (by creating a placeholder file inside it)
  const createFolder = (folderPath: string) => {
    // Folders are implicit - they exist if there are files inside them
    // Create a .gitkeep file to make the folder visible
    const placeholderPath = `${folderPath}/.gitkeep`;
    if (editorFiles.find(f => f.name === placeholderPath)) {
      return; // Folder already exists
    }

    const newFile: CodeFile = {
      name: placeholderPath,
      content: ''
    };

    const updatedFiles = [...editorFiles, newFile];
    setEditorFiles(updatedFiles);
    lastSyncedFilesRef.current = updatedFiles.map(f => f.name).join(',');

    if (onChange) {
      onChange(updatedFiles);
    }
  };

  // Create a new file at a specific path
  const createFileAtPath = (filePath: string, content?: string) => {
    if (editorFiles.find(f => f.name === filePath)) {
      alert('File already exists');
      return;
    }

    const ext = filePath.split('.').pop()?.toLowerCase();
    const defaultContent: Record<string, string> = {
      'js': '// JavaScript code here',
      'jsx': '// React component here',
      'ts': '// TypeScript code here',
      'tsx': '// React TypeScript component here',
      'css': '/* CSS styles here */',
      'scss': '/* SCSS styles here */',
      'html': '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Document</title>\n</head>\n<body>\n    \n</body>\n</html>\n',
      'json': '{\n  \n}',
      'md': '# Markdown content',
      'py': '# Python code here',
      'java': '// Java code here',
      'c': '// C code here',
      'cpp': '// C++ code here',
      'txt': ''
    };

    const newFile: CodeFile = {
      name: filePath,
      content: content ?? defaultContent[ext || ''] ?? ''
    };

    const updatedFiles = [...editorFiles, newFile];
    setEditorFiles(updatedFiles);
    setOpenTabs(prev => [...prev, filePath]);
    setActiveFile(filePath);
    lastSyncedFilesRef.current = updatedFiles.map(f => f.name).join(',');

    // Create model for the new file
    if (monacoRef.current && !modelsRef.current.has(filePath)) {
      const language = getLanguageFromFileName(filePath);
      const model = monacoRef.current.editor.createModel(newFile.content, language);
      modelsRef.current.set(filePath, model);

      model.onDidChangeContent(() => {
        const updatedContent = model.getValue();
        setEditorFiles(prev => {
          const updated = prev.map(f =>
            f.name === filePath ? { ...f, content: updatedContent } : f
          );
          if (onChange) {
            onChange(updated);
          }
          return updated;
        });
      });

      if (editorRef.current && !(editorRef.current as any)._isDisposed) {
        try {
          editorRef.current.setModel(model);
        } catch (e) {
          console.warn('Could not set model for new file:', e);
        }
      }
    }

    if (onChange) {
      onChange(updatedFiles);
    }
  };

  // Handle file uploads
  const handleFilesUpload = async (fileList: FileList, targetFolder: string) => {
    const newFiles: CodeFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      // Read file content
      const content = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string || '');
        reader.readAsText(file);
      });

      // Build the full path
      const fileName = file.webkitRelativePath || file.name;
      const fullPath = targetFolder ? `${targetFolder}/${fileName}` : fileName;

      // Skip if file already exists
      if (editorFiles.find(f => f.name === fullPath)) {
        console.warn(`File ${fullPath} already exists, skipping`);
        continue;
      }

      newFiles.push({
        name: fullPath,
        content
      });
    }

    if (newFiles.length === 0) return;

    const updatedFiles = [...editorFiles, ...newFiles];
    setEditorFiles(updatedFiles);
    lastSyncedFilesRef.current = updatedFiles.map(f => f.name).join(',');

    // Create models for new files
    newFiles.forEach(newFile => {
      if (monacoRef.current && !modelsRef.current.has(newFile.name)) {
        const language = getLanguageFromFileName(newFile.name);
        const model = monacoRef.current.editor.createModel(newFile.content, language);
        modelsRef.current.set(newFile.name, model);

        model.onDidChangeContent(() => {
          const updatedContent = model.getValue();
          setEditorFiles(prev => {
            const updated = prev.map(f =>
              f.name === newFile.name ? { ...f, content: updatedContent } : f
            );
            if (onChange) {
              onChange(updated);
            }
            return updated;
          });
        });
      }
    });

    // Open the first uploaded file
    if (newFiles.length > 0) {
      const firstFile = newFiles[0].name;
      setOpenTabs(prev => [...prev, firstFile]);
      setActiveFile(firstFile);

      if (editorRef.current && !(editorRef.current as any)._isDisposed) {
        const model = modelsRef.current.get(firstFile);
        if (model && !model.isDisposed()) {
          try {
            editorRef.current.setModel(model);
          } catch (e) {
            console.warn('Could not set model for uploaded file:', e);
          }
        }
      }
    }

    if (onChange) {
      onChange(updatedFiles);
    }
  };

  // Rename a file or folder
  const renameFileOrFolder = (oldPath: string, newPath: string) => {
    // Check if it's a folder (has children)
    const isFolder = editorFiles.some(f => f.name.startsWith(oldPath + '/'));

    if (isFolder) {
      // Rename all files in the folder
      const updatedFiles = editorFiles.map(f => {
        if (f.name === oldPath || f.name.startsWith(oldPath + '/')) {
          const newName = f.name.replace(oldPath, newPath);
          // Update model reference
          const model = modelsRef.current.get(f.name);
          if (model) {
            modelsRef.current.delete(f.name);
            modelsRef.current.set(newName, model);
          }
          return { ...f, name: newName };
        }
        return f;
      });

      setEditorFiles(updatedFiles);
      lastSyncedFilesRef.current = updatedFiles.map(f => f.name).join(',');

      // Update open tabs
      setOpenTabs(prev => prev.map(name =>
        name === oldPath || name.startsWith(oldPath + '/')
          ? name.replace(oldPath, newPath)
          : name
      ));

      // Update active file
      if (activeFile === oldPath || activeFile.startsWith(oldPath + '/')) {
        setActiveFile(activeFile.replace(oldPath, newPath));
      }

      if (onChange) {
        onChange(updatedFiles);
      }
    } else {
      // Just rename the single file
      if (editorFiles.find(f => f.name === newPath)) {
        alert('A file with this name already exists');
        return;
      }

      const model = modelsRef.current.get(oldPath);
      if (model) {
        modelsRef.current.delete(oldPath);
        modelsRef.current.set(newPath, model);
      }

      const updatedFiles = editorFiles.map(f =>
        f.name === oldPath ? { ...f, name: newPath } : f
      );

      setEditorFiles(updatedFiles);
      lastSyncedFilesRef.current = updatedFiles.map(f => f.name).join(',');

      // Update open tabs
      setOpenTabs(prev => prev.map(name => name === oldPath ? newPath : name));

      // Update active file
      if (activeFile === oldPath) {
        setActiveFile(newPath);
      }

      if (onChange) {
        onChange(updatedFiles);
      }
    }
  };

  // Delete a file or folder
  const deleteFileOrFolder = (path: string) => {
    // Check if it's a folder
    const isFolder = editorFiles.some(f => f.name.startsWith(path + '/'));

    let filesToDelete: string[];
    if (isFolder) {
      filesToDelete = editorFiles
        .filter(f => f.name === path || f.name.startsWith(path + '/'))
        .map(f => f.name);
    } else {
      filesToDelete = [path];
    }

    // Don't delete the last file
    if (editorFiles.length <= filesToDelete.length) {
      alert('Cannot delete all files');
      return;
    }

    const updatedFiles = editorFiles.filter(f => !filesToDelete.includes(f.name));
    setEditorFiles(updatedFiles);

    // Remove from open tabs
    setOpenTabs(prev => prev.filter(name => !filesToDelete.includes(name)));

    // Dispose models
    filesToDelete.forEach(fileName => {
      const model = modelsRef.current.get(fileName);
      if (model) {
        try {
          if (!model.isDisposed()) {
            model.dispose();
          }
        } catch (e) {
          console.warn('Error disposing model:', e);
        }
        modelsRef.current.delete(fileName);
      }
    });

    lastSyncedFilesRef.current = updatedFiles.map(f => f.name).join(',');

    // Switch active file if needed
    if (filesToDelete.includes(activeFile)) {
      const newActiveFile = updatedFiles[0]?.name || '';
      setActiveFile(newActiveFile);

      if (newActiveFile && editorRef.current && !(editorRef.current as any)._isDisposed) {
        const newModel = modelsRef.current.get(newActiveFile);
        if (newModel && !newModel.isDisposed()) {
          try {
            editorRef.current.setModel(newModel);
          } catch (e) {
            console.warn('Could not set model after deletion:', e);
          }
        }
      }
    }

    if (onChange) {
      onChange(updatedFiles);
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, { icon: React.ComponentType<{ className?: string }>, color: string }> = {
      'html': { icon: Globe, color: 'text-orange-500' },
      'htm': { icon: Globe, color: 'text-orange-500' },
      'css': { icon: Hash, color: 'text-blue-500' },
      'scss': { icon: Hash, color: 'text-pink-500' },
      'sass': { icon: Hash, color: 'text-pink-400' },
      'js': { icon: Braces, color: 'text-yellow-500' },
      'jsx': { icon: Code2, color: 'text-cyan-500' },
      'ts': { icon: Braces, color: 'text-blue-600' },
      'tsx': { icon: Code2, color: 'text-blue-400' },
      'json': { icon: FileJson, color: 'text-yellow-600' },
      'py': { icon: FileCode, color: 'text-green-500' },
      'java': { icon: FileCode, color: 'text-red-500' },
      'c': { icon: FileCode, color: 'text-gray-500' },
      'cpp': { icon: FileCode, color: 'text-purple-500' },
      'md': { icon: FileText, color: 'text-blue-300' },
      'txt': { icon: FileText, color: 'text-gray-400' },
      'sql': { icon: Database, color: 'text-orange-400' },
      'xml': { icon: FileCode, color: 'text-orange-400' },
      'yaml': { icon: Cog, color: 'text-red-400' },
      'yml': { icon: Cog, color: 'text-red-400' },
      'sh': { icon: Terminal, color: 'text-green-400' },
      'png': { icon: FileImage, color: 'text-purple-400' },
      'jpg': { icon: FileImage, color: 'text-purple-400' },
      'svg': { icon: FileImage, color: 'text-yellow-400' },
    };
    return iconMap[ext || ''] || { icon: File, color: 'text-gray-400' };
  };

  // Filter files based on search query
  const filteredFiles = searchQuery
    ? editorFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : editorFiles;

  // Update theme when it changes
  useEffect(() => {
    if (monacoRef.current && isThemeRegistered) {
      monacoRef.current.editor.setTheme(theme);
    }
  }, [theme, isThemeRegistered]);

  // Auto-load Pyodide when Python file is active for syntax checking
  const [pyodideStatus, setPyodideStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  useEffect(() => {
    const isPythonFile = activeFile.endsWith('.py');
    if (isPythonFile && !pyodideRef.current && !pyodideLoadingRef.current && pyodideStatus === 'idle') {
      setPyodideStatus('loading');
      loadPyodide()
        .then(() => {
          setPyodideStatus('ready');
          // Re-validate current code now that Pyodide is ready
          if (monacoRef.current && editorRef.current) {
            const model = editorRef.current.getModel();
            if (model && model.getLanguageId() === 'python') {
              validatePythonSyntax(model.getValue(), monacoRef.current, model);
            }
          }
        })
        .catch(() => {
          setPyodideStatus('error');
        });
    } else if (pyodideRef.current && pyodideStatus !== 'ready') {
      setPyodideStatus('ready');
    }
  }, [activeFile, pyodideStatus, loadPyodide, validatePythonSyntax]);

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
    <div className={`w-full flex bg-card overflow-hidden code-editor-container ${fullscreen ? 'h-full rounded-2xl' : 'border border-border rounded-2xl'}`} style={{ height }}>
      {/* VS Code Activity Bar - Full Height */}
      {showExplorer && (
        <div className="w-12 bg-muted/30 border-r border-border flex flex-col items-center py-3 gap-1.5 shrink-0 rounded-l-2xl">
          <button
            className={`p-2.5 rounded-xl transition-colors ${activePanel === 'explorer' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}
            onClick={() => setActivePanel('explorer')}
            title="Explorer"
          >
            <Files className="w-5 h-5" />
          </button>
          <button
            className={`p-2.5 rounded-xl transition-colors ${activePanel === 'search' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}
            onClick={() => setActivePanel('search')}
            title="Search"
          >
            <Search className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <button
            className={`p-2.5 rounded-xl transition-colors ${activePanel === 'settings' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}
            onClick={() => setActivePanel('settings')}
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      )}

        {/* Sidebar Panel */}
        {showExplorer && (
          <div className="w-56 bg-muted/20 border-r border-border flex flex-col shrink-0 overflow-hidden relative">
            {/* Explorer Panel */}
            {activePanel === 'explorer' && (
              <FileTree
                files={editorFiles}
                activeFile={activeFile}
                openTabs={openTabs}
                onFileSelect={openFile}
                onFileCreate={createFileAtPath}
                onFolderCreate={createFolder}
                onFileDelete={deleteFileOrFolder}
                onFileRename={renameFileOrFolder}
                onFileDuplicate={duplicateFile}
                onFileDownload={downloadFile}
                onFilesUpload={handleFilesUpload}
              />
            )}

            {/* Search Panel */}
            {activePanel === 'search' && (
              <>
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Search
                  </span>
                </div>
                <div className="p-2">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search files..."
                    className="h-8 text-xs bg-background border-border text-foreground rounded-lg"
                  />
                </div>
                <div className="flex-1 overflow-y-auto px-2">
                  {searchQuery && filteredFiles.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      No files found
                    </div>
                  ) : searchQuery ? (
                    filteredFiles.map(file => {
                      const fileIconData = getFileIcon(file.name);
                      const FileIconComponent = fileIconData.icon;
                      return (
                        <div
                          key={`search-${file.name}`}
                          className={`flex items-center gap-2 px-2.5 py-1.5 cursor-pointer rounded-lg transition-colors ${
                            activeFile === file.name
                              ? 'bg-primary/20 text-foreground'
                              : 'text-foreground/70 hover:bg-muted/50'
                          }`}
                          onClick={() => openFile(file.name)}
                        >
                          <FileIconComponent className={`w-4 h-4 shrink-0 ${fileIconData.color}`} />
                          <span className="text-xs truncate">{file.name}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      Type to search files
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Settings Panel */}
            {activePanel === 'settings' && (
              <>
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Settings
                  </span>
                </div>
                <div className="p-3 space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Editor settings
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Files</span>
                    <span className="text-xs text-muted-foreground">{editorFiles.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Language</span>
                    <span className="text-xs text-muted-foreground">{currentLanguage}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Theme</span>
                    <span className="text-xs text-muted-foreground">{theme === 'custom-dark' ? 'Dark' : 'Light'}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Editor Area with Tab Bar */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab Bar */}
          <div className="flex items-center bg-muted/50 border-b border-border shrink-0 pt-1 px-1">
            {/* Tab Scroll Container */}
            <div className="flex-1 flex items-center overflow-x-auto scrollbar-none">
              {openTabs.map(fileName => {
                const file = editorFiles.find(f => f.name === fileName);
                if (!file) return null;
                const fileIconData = getFileIcon(file.name);
                const FileIcon = fileIconData.icon;
                return (
                  <div
                    key={file.name}
                    className={`group flex items-center gap-1.5 px-3 py-1.5 cursor-pointer min-w-0 transition-colors ${
                      activeFile === file.name
                        ? 'bg-card text-foreground rounded-t-xl'
                        : 'bg-muted/30 text-muted-foreground hover:bg-muted/50 rounded-t-lg'
                    }`}
                    onClick={() => {
                      if (renamingFile !== file.name) {
                        setActiveFile(file.name);
                      }
                    }}
                    onDoubleClick={() => startRename(file.name)}
                  >
                    <FileIcon className={`w-4 h-4 shrink-0 ${fileIconData.color}`} />
                    {renamingFile === file.name ? (
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') confirmRename();
                          if (e.key === 'Escape') {
                            setRenamingFile(null);
                            setRenameValue('');
                          }
                        }}
                        onBlur={confirmRename}
                        className="h-5 w-24 text-xs bg-background border-primary text-foreground px-1.5 rounded-md"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-xs truncate max-w-[120px]">{file.name}</span>
                    )}
                    <button
                      className={`ml-1 p-0.5 rounded-md hover:bg-accent transition-opacity ${
                        activeFile === file.name ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(file.name);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
              {/* New File Tab Button */}
              {showAddFile ? (
                <div className="flex items-center gap-1 px-2 py-1.5 bg-card rounded-t-lg">
                  <Input
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="filename.ext"
                    className="h-5 w-28 text-xs bg-background border-primary text-foreground px-1.5 rounded-md"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addFile();
                      if (e.key === 'Escape') {
                        setShowAddFile(false);
                        setNewFileName('');
                      }
                    }}
                    autoFocus
                  />
                </div>
              ) : (
                <button
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors ml-1"
                  onClick={() => setShowAddFile(true)}
                  title="New File"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Editor Container */}
          <div className="flex-1 relative">
            <MonacoEditor
              height="100%"
              width="100%"
              onMount={handleEditorDidMount}
              theme={theme}
              options={{
                minimap: { enabled: true, scale: 1 },
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

          {/* Output Panel */}
          {showOutput && (
            <div className="border-t border-border shrink-0">
          {/* Output Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted/50">
            <div className="flex items-center gap-2">
              <button
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                onClick={() => setOutputExpanded(!outputExpanded)}
              >
                {outputExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
              {/* Tab buttons */}
              <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-lg">
                <button
                  onClick={() => setOutputTab('console')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs transition-colors rounded-md ${
                    outputTab === 'console'
                      ? 'text-foreground bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Terminal className="h-3 w-3" />
                  Console
                </button>
                <button
                  onClick={() => setOutputTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs transition-colors rounded-md ${
                    outputTab === 'preview'
                      ? 'text-foreground bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Eye className="h-3 w-3" />
                  Preview
                </button>
              </div>
              {outputTab === 'console' && terminalReady && (
                <span className="text-xs text-muted-foreground ml-2">
                  Interactive Terminal
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {outputTab === 'console' && (
                <button
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
                  onClick={clearTerminal}
                  disabled={!terminalReady}
                >
                  <Trash2 className="h-3 w-3" />
                  Clear
                </button>
              )}
              <button
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
                onClick={runCode}
                disabled={isRunning}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3" />
                    Run
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Output Content */}
          {outputExpanded && (
            <>
              {/* Console Tab - xterm.js Terminal */}
              {outputTab === 'console' && (
                <div className="flex flex-col mx-2 mb-2 rounded-xl overflow-hidden" style={{ height: outputHeight }}>
                  <div
                    ref={terminalContainerRef}
                    className="flex-1 w-full"
                    style={{ minHeight: '100%' }}
                  />
                  {!terminalReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e2e] text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Initializing terminal...
                    </div>
                  )}
                </div>
              )}

              {/* Preview Tab */}
              {outputTab === 'preview' && (
                <div
                  className="bg-white dark:bg-gray-900 mx-2 mb-2 rounded-xl overflow-hidden"
                  style={{ height: outputHeight }}
                >
                  {previewHtml ? (
                    <iframe
                      ref={iframeRef}
                      srcDoc={previewHtml}
                      className="w-full h-full border-0 rounded-xl"
                      sandbox="allow-scripts allow-forms allow-modals"
                      title="Preview"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-card text-muted-foreground/50 text-sm rounded-xl">
                      Run an HTML file to see the preview here
                    </div>
                  )}
                </div>
              )}
            </>
          )}
            </div>
          )}

          {/* Status Bar */}
          <div className="flex items-center justify-between px-4 py-1.5 bg-primary text-primary-foreground text-xs shrink-0 rounded-br-2xl">
            <div className="flex items-center gap-3">
              <button
                className="hover:bg-primary-foreground/20 px-2.5 py-1 rounded-lg transition-colors"
                onClick={() => setShowExplorer(!showExplorer)}
              >
                {showExplorer ? 'Hide Explorer' : 'Show Explorer'}
              </button>
              <span>{editorFiles.length} file{editorFiles.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-3">
              {currentLanguage === 'python' && (
                <span className={`flex items-center gap-1 ${pyodideStatus === 'ready' ? 'text-green-300' : pyodideStatus === 'error' ? 'text-red-300' : 'text-yellow-300'}`}>
                  {pyodideStatus === 'loading' && (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading Python 3.11...
                    </>
                  )}
                  {pyodideStatus === 'ready' && '● Python 3.11 Ready'}
                  {pyodideStatus === 'error' && '● Python Load Failed'}
                  {pyodideStatus === 'idle' && '○ Python (Click Run to load)'}
                </span>
              )}
              <span>{currentLanguage.charAt(0).toUpperCase() + currentLanguage.slice(1)}</span>
              <span>UTF-8</span>
              <span>Ln 1, Col 1</span>
            </div>
          </div>
        </div>
    </div>
  );
});

export default CodeEditor;