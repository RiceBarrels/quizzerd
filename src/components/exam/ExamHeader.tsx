'use client';

import { Button } from '@/components/ui/button';
import { Loader2, Eye, Save, CheckCircle2, PenBoxIcon, GlobeIcon, Users } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { CollaboratorManager, OnlineCollaborators } from '@/components/collaboration';
import { PresenceUser } from '@/hooks/useRealtimePresence';

interface ExamHeaderProps {
  examId: string;
  examName?: string;
  isPublished: boolean;
  saving: boolean;
  onSave: () => void;
  onPublish: () => void;
  onPreview: () => void;
  canPublish: boolean;
  lastSaved: Date | null;
  // Realtime presence props
  onlineUsers?: PresenceUser[];
  currentUserId?: string;
}

/**
 * Header component for the exam editor page
 * Displays exam title, save status, and action buttons (Preview, Save Draft, Publish)
 * @param {ExamHeaderProps} props - Component props
 * @param {string} props.examId - Unique identifier for the exam
 * @param {boolean} props.isPublished - Whether the exam is currently published
 * @param {boolean} props.saving - Whether a save operation is in progress
 * @param {() => void} props.onSave - Callback function called when Save Draft is clicked
 * @param {() => void} props.onPublish - Callback function called when Publish/Update Published is clicked
 * @param {() => void} props.onPreview - Callback function called when Preview is clicked
 * @param {boolean} props.canPublish - Whether the exam can be published (validation check)
 * @param {Date | null} props.lastSaved - Timestamp of the last save operation
 * @returns {JSX.Element} Exam header with title, status, and action buttons
 */
export default function ExamHeader({
  examId,
  examName,
  isPublished,
  saving,
  onSave,
  onPublish,
  onPreview,
  canPublish,
  lastSaved,
  onlineUsers = [],
  currentUserId
}: ExamHeaderProps) {
  const [savedText, setSavedText] = useState<string>('');

  /**
   * Updates the saved text display based on the time since lastSaved
   * Formats the time as "Just saved", "X minutes ago", or "X hours ago"
   */
  const updateSavedText = useCallback(() => {
    if (!lastSaved) {
      setSavedText('');
      return;
    }

    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);
    
    if (diff < 60) {
      setSavedText('Just saved');
    } else if (diff < 3600) {
      const minutes = Math.floor(diff / 60);
      setSavedText(`Saved ${minutes} minute${minutes > 1 ? 's' : ''} ago`);
    } else {
      const hours = Math.floor(diff / 3600);
      setSavedText(`Saved ${hours} hour${hours > 1 ? 's' : ''} ago`);
    }
  }, [lastSaved]);

  useEffect(() => {
    if (!lastSaved) {
      setSavedText('');
      return;
    }

    updateSavedText();
    const interval = setInterval(updateSavedText, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [lastSaved, updateSavedText]);
  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 mx-4 sm:mx-8">
        <div>
          <div className="flex items-center gap-2 sm:gap-4">
            <PenBoxIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            <h1 className="text-xl sm:text-3xl font-bold">Edit Exam</h1>
          </div>
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <span className="hidden sm:inline">Modify exam details and questions</span>
            <span className="sm:hidden">Edit exam</span>
            {savedText && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="flex items-center gap-1 text-primary text-xs sm:text-sm">
                  <CheckCircle2 className="w-3 h-3" />
                  {savedText}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Online Collaborators - hidden on mobile */}
          {onlineUsers.length > 0 && (
            <div className="hidden sm:block">
              <OnlineCollaborators
                onlineUsers={onlineUsers}
                currentUserId={currentUserId}
              />
            </div>
          )}

          {/* Collaborate Button - icon only on mobile */}
          <CollaboratorManager
            examId={examId}
            examName={examName}
            trigger={
              <Button variant="outline" size="sm">
                <Users className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Collaborate</span>
              </Button>
            }
          />

          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
          >
            <Eye className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Preview</span>
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4 sm:mr-1" />
            )}
            <span className="hidden sm:inline">Save Draft</span>
            <span className="sm:hidden">Save</span>
          </Button>
          <Button
            size="sm"
            onClick={onPublish}
            disabled={saving || !canPublish}
            variant={isPublished ? "secondary" : "default"}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : null}
            <GlobeIcon className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">{isPublished ? 'Update Published' : 'Publish'}</span>
            <span className="sm:hidden">{isPublished ? 'Update' : 'Publish'}</span>
          </Button>
        </div>
      </div>

      {isPublished && (
        <div className="mb-4 mx-4 sm:mx-8 p-3 sm:p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-xs sm:text-sm text-green-800 dark:text-green-200">
             This exam is published and available to students.
          </p>
        </div>
      )}
    </>
  );
}