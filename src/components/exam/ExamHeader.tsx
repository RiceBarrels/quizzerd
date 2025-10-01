'use client';

import { Button } from '@/components/ui/button';
import { Loader2, Eye, Save, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ExamHeader({ 
  examId,
  isPublished, 
  saving, 
  onSave, 
  onPublish,
  onPreview,
  canPublish,
  lastSaved 
}) {
  const [savedText, setSavedText] = useState('');

  useEffect(() => {
    if (!lastSaved) {
      setSavedText('');
      return;
    }

    const updateSavedText = () => {
      const now = new Date();
      const diff = Math.floor((now - lastSaved) / 1000);
      
      if (diff < 60) {
        setSavedText('Just saved');
      } else if (diff < 3600) {
        const minutes = Math.floor(diff / 60);
        setSavedText(`Saved ${minutes} minute${minutes > 1 ? 's' : ''} ago`);
      } else {
        const hours = Math.floor(diff / 3600);
        setSavedText(`Saved ${hours} hour${hours > 1 ? 's' : ''} ago`);
      }
    };

    updateSavedText();
    const interval = setInterval(updateSavedText, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [lastSaved]);
  return (
    <>
      <div className="flex justify-between items-center mb-6 mx-8">
        <div>
          <h1 className="text-3xl font-bold">Edit Exam</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Modify exam details and questions
            {savedText && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                  <CheckCircle2 className="w-3 h-3" />
                  {savedText}
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onPreview}
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={onSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Draft
          </Button>
          <Button
            onClick={onPublish}
            disabled={saving || !canPublish}
            variant={isPublished ? "secondary" : "default"}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            {isPublished ? 'Update Published' : 'Publish'}
          </Button>
        </div>
      </div>

      {isPublished && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">
             This exam is published and available to students.
          </p>
        </div>
      )}
    </>
  );
}