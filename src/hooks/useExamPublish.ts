import { useState } from 'react';
import { toast } from 'sonner';

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
 * Custom hook for publishing exams
 */
export function useExamPublish(options: UseExamPublishOptions) {
  const [saving, setSaving] = useState(false);

  /**
   * Handles publishing an exam
   * @param {'public' | 'code'} publishType - Type of publishing: 'public' for public exams, 'code' for code-based access
   */
  const handlePublish = async (
    publishType: 'public' | 'code'
  ) => {
    setSaving(true);

    try {
      // Prepare publish data based on publish type
      const publishData: any = {
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
      } else if (publishType === 'code') {
        publishData.is_public = false;
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

      toast.success('Exam published successfully!');
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
