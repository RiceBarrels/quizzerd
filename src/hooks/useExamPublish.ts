import { useState } from 'react';
import { toast } from 'sonner';

interface ClassAssignmentDates {
  access_at: string | null;
  due_at: string | null;
}

interface UseExamPublishOptions {
  examId: string;
  examName: string;
  examDescription: string;
  durationMinutes: number;
  attemptsAllowed: number;
  passingScore: number;
  shuffleItems: boolean;
  showResultsImmediately: boolean;
  startDate: string;
  endDate: string;
  items: any[];
  totalPoints: number;
  consoleDetection: boolean;
  translationDetection: boolean;
  allowWordByWordTranslation: boolean;
  allowWordByWordDefinition: boolean;
  visibilityChangeDetection: boolean;
  locationDetection: boolean;
  location: { coordinates: string; rangeInMeters: string };
  onSuccess?: () => void;
}

export function useExamPublish(options: UseExamPublishOptions) {
  const [saving, setSaving] = useState(false);

  const handlePublish = async (
    publishType: 'public' | 'classes' | 'code',
    classIds: string[],
    existingAssignments: string[],
    classAssignments?: Record<string, ClassAssignmentDates>
  ) => {
    setSaving(true);
    
    try {
      // Prepare publish data based on publish type
      let publishData: any = {
        exam_id: options.examId,
        exam_name: options.examName,
        exam_description: options.examDescription,
        duration_minutes: options.durationMinutes,
        attempts_allowed: options.attemptsAllowed,
        passing_score: options.passingScore,
        shuffle_items: options.shuffleItems,
        show_results_immediately: options.showResultsImmediately,
        start_date: options.startDate || null,
        end_date: options.endDate || null,
        items: options.items,
        total_points: options.totalPoints,
        status: 'published',
        is_published: true,
        console_detection: options.consoleDetection,
        translation_detection: options.translationDetection,
        allow_word_by_word_translation: options.allowWordByWordTranslation,
        allow_word_by_word_definition: options.allowWordByWordDefinition,
        visibility_change_detection: options.visibilityChangeDetection,
        location_detection: options.locationDetection,
        location: options.location
      };
      
      if (publishType === 'public') {
        publishData.is_public = true;
        publishData.class_id = classIds;
      } else if (publishType === 'classes') {
        publishData.is_public = false;
        publishData.class_id = classIds;
      } else if (publishType === 'code') {
        publishData.is_public = false;
        publishData.class_id = [];
      }
      
      // Update the exam with publish settings
      const updateResponse = await fetch(`/api/exams/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(publishData),
      });
      
      const updateResult = await updateResponse.json();
      
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to publish exam');
      }
      
      // Handle class assignments for both public and private modes
      if (classIds.length > 0 || existingAssignments.length > 0) {
        // Determine which classes to add and which to remove
        const classesToAdd = classIds.filter(
          id => !existingAssignments.includes(id)
        );
        const classesToRemove = existingAssignments.filter(
          id => !classIds.includes(id)
        );
        
        // Remove assignments from unchecked classes
        if (classesToRemove.length > 0) {
          const deleteResponse = await fetch(
            `/api/classes/assignments/delete?examId=${options.examId}&classIds=${classesToRemove.join(',')}`,
            { method: 'DELETE' }
          );
          
          const deleteResult = await deleteResponse.json();
          
          if (!deleteResult.success) {
            console.error('Failed to remove assignments:', deleteResult.error);
          }
        }
        
        // Create new assignments for newly selected classes
        for (const classId of classesToAdd) {
          const classDates = classAssignments?.[classId] || { access_at: null, due_at: null };
          
          const assignmentPayload = {
            exam_id: options.examId,
            class_ids: [classId],
            name: options.examName,
            description: options.examDescription,
            publish_at: new Date().toISOString(),
            access_at: classDates.access_at || null,
            due_at: classDates.due_at || null,
          };
          
          const assignmentResponse = await fetch('/api/classes/assignments/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(assignmentPayload),
          });
          
          const assignmentResult = await assignmentResponse.json();
          
          if (assignmentResult.success) {
            console.log(`Successfully created assignment for class ${classId}`);
          } else {
            console.error(`Failed to create assignment for class ${classId}:`, assignmentResult.error);
            if (!assignmentResult.error.includes('already published')) {
              toast.error(`Exam published but failed to create assignment for class ${classId}`);
            }
          }
        }
        
        // Show appropriate success message
        if (classesToAdd.length > 0 || classesToRemove.length > 0) {
          const messages = [];
          if (classesToAdd.length > 0) {
            messages.push(`assigned to ${classesToAdd.length} class(es)`);
          }
          if (classesToRemove.length > 0) {
            messages.push(`removed from ${classesToRemove.length} class(es)`);
          }
          toast.success(`Exam ${messages.join(' and ')}!`, { duration: 5000 });
        }
      }
      
      if (classIds.length === 0 && existingAssignments.length === 0) {
        toast.success('Exam published successfully!');
      }
      
      options.onSuccess?.();
    } catch (error) {
      console.error('Error publishing exam:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to publish exam');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return {
    handlePublish,
    saving,
  };
}

