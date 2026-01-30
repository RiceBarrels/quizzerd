'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { useUser } from '@clerk/nextjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export interface CursorPosition {
  questionId: string | null;
  fieldType: 'question' | 'option' | 'explanation' | 'settings' | null;
  optionIndex?: number;
  // Mouse position (relative to viewport)
  x?: number;
  y?: number;
  // Text selection in editor (Quill format)
  editorId?: string;
  selectionIndex?: number;
  selectionLength?: number;
  // Activity tracking for seamless collaboration
  isTyping?: boolean;
  lastActivityTimestamp?: number;
  // Chat message (Figma-style "/" chat)
  message?: string;
  messageTimestamp?: number;
}

export interface PresenceUser {
  id: string;
  email: string;
  name: string;
  imageUrl?: string;
  cursor: CursorPosition;
  lastSeen: number;
  color: string;
}

export interface ExamDataChange {
  type: 'question_update' | 'question_add' | 'question_delete' | 'question_reorder' | 'exam_field_update' | 'exam_update';
  questionIndex?: number;
  questionId?: string;
  field?: string;
  value?: any;
  items?: any[]; // For reorder or full sync
  examData?: any; // For exam-level updates
  timestamp: number;
  userId: string;
}

interface UseRealtimePresenceOptions {
  examId: string;
  enabled?: boolean;
  onDataChange?: (change: ExamDataChange) => void;
}

interface UseRealtimePresenceReturn {
  onlineUsers: PresenceUser[];
  updateCursor: (cursor: CursorPosition) => void;
  broadcastChange: (change: Omit<ExamDataChange, 'timestamp' | 'userId'>) => void;
  isConnected: boolean;
}

// Generate a consistent color based on user ID
function getUserColor(userId: string): string {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
  ];

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function useRealtimePresence({
  examId,
  enabled = true,
  onDataChange,
}: UseRealtimePresenceOptions): UseRealtimePresenceReturn {
  const { user } = useUser();
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const cursorRef = useRef<CursorPosition>({ questionId: null, fieldType: null });
  const onDataChangeRef = useRef(onDataChange);
  const isSubscribedRef = useRef(false);

  // Store user data in refs to avoid re-triggering useEffect
  const userIdRef = useRef<string | null>(null);
  const userDataRef = useRef<{
    email: string;
    name: string;
    imageUrl: string;
  } | null>(null);

  // Update user refs when user changes
  useEffect(() => {
    if (user) {
      userIdRef.current = user.id;
      userDataRef.current = {
        email: user.primaryEmailAddress?.emailAddress || '',
        name: user.fullName || user.firstName || 'Anonymous',
        imageUrl: user.imageUrl || '',
      };
    }
  }, [user]);

  // Keep callback ref updated
  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  }, [onDataChange]);

  // Initialize Supabase client once
  useEffect(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient(supabaseUrl, supabaseKey);
    }
  }, []);

  // Set up presence channel - only depend on examId, enabled, and user.id (not entire user object)
  const userId = user?.id;

  useEffect(() => {
    if (!enabled || !examId || !userId || !supabaseRef.current) return;

    // Prevent duplicate subscriptions (React Strict Mode double-render)
    if (isSubscribedRef.current && channelRef.current) {
      return;
    }

    const supabase = supabaseRef.current;
    const channelName = `exam-presence:${examId}`;

    // Create channel for presence
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channelRef.current = channel;

    // Handle presence sync
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users: PresenceUser[] = [];

      Object.entries(state).forEach(([oddiUserId, presences]) => {
        if (oddiUserId !== userId && presences.length > 0) {
          const presence = presences[0] as any;
          users.push({
            id: oddiUserId,
            email: presence.email || '',
            name: presence.name || 'Anonymous',
            imageUrl: presence.imageUrl,
            cursor: presence.cursor || { questionId: null, fieldType: null },
            lastSeen: presence.lastSeen || Date.now(),
            color: getUserColor(oddiUserId),
          });
        }
      });

      setOnlineUsers(users);
    });

    // Handle join events (silent - no console spam)
    channel.on('presence', { event: 'join' }, () => {
      // Presence sync event will handle updating the users list
    });

    // Handle leave events (silent - no console spam)
    channel.on('presence', { event: 'leave' }, () => {
      // Presence sync event will handle updating the users list
    });

    // Handle broadcast messages for data sync
    channel.on('broadcast', { event: 'data_change' }, ({ payload }) => {
      const change = payload as ExamDataChange;
      // Don't process our own changes
      if (change.userId !== userId && onDataChangeRef.current) {
        console.log('Received data change from collaborator:', change);
        onDataChangeRef.current(change);
      }
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        isSubscribedRef.current = true;
        setIsConnected(true);

        // Track this user's presence using refs for latest data
        const userData = userDataRef.current;
        await channel.track({
          id: userId,
          email: userData?.email || '',
          name: userData?.name || 'Anonymous',
          imageUrl: userData?.imageUrl || '',
          cursor: cursorRef.current,
          lastSeen: Date.now(),
        });
      }
    });

    // Cleanup on unmount or when examId/userId changes
    return () => {
      isSubscribedRef.current = false;
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
      setOnlineUsers([]);
    };
  }, [examId, enabled, userId]);

  // Update cursor position - use refs to avoid dependency on user object
  const updateCursor = useCallback((cursor: CursorPosition) => {
    cursorRef.current = cursor;

    const currentUserId = userIdRef.current;
    const userData = userDataRef.current;

    if (channelRef.current && currentUserId && isConnected) {
      channelRef.current.track({
        id: currentUserId,
        email: userData?.email || '',
        name: userData?.name || 'Anonymous',
        imageUrl: userData?.imageUrl || '',
        cursor,
        lastSeen: Date.now(),
      });
    }
  }, [isConnected]);

  // Broadcast data changes to other collaborators - use refs to avoid dependency on user object
  const broadcastChange = useCallback((change: Omit<ExamDataChange, 'timestamp' | 'userId'>) => {
    const currentUserId = userIdRef.current;

    if (channelRef.current && currentUserId && isConnected) {
      const fullChange: ExamDataChange = {
        ...change,
        timestamp: Date.now(),
        userId: currentUserId,
      };
      channelRef.current.send({
        type: 'broadcast',
        event: 'data_change',
        payload: fullChange,
      });
    }
  }, [isConnected]);

  return {
    onlineUsers,
    updateCursor,
    broadcastChange,
    isConnected,
  };
}
