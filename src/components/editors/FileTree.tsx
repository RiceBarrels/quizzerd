'use client';

import { useState, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  FolderPlus,
  FilePlus,
  Trash2,
  Pencil,
  Copy,
  Download,
  MoreHorizontal,
  Upload,
  FileCode,
  FileJson,
  FileText,
  Globe,
  Hash,
  Braces,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface CodeFile {
  name: string; // Full path like "src/components/Button.tsx"
  content: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
}

interface FileTreeProps {
  files: CodeFile[];
  activeFile: string;
  openTabs: string[];
  onFileSelect: (path: string) => void;
  onFileCreate: (path: string, content?: string) => void;
  onFolderCreate: (path: string) => void;
  onFileDelete: (path: string) => void;
  onFileRename: (oldPath: string, newPath: string) => void;
  onFileDuplicate: (path: string) => void;
  onFileDownload: (path: string) => void;
  onFilesUpload: (files: FileList, targetFolder: string) => void;
}

// Get file icon based on extension
const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const iconMap: Record<string, { icon: React.ComponentType<{ className?: string }>, color: string }> = {
    'html': { icon: Globe, color: 'text-orange-500' },
    'htm': { icon: Globe, color: 'text-orange-500' },
    'css': { icon: Hash, color: 'text-blue-500' },
    'scss': { icon: Hash, color: 'text-pink-500' },
    'sass': { icon: Hash, color: 'text-pink-500' },
    'less': { icon: Hash, color: 'text-blue-400' },
    'js': { icon: Braces, color: 'text-yellow-500' },
    'jsx': { icon: Braces, color: 'text-yellow-400' },
    'ts': { icon: Braces, color: 'text-blue-600' },
    'tsx': { icon: Braces, color: 'text-blue-500' },
    'json': { icon: FileJson, color: 'text-yellow-600' },
    'md': { icon: FileText, color: 'text-gray-400' },
    'txt': { icon: FileText, color: 'text-gray-400' },
    'py': { icon: FileCode, color: 'text-green-500' },
    'java': { icon: FileCode, color: 'text-red-500' },
    'c': { icon: FileCode, color: 'text-blue-700' },
    'cpp': { icon: FileCode, color: 'text-blue-600' },
    'h': { icon: FileCode, color: 'text-purple-500' },
    'sql': { icon: Database, color: 'text-orange-400' },
  };
  return iconMap[ext || ''] || { icon: File, color: 'text-muted-foreground' };
};

// Build tree structure from flat file paths
export const buildTree = (files: CodeFile[]): TreeNode[] => {
  const root: TreeNode[] = [];

  files.forEach(file => {
    const parts = file.name.split('/');
    let currentLevel = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const path = parts.slice(0, index + 1).join('/');

      let existing = currentLevel.find(node => node.name === part);

      if (!existing) {
        existing = {
          name: part,
          path,
          type: isFile ? 'file' : 'folder',
          children: isFile ? undefined : [],
        };
        currentLevel.push(existing);
      }

      if (!isFile && existing.children) {
        currentLevel = existing.children;
      }
    });
  });

  // Sort: folders first, then files, alphabetically
  const sortNodes = (nodes: TreeNode[]): TreeNode[] => {
    return nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    }).map(node => ({
      ...node,
      children: node.children ? sortNodes(node.children) : undefined,
    }));
  };

  return sortNodes(root);
};

// Get all folders from files
export const getFolders = (files: CodeFile[]): string[] => {
  const folders = new Set<string>();
  folders.add(''); // Root folder

  files.forEach(file => {
    const parts = file.name.split('/');
    for (let i = 1; i < parts.length; i++) {
      folders.add(parts.slice(0, i).join('/'));
    }
  });

  return Array.from(folders).sort();
};

interface TreeNodeComponentProps {
  node: TreeNode;
  depth: number;
  activeFile: string;
  openTabs: string[];
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onFileSelect: (path: string) => void;
  onFileCreate: (folderPath: string) => void;
  onFolderCreate: (folderPath: string) => void;
  onFileDelete: (path: string) => void;
  onFileRename: (path: string) => void;
  onFileDuplicate: (path: string) => void;
  onFileDownload: (path: string) => void;
  onFilesUpload: (folderPath: string) => void;
}

function TreeNodeComponent({
  node,
  depth,
  activeFile,
  openTabs,
  expandedFolders,
  onToggleFolder,
  onFileSelect,
  onFileCreate,
  onFolderCreate,
  onFileDelete,
  onFileRename,
  onFileDuplicate,
  onFileDownload,
  onFilesUpload,
}: TreeNodeComponentProps) {
  const isExpanded = expandedFolders.has(node.path);
  const isActive = activeFile === node.path;
  const isOpen = openTabs.includes(node.path);
  const fileIcon = node.type === 'file' ? getFileIcon(node.name) : null;

  const handleClick = () => {
    if (node.type === 'folder') {
      onToggleFolder(node.path);
    } else {
      onFileSelect(node.path);
    }
  };

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger>
          <div
            className={cn(
              'group flex items-center gap-1.5 py-1 px-1.5 mx-1 cursor-pointer rounded-lg text-sm transition-colors',
              isActive && 'bg-primary/20 text-foreground',
              !isActive && 'hover:bg-muted/50 text-foreground/80'
            )}
            style={{ paddingLeft: `${depth * 12 + 4}px` }}
            onClick={handleClick}
          >
            {node.type === 'folder' ? (
              <>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                {isExpanded ? (
                  <FolderOpen className="h-4 w-4 shrink-0 text-yellow-500" />
                ) : (
                  <Folder className="h-4 w-4 shrink-0 text-yellow-500" />
                )}
              </>
            ) : (
              <>
                <span className="w-4" />
                {fileIcon && <fileIcon.icon className={cn('h-4 w-4 shrink-0', fileIcon.color)} />}
              </>
            )}
            <span className="truncate flex-1 text-xs">{node.name}</span>
            {isOpen && node.type === 'file' && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48 rounded-xl">
          {node.type === 'folder' ? (
            <>
              <ContextMenuItem onClick={() => onFileCreate(node.path)}>
                <FilePlus className="h-4 w-4 mr-2" />
                New File
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onFolderCreate(node.path)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onFilesUpload(node.path)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => onFileRename(node.path)}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </ContextMenuItem>
              <ContextMenuItem
                onClick={() => onFileDelete(node.path)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </ContextMenuItem>
            </>
          ) : (
            <>
              <ContextMenuItem onClick={() => onFileRename(node.path)}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onFileDuplicate(node.path)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onFileDownload(node.path)}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => onFileDelete(node.path)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {node.type === 'folder' && isExpanded && node.children && (
        <div>
          {node.children.map(child => (
            <TreeNodeComponent
              key={child.path}
              node={child}
              depth={depth + 1}
              activeFile={activeFile}
              openTabs={openTabs}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              onFileSelect={onFileSelect}
              onFileCreate={onFileCreate}
              onFolderCreate={onFolderCreate}
              onFileDelete={onFileDelete}
              onFileRename={onFileRename}
              onFileDuplicate={onFileDuplicate}
              onFileDownload={onFileDownload}
              onFilesUpload={onFilesUpload}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({
  files,
  activeFile,
  openTabs,
  onFileSelect,
  onFileCreate,
  onFolderCreate,
  onFileDelete,
  onFileRename,
  onFileDuplicate,
  onFileDownload,
  onFilesUpload,
}: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']));
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [createTargetPath, setCreateTargetPath] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamingPath, setRenamingPath] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useState<HTMLInputElement | null>(null);

  const tree = buildTree(files);

  const handleToggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const handleCreateFile = (folderPath: string) => {
    setCreateTargetPath(folderPath);
    setNewItemName('');
    setIsCreatingFile(true);
  };

  const handleCreateFolder = (folderPath: string) => {
    setCreateTargetPath(folderPath);
    setNewItemName('');
    setIsCreatingFolder(true);
  };

  const handleRename = (path: string) => {
    setRenamingPath(path);
    setRenameValue(path.split('/').pop() || '');
    setIsRenaming(true);
  };

  const confirmCreateFile = () => {
    if (!newItemName.trim()) return;
    const fullPath = createTargetPath ? `${createTargetPath}/${newItemName}` : newItemName;
    onFileCreate(fullPath);
    setIsCreatingFile(false);
    setNewItemName('');
    // Expand the folder
    if (createTargetPath) {
      setExpandedFolders(prev => new Set([...prev, createTargetPath]));
    }
  };

  const confirmCreateFolder = () => {
    if (!newItemName.trim()) return;
    const fullPath = createTargetPath ? `${createTargetPath}/${newItemName}` : newItemName;
    onFolderCreate(fullPath);
    setIsCreatingFolder(false);
    setNewItemName('');
    // Expand the parent and new folder
    setExpandedFolders(prev => new Set([...prev, createTargetPath, fullPath]));
  };

  const confirmRename = () => {
    if (!renameValue.trim()) return;
    const parts = renamingPath.split('/');
    parts[parts.length - 1] = renameValue;
    const newPath = parts.join('/');
    onFileRename(renamingPath, newPath);
    setIsRenaming(false);
    setRenamingPath('');
    setRenameValue('');
  };

  const handleUploadClick = (folderPath: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.webkitdirectory = false;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        onFilesUpload(files, folderPath);
      }
    };
    input.click();
  };

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFilesUpload(files, '');
    }
  }, [onFilesUpload]);

  return (
    <div
      className="h-full flex flex-col"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => handleCreateFile('')}
            title="New File"
          >
            <FilePlus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => handleCreateFolder('')}
            title="New Folder"
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => handleUploadClick('')}
            title="Upload Files"
          >
            <Upload className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Drop zone indicator */}
      {isDragging && (
        <div className="absolute inset-2 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-2xl flex items-center justify-center">
          <div className="text-center">
            <Upload className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-sm text-primary font-medium">Drop files here</p>
          </div>
        </div>
      )}

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1 relative">
        {tree.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">
            <p>No files yet</p>
            <p className="mt-1">Create a file or drag & drop</p>
          </div>
        ) : (
          tree.map(node => (
            <TreeNodeComponent
              key={node.path}
              node={node}
              depth={0}
              activeFile={activeFile}
              openTabs={openTabs}
              expandedFolders={expandedFolders}
              onToggleFolder={handleToggleFolder}
              onFileSelect={onFileSelect}
              onFileCreate={handleCreateFile}
              onFolderCreate={handleCreateFolder}
              onFileDelete={onFileDelete}
              onFileRename={handleRename}
              onFileDuplicate={onFileDuplicate}
              onFileDownload={onFileDownload}
              onFilesUpload={handleUploadClick}
            />
          ))
        )}
      </div>

      {/* New File Dialog */}
      <Dialog open={isCreatingFile} onOpenChange={setIsCreatingFile}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>New File</DialogTitle>
            <DialogDescription>
              {createTargetPath
                ? `Create a new file in "${createTargetPath}"`
                : 'Create a new file in the root folder'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="filename.ext"
              className="rounded-lg"
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmCreateFile();
                if (e.key === 'Escape') setIsCreatingFile(false);
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-lg" onClick={() => setIsCreatingFile(false)}>
              Cancel
            </Button>
            <Button className="rounded-lg" onClick={confirmCreateFile}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Folder Dialog */}
      <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
            <DialogDescription>
              {createTargetPath
                ? `Create a new folder in "${createTargetPath}"`
                : 'Create a new folder in the root'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="folder-name"
              className="rounded-lg"
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmCreateFolder();
                if (e.key === 'Escape') setIsCreatingFolder(false);
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-lg" onClick={() => setIsCreatingFolder(false)}>
              Cancel
            </Button>
            <Button className="rounded-lg" onClick={confirmCreateFolder}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={isRenaming} onOpenChange={setIsRenaming}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>
              Enter a new name
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="new-name"
              className="rounded-lg"
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRename();
                if (e.key === 'Escape') setIsRenaming(false);
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-lg" onClick={() => setIsRenaming(false)}>
              Cancel
            </Button>
            <Button className="rounded-lg" onClick={confirmRename}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
