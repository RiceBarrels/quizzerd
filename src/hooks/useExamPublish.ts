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

/**
 * Custom hook for publishing exams with support for public, class, and code-based publishing
 * @param {UseExamPublishOptions} options - Configuration options for exam publishing
 * @param {string} options.examId - Unique identifier for the exam
 * @param {string} options.examName - Name of the exam
 * @param {string} options.examDescription - Description of the exam
 * @param {number} options.durationMinutes - Duration of the exam in minutes
 * @param {number} options.attemptsAllowed - Maximum number of attempts allowed
 * @param {number} options.passingScore - Minimum score required to pass
 * @param {boolean} options.shuffleItems - Whether to shuffle question order
 * @param {boolean} options.showResultsImmediately - Whether to show results immediately after submission
 * @param {string} options.startDate - Start date for the exam
 * @param {string} options.endDate - End date for the exam
 * @param {any[]} options.items - Array of exam items/questions
 * @param {number} options.totalPoints - Total points for the exam
 * @param {boolean} options.consoleDetection - Enable console detection for cheating prevention
 * @param {boolean} options.translationDetection - Enable translation detection
 * @param {boolean} options.allowWordByWordTranslation - Allow word-by-word translation
 * @param {boolean} options.allowWordByWordDefinition - Allow word-by-word definition lookup
 * @param {boolean} options.visibilityChangeDetection - Enable visibility change detection
 * @param {boolean} options.locationDetection - Enable location-based detection
 * @param {{coordinates: string; rangeInMeters: string}} options.location - Location coordinates and range
 * @param {() => void} [options.onSuccess] - Callback function called on successful publish
 * @returns {Object} Object containing publish handler and saving state
 */
export function useExamPublish(options: UseExamPublishOptions) {
  const [saving, setSaving] = useState(false);

  /**
   * Handles publishing an exam with the specified type and class assignments
   * @param {'public' | 'classes' | 'code'} publishType - Type of publishing: 'public' for public exams, 'classes' for class-specific, 'code' for code-based access
   * @param {string[]} classIds - Array of class IDs to assign the exam to
   * @param {string[]} existingAssignments - Array of class IDs that already have assignments
   * @param {Record<string, ClassAssignmentDates>} [classAssignments] - Optional object mapping class IDs to their access and due dates
   */
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

