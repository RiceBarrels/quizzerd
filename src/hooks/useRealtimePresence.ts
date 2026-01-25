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
  type: 'question_update' | 'question_add' | 'question_delete' | 'question_reorder' | 'exam_update';
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

  // Keep callback ref updated
  useEffect(() => {
    onDataChangeRef.current = onDataChange;
  }, [onDataChange]);

  // Initialize Supabase client
  useEffect(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient(supabaseUrl, supabaseKey);
    }
  }, []);

  // Set up presence channel
  useEffect(() => {
    if (!enabled || !examId || !user || !supabaseRef.current) return;

    const supabase = supabaseRef.current;
    const channelName = `exam-presence:${examId}`;

    // Create channel for presence
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channelRef.current = channel;

    // Handle presence sync
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users: PresenceUser[] = [];

      Object.entries(state).forEach(([userId, presences]) => {
        if (userId !== user.id && presences.length > 0) {
          const presence = presences[0] as any;
          users.push({
            id: userId,
            email: presence.email || '',
            name: presence.name || 'Anonymous',
            imageUrl: presence.imageUrl,
            cursor: presence.cursor || { questionId: null, fieldType: null },
            lastSeen: presence.lastSeen || Date.now(),
            color: getUserColor(userId),
          });
        }
      });

      setOnlineUsers(users);
    });

    // Handle join events
    channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('User joined:', key);
    });

    // Handle leave events
    channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('User left:', key);
    });

    // Handle broadcast messages for data sync
    channel.on('broadcast', { event: 'data_change' }, ({ payload }) => {
      const change = payload as ExamDataChange;
      // Don't process our own changes
      if (change.userId !== user.id && onDataChangeRef.current) {
        console.log('Received data change from collaborator:', change);
        onDataChangeRef.current(change);
      }
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);

        // Track this user's presence
        await channel.track({
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress || '',
          name: user.fullName || user.firstName || 'Anonymous',
          imageUrl: user.imageUrl,
          cursor: cursorRef.current,
          lastSeen: Date.now(),
        });
      }
    });

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
      setOnlineUsers([]);
    };
  }, [examId, enabled, user]);

  // Update cursor position
  const updateCursor = useCallback((cursor: CursorPosition) => {
    cursorRef.current = cursor;

    if (channelRef.current && user && isConnected) {
      channelRef.current.track({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        name: user.fullName || user.firstName || 'Anonymous',
        imageUrl: user.imageUrl,
        cursor,
        lastSeen: Date.now(),
      });
    }
  }, [user, isConnected]);

  // Broadcast data changes to other collaborators
  const broadcastChange = useCallback((change: Omit<ExamDataChange, 'timestamp' | 'userId'>) => {
    if (channelRef.current && user && isConnected) {
      const fullChange: ExamDataChange = {
        ...change,
        timestamp: Date.now(),
        userId: user.id,
      };
      console.log('Broadcasting change:', fullChange);
      channelRef.current.send({
        type: 'broadcast',
        event: 'data_change',
        payload: fullChange,
      });
    }
  }, [user, isConnected]);

  return {
    onlineUsers,
    updateCursor,
    broadcastChange,
    isConnected,
  };
}
