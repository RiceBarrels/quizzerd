'use client';

import { PresenceUser } from '@/hooks/useRealtimePresence';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PresenceCursorsProps {
  onlineUsers: PresenceUser[];
  currentUserId?: string;
}

/**
 * Shows avatars of all online collaborators
 */
export function OnlineCollaborators({ onlineUsers, currentUserId }: PresenceCursorsProps) {
  const otherUsers = onlineUsers.filter(u => u.id !== currentUserId);

  if (otherUsers.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground mr-1">Online:</span>
        <div className="flex -space-x-2">
          {otherUsers.slice(0, 5).map((user) => (
            <Tooltip key={user.id}>
              <TooltipTrigger asChild>
                <div
                  className="relative ring-2 ring-background rounded-full"
                  style={{ boxShadow: `0 0 0 2px ${user.color}` }}
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.imageUrl} alt={user.name} />
                    <AvatarFallback
                      style={{ backgroundColor: user.color, color: 'white' }}
                      className="text-xs font-medium"
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 ring-1 ring-background"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                {user.cursor.questionId && (
                  <p className="text-xs mt-1">
                    Editing: {user.cursor.fieldType || 'question'}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
          {otherUsers.length > 5 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium ring-2 ring-background">
                  +{otherUsers.length - 5}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{otherUsers.length - 5} more collaborators online</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

interface QuestionPresenceProps {
  questionId: string;
  onlineUsers: PresenceUser[];
  currentUserId?: string;
}

/**
 * Shows which collaborators are currently editing a specific question
 */
export function QuestionPresenceIndicator({
  questionId,
  onlineUsers,
  currentUserId,
}: QuestionPresenceProps) {
  const usersOnQuestion = onlineUsers.filter(
    (u) => u.id !== currentUserId && u.cursor.questionId === questionId
  );

  if (usersOnQuestion.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 absolute -top-2 -right-2 z-10">
        {usersOnQuestion.map((user) => (
          <Tooltip key={user.id}>
            <TooltipTrigger asChild>
              <div
                className="relative animate-pulse"
                style={{
                  boxShadow: `0 0 0 2px ${user.color}`,
                  borderRadius: '50%'
                }}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.imageUrl} alt={user.name} />
                  <AvatarFallback
                    style={{ backgroundColor: user.color, color: 'white' }}
                    className="text-xs font-medium"
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">
                Editing {user.cursor.fieldType || 'this question'}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

interface FieldPresenceProps {
  questionId: string;
  fieldType: 'question' | 'option' | 'explanation' | 'settings';
  optionIndex?: number;
  onlineUsers: PresenceUser[];
  currentUserId?: string;
}

/**
 * Shows a colored border when a collaborator is editing a specific field
 */
export function FieldPresenceBorder({
  questionId,
  fieldType,
  optionIndex,
  onlineUsers,
  currentUserId,
}: FieldPresenceProps) {
  const userOnField = onlineUsers.find(
    (u) =>
      u.id !== currentUserId &&
      u.cursor.questionId === questionId &&
      u.cursor.fieldType === fieldType &&
      (optionIndex === undefined || u.cursor.optionIndex === optionIndex)
  );

  if (!userOnField) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="absolute inset-0 pointer-events-none rounded-md border-2 animate-pulse"
            style={{ borderColor: userOnField.color }}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{userOnField.name}</p>
          <p className="text-xs text-muted-foreground">is editing this field</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact presence indicator showing colored dots
 */
export function CompactPresenceIndicator({
  onlineUsers,
  currentUserId,
}: PresenceCursorsProps) {
  const otherUsers = onlineUsers.filter(u => u.id !== currentUserId);

  if (otherUsers.length === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-0.5">
            {otherUsers.slice(0, 3).map((user) => (
              <div
                key={user.id}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: user.color }}
              />
            ))}
            {otherUsers.length > 3 && (
              <span className="text-xs text-muted-foreground ml-1">
                +{otherUsers.length - 3}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{otherUsers.length} collaborator{otherUsers.length !== 1 ? 's' : ''} online</p>
          <ul className="text-xs text-muted-foreground mt-1">
            {otherUsers.map(u => (
              <li key={u.id}>{u.name}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
