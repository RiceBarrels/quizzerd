'use client';

import { useState, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Edit,
  Eye,
  Copy,
  Archive,
  CheckCircle,
  Share2,
  Trash2,
  GraduationCap,
  Loader2,
  Users,
  FileText,
  Plus,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ExamContextMenuProps {
  exam: any;
  activeTab: string;
  onRefresh?: () => void;
  children: React.ReactNode;
}

/**
 * Context menu component for exam actions (edit, preview, duplicate, delete, etc.)
 * Provides right-click menu functionality for exam items
 */
export default function ExamContextMenu({
  exam,
  activeTab,
  onRefresh,
  children,
}: ExamContextMenuProps) {
  const router = useRouter();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [assigningToClass, setAssigningToClass] = useState<string | null>(null);

  // Fetch user's classes when dialog opens
  useEffect(() => {
    if (assignDialogOpen) {
      fetchClasses();
    }
  }, [assignDialogOpen]);

  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const response = await fetch('/api/classes?filter=teaching');
      const data = await response.json();
      if (data.success) {
        setClasses(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleAssignToClass = async (classId: string) => {
    setAssigningToClass(classId);
    try {
      const response = await fetch(`/api/classes/${classId}/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: exam.exam_id,
          status: 'published'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Exam assigned to class successfully!');
        setAssignDialogOpen(false);
      } else {
        toast.error(data.error || 'Failed to assign exam to class');
      }
    } catch (error) {
      console.error('Error assigning exam to class:', error);
      toast.error('Failed to assign exam to class');
    } finally {
      setAssigningToClass(null);
    }
  };

  const handleDuplicateExam = async (exam: any) => {
    try {
      const duplicatedExam = {
        ...exam,
        exam_name: `${exam.exam_name} (Copy)`,
        status: 'draft',
        created_at: undefined,
        updated_at: undefined,
        exam_id: undefined
      };

      const response = await fetch('/api/exams/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(duplicatedExam)
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Exam duplicated successfully");
        onRefresh?.();
      } else {
        toast.error(data.error || "Failed to duplicate exam");
      }
    } catch (error) {
      console.error("Error duplicating exam:", error);
      toast.error("Failed to duplicate exam");
    }
  };

  const handleTogglePublish = async (examId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';

    try {
      const response = await fetch('/api/exams/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exam_id: examId, status: newStatus })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Exam ${newStatus === 'published' ? 'published' : 'unpublished'} successfully`);
        onRefresh?.();
      } else {
        toast.error(data.error || "Failed to update exam status");
      }
    } catch (error) {
      console.error("Error updating exam status:", error);
      toast.error("Failed to update exam status");
    }
  };

  const handleCopyPublicLink = (examId: string) => {
    const publicUrl = `${window.location.origin}/exam/${examId}/public`;
    navigator.clipboard.writeText(publicUrl);
    toast.success("Public link copied to clipboard");
  };

  const handleDeleteExam = async (examId: string, examName: string) => {
    try {
      const response = await fetch(`/api/exams/delete?examId=${examId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Exam deleted successfully");
        onRefresh?.();
      } else {
        toast.error(data.error || "Failed to delete exam");
      }
    } catch (error) {
      console.error("Error deleting exam:", error);
      toast.error("Failed to delete exam");
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/exam/${exam.exam_id}/edit`);
            }}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Exam
          </ContextMenuItem>

          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/exam/${exam.exam_id}/preview`);
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </ContextMenuItem>

          {activeTab === 'my-exams' && (
            <>
              <ContextMenuSeparator />

              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setAssignDialogOpen(true);
                }}
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                Assign to Class
              </ContextMenuItem>

              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicateExam(exam);
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </ContextMenuItem>

              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleTogglePublish(exam.exam_id, exam.status);
                }}
              >
                {exam.status === 'published' ? (
                  <>
                    <Archive className="h-4 w-4 mr-2" />
                    Unpublish
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Publish
                  </>
                )}
              </ContextMenuItem>

              <ContextMenuSeparator />

              <ContextMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyPublicLink(exam.exam_id);
                }}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Copy Public Link
              </ContextMenuItem>

              <ContextMenuSeparator />

              <ContextMenuItem
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteExam(exam.exam_id, exam.exam_name);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Assign to Class Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Assign to Class
            </DialogTitle>
            <DialogDescription>
              Select a class to assign &quot;{exam.exam_name}&quot; to.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loadingClasses ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : classes.length === 0 ? (
              <div className="text-center py-8">
                <GraduationCap className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-4">
                  You haven&apos;t created any classes yet.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAssignDialogOpen(false);
                    router.push('/classes');
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create a Class
                </Button>
              </div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2">
                  {classes.map((cls) => (
                    <div
                      key={cls.class_id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-semibold"
                          style={{ backgroundColor: cls.banner_color || '#4285f4' }}
                        >
                          {cls.class_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{cls.class_name}</h4>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{cls.member_count || 0} students</span>
                            <span>•</span>
                            <FileText className="h-3 w-3" />
                            <span>{cls.exam_count || 0} exams</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleAssignToClass(cls.class_id)}
                        disabled={assigningToClass === cls.class_id}
                      >
                        {assigningToClass === cls.class_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Assign'
                        )}
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
