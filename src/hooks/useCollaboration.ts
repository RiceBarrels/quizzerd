'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Collaborator {
  id: string;
  email: string;
  name: string;
}

interface UseCollaborationOptions {
  examId: string;
  enabled?: boolean;
}

interface UseCollaborationReturn {
  collaborators: Collaborator[];
  collaboratorIds: string[];
  isOwner: boolean;
  loadingCollaborators: boolean;
  addCollaborator: (idOrEmail: string) => Promise<{ success: boolean; error?: string }>;
  removeCollaborator: (collaboratorId: string) => Promise<{ success: boolean; error?: string }>;
  refreshCollaborators: () => Promise<void>;
}

export function useCollaboration({
  examId,
  enabled = true,
}: UseCollaborationOptions): UseCollaborationReturn {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loadingCollaborators, setLoadingCollaborators] = useState(true);

  const fetchCollaborators = useCallback(async () => {
    if (!examId || !enabled) return;

    try {
      setLoadingCollaborators(true);
      const response = await fetch(`/api/exams/collaborators?examId=${examId}`);
      const data = await response.json();

      if (data.success) {
        setCollaborators(data.data?.collaborators || []);
        setCollaboratorIds(data.data?.collaboratorIds || []);
        setIsOwner(data.data?.isOwner || false);
      }
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    } finally {
      setLoadingCollaborators(false);
    }
  }, [examId, enabled]);

  const addCollaborator = useCallback(async (
    idOrEmail: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/exams/collaborators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examId, collaboratorIdOrEmail: idOrEmail })
      });

      const data = await response.json();

      if (data.success) {
        await fetchCollaborators();
        return { success: true };
      }

      return { success: false, error: data.error || 'Failed to add collaborator' };
    } catch (error) {
      console.error('Error adding collaborator:', error);
      return { success: false, error: 'An error occurred' };
    }
  }, [examId, fetchCollaborators]);

  const removeCollaborator = useCallback(async (
    collaboratorId: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(
        `/api/exams/collaborators?examId=${examId}&collaboratorId=${collaboratorId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (data.success) {
        await fetchCollaborators();
        return { success: true };
      }

      return { success: false, error: data.error || 'Failed to remove collaborator' };
    } catch (error) {
      console.error('Error removing collaborator:', error);
      return { success: false, error: 'An error occurred' };
    }
  }, [examId, fetchCollaborators]);

  useEffect(() => {
    if (enabled) {
      fetchCollaborators();
    }
  }, [enabled, fetchCollaborators]);

  return {
    collaborators,
    collaboratorIds,
    isOwner,
    loadingCollaborators,
    addCollaborator,
    removeCollaborator,
    refreshCollaborators: fetchCollaborators,
  };
}
