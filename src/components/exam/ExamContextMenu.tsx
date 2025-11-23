'use client';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Edit,
  Eye,
  Copy,
  Archive,
  CheckCircle,
  Share2,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ExamContextMenuProps {
  exam: any;
  activeTab: string;
  onRefresh?: () => void;
  children: React.ReactNode;
}

export default function ExamContextMenu({
  exam,
  activeTab,
  onRefresh,
  children,
}: ExamContextMenuProps) {
  const router = useRouter();

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
  );
}

