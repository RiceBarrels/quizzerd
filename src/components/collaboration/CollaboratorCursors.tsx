'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { PresenceUser, CursorPosition } from '@/hooks/useRealtimePresence';
import {
  Cursor,
  CursorPointer,
  CursorBody,
  CursorName,
} from '@/components/kibo-ui/cursor';

interface CollaboratorCursorsProps {
  onlineUsers: PresenceUser[];
  currentUserId?: string;
  updateCursor: (cursor: CursorPosition) => void;
  isConnected: boolean;
  /** Map of question IDs to their display numbers (1-indexed) */
  questionNumbers?: Map<string, number>;
}

/**
 * Displays real-time cursor positions of collaborators and tracks local mouse position
 * Uses page/document coordinates (absolute positioning) to handle scrolling correctly
 */
export function CollaboratorCursors({
  onlineUsers,
  currentUserId,
  updateCursor,
  isConnected,
  questionNumbers = new Map(),
}: CollaboratorCursorsProps) {
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [documentHeight, setDocumentHeight] = useState(0);

  // Track document height for the absolute container
  useEffect(() => {
    const updateHeight = () => {
      setDocumentHeight(Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      ));
    };

    updateHeight();

    // Update on resize and mutation
    window.addEventListener('resize', updateHeight);
    const observer = new ResizeObserver(updateHeight);
    observer.observe(document.body);

    return () => {
      window.removeEventListener('resize', updateHeight);
      observer.disconnect();
    };
  }, []);

  // Track local mouse position and broadcast to collaborators
  // Uses pageX/pageY for document-relative coordinates
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isConnected) return;

    // Use page coordinates (document-relative) instead of client coordinates (viewport-relative)
    const x = e.pageX;
    const y = e.pageY;

    // Throttle updates to avoid flooding the channel (max ~30fps)
    if (throttleTimeoutRef.current) return;

    throttleTimeoutRef.current = setTimeout(() => {
      throttleTimeoutRef.current = null;

      // Only broadcast if position changed significantly (> 5px)
      if (
        lastPositionRef.current &&
        Math.abs(lastPositionRef.current.x - x) < 5 &&
        Math.abs(lastPositionRef.current.y - y) < 5
      ) {
        return;
      }

      lastPositionRef.current = { x, y };
      updateCursor({
        questionId: null,
        fieldType: null,
        x,
        y,
      });
    }, 33); // ~30fps
  }, [isConnected, updateCursor]);

  // Set up mouse tracking
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [handleMouseMove]);

  // Filter out current user and users without cursor position
  const usersWithCursors = onlineUsers.filter(
    (u) => u.id !== currentUserId && u.cursor.x !== undefined && u.cursor.y !== undefined
  );

  if (usersWithCursors.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-[9999] w-full overflow-visible"
      style={{ height: documentHeight || '100%' }}
    >
      {usersWithCursors.map((user) => (
        <div
          key={user.id}
          className="absolute transition-all duration-100 ease-out"
          style={{
            left: user.cursor.x,
            top: user.cursor.y,
            transform: 'translate(-2px, -2px)',
          }}
        >
          <Cursor>
            <CursorPointer style={{ color: user.color }} className="size-4.5" />
            <CursorBody
              style={{
                backgroundColor: user.color,
                color: 'white',
              }}
            >
              <CursorName>
                {user.name}
                {user.cursor.questionId && questionNumbers.get(user.cursor.questionId) && (
                  <span className="ml-1 opacity-80">
                    • Q{questionNumbers.get(user.cursor.questionId)}
                    {user.cursor.fieldType && user.cursor.fieldType !== 'question' && (
                      <span className="ml-0.5 text-[10px]">
                        ({user.cursor.fieldType})
                      </span>
                    )}
                  </span>
                )}
              </CursorName>
            </CursorBody>
          </Cursor>
        </div>
      ))}
    </div>
  );
}
