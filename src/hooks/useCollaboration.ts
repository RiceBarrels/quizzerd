'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSupabase } from '@/lib/supabase-client';
import { useUser } from '@clerk/nextjs';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Collaborator {
  id: string;
  email: string;
  name: string;
}

export interface PresenceUser {
  id: string;
  exam_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_avatar: string | null;
  current_question_id: string | null;
  cursor_position: { x: number; y: number } | null;
  last_seen: string;
}

interface UseCollaborationOptions {
  examId: string;
  enabled?: boolean;
  presenceHeartbeatInterval?: number;
}

interface UseCollaborationReturn {
  // Collaborators
  collaborators: Collaborator[];
  collaboratorIds: string[];
  isOwner: boolean;
  loadingCollaborators: boolean;

  // Presence
  activeUsers: PresenceUser[];
  loadingPresence: boolean;

  // Actions
  addCollaborator: (idOrEmail: string) => Promise<{ success: boolean; error?: string }>;
  removeCollaborator: (collaboratorId: string) => Promise<{ success: boolean; error?: string }>;
  updatePresence: (data: { currentQuestionId?: string; cursorPosition?: { x: number; y: number } }) => void;

  // Refresh
  refreshCollaborators: () => Promise<void>;
  refreshPresence: () => Promise<void>;
}

export function useCollaboration({
  examId,
  enabled = true,
  presenceHeartbeatInterval = 30000 // 30 seconds
}: UseCollaborationOptions): UseCollaborationReturn {
  const supabase = useSupabase();
  const { user } = useUser();

  // State
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loadingCollaborators, setLoadingCollaborators] = useState(true);

  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);
  const [loadingPresence, setLoadingPresence] = useState(true);

  // Refs for cleanup
  const channelRef = useRef<RealtimeChannel | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch collaborators
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

  // Fetch presence
  const fetchPresence = useCallback(async () => {
    if (!examId || !enabled) return;

    try {
      setLoadingPresence(true);
      const response = await fetch(`/api/exams/presence?examId=${examId}`);
      const data = await response.json();

      if (data.success) {
        setActiveUsers(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching presence:', error);
    } finally {
      setLoadingPresence(false);
    }
  }, [examId, enabled]);

  // Add a collaborator (by ID or email)
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

  // Remove a collaborator
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

  // Update presence
  const updatePresence = useCallback(async (data: {
    currentQuestionId?: string;
    cursorPosition?: { x: number; y: number };
  }) => {
    if (!examId || !enabled) return;

    try {
      await fetch('/api/exams/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examId,
          currentQuestionId: data.currentQuestionId,
          cursorPosition: data.cursorPosition
        })
      });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [examId, enabled]);

  // Set up Supabase Realtime subscriptions
  useEffect(() => {
    if (!examId || !enabled || !supabase) return;

    // Create a channel for this exam
    const channel = supabase
      .channel(`exam-collab-${examId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exams',
          filter: `exam_id=eq.${examId}`
        },
        () => {
          // Refresh collaborators when exam changes
          fetchCollaborators();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exam_presence',
          filter: `exam_id=eq.${examId}`
        },
        () => {
          // Refresh presence when changes occur
          fetchPresence();
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Set up presence heartbeat
    const sendHeartbeat = () => {
      updatePresence({});
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval for heartbeats
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, presenceHeartbeatInterval);

    // Clean up on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }

      // Remove presence when leaving
      fetch(`/api/exams/presence?examId=${examId}`, { method: 'DELETE' }).catch(() => {});
    };
  }, [examId, enabled, supabase, fetchCollaborators, fetchPresence, updatePresence, presenceHeartbeatInterval]);

  // Initial data fetch
  useEffect(() => {
    if (enabled) {
      fetchCollaborators();
      fetchPresence();
    }
  }, [enabled, fetchCollaborators, fetchPresence]);

  return {
    // Collaborators
    collaborators,
    collaboratorIds,
    isOwner,
    loadingCollaborators,

    // Presence
    activeUsers,
    loadingPresence,

    // Actions
    addCollaborator,
    removeCollaborator,
    updatePresence,

    // Refresh
    refreshCollaborators: fetchCollaborators,
    refreshPresence: fetchPresence
  };
}
