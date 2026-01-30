'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { PresenceUser, CursorPosition } from '@/hooks/useRealtimePresence';
import {
  Cursor,
  CursorPointer,
  CursorBody,
  CursorName,
  CursorMessage,
} from '@/components/kibo-ui/cursor';

interface CollaboratorCursorsProps {
  onlineUsers: PresenceUser[];
  currentUserId?: string;
  updateCursor: (cursor: CursorPosition) => void;
  isConnected: boolean;
  /** Map of question IDs to their display numbers (1-indexed) */
  questionNumbers?: Map<string, number>;
}

// How long to show a message before it fades (in ms)
const MESSAGE_DISPLAY_DURATION = 5000;

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

  // Chat input state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatPosition, setChatPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const chatInputRef = useRef<HTMLInputElement>(null);

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

  // Handle "/" key to open chat
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only open chat on "/" if not already typing in an input/textarea
    const target = e.target as HTMLElement;
    const isInputElement = target.tagName === 'INPUT' ||
                          target.tagName === 'TEXTAREA' ||
                          target.isContentEditable ||
                          target.closest('.ql-editor');

    if (e.key === '/' && !isChatOpen && !isInputElement && isConnected) {
      e.preventDefault();
      // Use the last known position or center of viewport
      const x = lastPositionRef.current?.x ?? window.innerWidth / 2 + window.scrollX;
      const y = lastPositionRef.current?.y ?? window.innerHeight / 2 + window.scrollY;
      setChatPosition({ x, y });
      setIsChatOpen(true);
      setChatMessage('');
    }

    // Close chat on Escape
    if (e.key === 'Escape' && isChatOpen) {
      setIsChatOpen(false);
      setChatMessage('');
    }
  }, [isChatOpen, isConnected]);

  // Set up "/" key listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Focus input when chat opens
  useEffect(() => {
    if (isChatOpen && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [isChatOpen]);

  // Send chat message
  const handleSendMessage = useCallback(() => {
    if (!chatMessage.trim() || !isConnected) return;

    updateCursor({
      questionId: null,
      fieldType: null,
      x: chatPosition.x,
      y: chatPosition.y,
      message: chatMessage.trim(),
      messageTimestamp: Date.now(),
    });

    setIsChatOpen(false);
    setChatMessage('');
  }, [chatMessage, chatPosition, isConnected, updateCursor]);

  // Handle input key events
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && chatMessage.trim()) {
      e.preventDefault();
      handleSendMessage();
    }
    if (e.key === 'Escape') {
      setIsChatOpen(false);
      setChatMessage('');
    }
  };

  // Force re-render to expire messages after MESSAGE_DISPLAY_DURATION
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const usersWithMessages = onlineUsers.filter(
      (u) => u.cursor.message && u.cursor.messageTimestamp
    );

    if (usersWithMessages.length === 0) return;

    // Find the earliest expiring message
    const now = Date.now();
    const expirationTimes = usersWithMessages.map(
      (u) => (u.cursor.messageTimestamp || 0) + MESSAGE_DISPLAY_DURATION - now
    );
    const nextExpiration = Math.max(100, Math.min(...expirationTimes));

    const timer = setTimeout(() => {
      forceUpdate((n) => n + 1);
    }, nextExpiration);

    return () => clearTimeout(timer);
  }, [onlineUsers]);

  // Filter out current user and users without cursor position
  const usersWithCursors = onlineUsers.filter(
    (u) => u.id !== currentUserId && u.cursor.x !== undefined && u.cursor.y !== undefined
  );

  // Check if a user's message is still visible (within display duration)
  const isMessageVisible = (user: PresenceUser) => {
    if (!user.cursor.message || !user.cursor.messageTimestamp) return false;
    return Date.now() - user.cursor.messageTimestamp < MESSAGE_DISPLAY_DURATION;
  };

  // Show chat input even if no other users have cursors
  if (usersWithCursors.length === 0 && !isChatOpen) return null;

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-[9999] w-full overflow-visible"
      style={{ height: documentHeight || '100%' }}
    >
      {/* Chat input for current user */}
      {isChatOpen && (
        <div
          className="pointer-events-auto absolute"
          style={{
            left: chatPosition.x,
            top: chatPosition.y,
            transform: 'translate(10px, 10px)',
          }}
        >
          <div className="flex items-center gap-2 rounded-lg bg-white shadow-lg border border-gray-200 p-2">
            <input
              ref={chatInputRef}
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onBlur={() => {
                // Small delay to allow clicking send button
                setTimeout(() => {
                  if (!chatMessage.trim()) {
                    setIsChatOpen(false);
                  }
                }, 150);
              }}
              placeholder="Type a message..."
              className="w-48 px-2 py-1 text-sm outline-none"
              maxLength={100}
            />
            <button
              onClick={handleSendMessage}
              disabled={!chatMessage.trim()}
              className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-1 ml-1">
            Press Enter to send, Esc to cancel
          </div>
        </div>
      )}

      {/* Collaborator cursors with messages */}
      {usersWithCursors.map((user) => {
        const isTyping = user.cursor.isTyping || (user.cursor.lastActivityTimestamp && Date.now() - user.cursor.lastActivityTimestamp < 3000);
        return (
        <div
          key={user.id}
          className={`absolute transition-all duration-100 ease-out ${isTyping ? 'scale-110' : ''}`}
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
                {/* Typing indicator */}
                {(user.cursor.isTyping || (user.cursor.lastActivityTimestamp && Date.now() - user.cursor.lastActivityTimestamp < 3000)) && (
                  <span className="ml-1 flex items-center gap-0.5">
                    <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </CursorName>
              {/* Show message if visible */}
              {isMessageVisible(user) && (
                <CursorMessage className="mt-1 font-normal opacity-100">
                  {user.cursor.message}
                </CursorMessage>
              )}
            </CursorBody>
          </Cursor>
        </div>
        );
      })}
    </div>
  );
}
