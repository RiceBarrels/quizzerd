'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { PresenceUser } from '@/hooks/useCollaboration';

interface PresenceIndicatorsProps {
  activeUsers: PresenceUser[];
  currentUserId: string;
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-red-500',
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitials(name: string, email: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

export default function PresenceIndicators({
  activeUsers,
  currentUserId,
  maxVisible = 5,
  size = 'md',
  className,
}: PresenceIndicatorsProps) {
  // Filter out current user and get only others
  const otherUsers = activeUsers.filter((user) => user.user_id !== currentUserId);

  if (otherUsers.length === 0) {
    return null;
  }

  const visibleUsers = otherUsers.slice(0, maxVisible);
  const hiddenCount = otherUsers.length - maxVisible;

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const ringSize = {
    sm: 'ring-1',
    md: 'ring-2',
    lg: 'ring-2',
  };

  return (
    <TooltipProvider>
      <div className={cn('flex items-center', className)}>
        <div className="flex -space-x-2">
          {visibleUsers.map((user) => (
            <Tooltip key={user.user_id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar
                    className={cn(
                      sizeClasses[size],
                      ringSize[size],
                      'ring-background cursor-pointer transition-transform hover:scale-110 hover:z-10'
                    )}
                  >
                    <AvatarImage src={user.user_avatar || ''} alt={user.user_name} />
                    <AvatarFallback
                      className={cn(getUserColor(user.user_id), 'text-white')}
                    >
                      {getInitials(user.user_name, user.user_email)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator */}
                  <span
                    className={cn(
                      'absolute bottom-0 right-0 block rounded-full bg-green-500 ring-2 ring-background',
                      size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
                    )}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-medium">{user.user_name || 'Unknown'}</p>
                <p className="text-muted-foreground">{user.user_email}</p>
                {user.current_question_id && (
                  <p className="text-muted-foreground mt-1">
                    Editing question...
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Hidden users count */}
          {hiddenCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    sizeClasses[size],
                    ringSize[size],
                    'ring-background rounded-full bg-muted flex items-center justify-center cursor-pointer transition-transform hover:scale-110 hover:z-10'
                  )}
                >
                  <span className="text-muted-foreground font-medium">
                    +{hiddenCount}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p className="font-medium">{hiddenCount} more collaborators</p>
                <div className="mt-1 space-y-0.5">
                  {otherUsers.slice(maxVisible).map((user) => (
                    <p key={user.user_id} className="text-muted-foreground">
                      {user.user_name || user.user_email}
                    </p>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Editing indicator */}
        <Badge variant="secondary" className="ml-3 text-xs">
          {otherUsers.length} {otherUsers.length === 1 ? 'person' : 'people'} editing
        </Badge>
      </div>
    </TooltipProvider>
  );
}

// Compact version for use in tight spaces
export function CompactPresenceIndicators({
  activeUsers,
  currentUserId,
  className,
}: Omit<PresenceIndicatorsProps, 'maxVisible' | 'size'>) {
  const otherUsers = activeUsers.filter((user) => user.user_id !== currentUserId);

  if (otherUsers.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 cursor-pointer',
              className
            )}
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400">
              {otherUsers.length} online
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p className="font-medium mb-1">Currently editing:</p>
          <div className="space-y-0.5">
            {otherUsers.map((user) => (
              <p key={user.user_id} className="text-muted-foreground">
                {user.user_name || user.user_email}
              </p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Question-level presence indicator
interface QuestionPresenceProps {
  questionId: string;
  activeUsers: PresenceUser[];
  currentUserId: string;
}

export function QuestionPresenceIndicator({
  questionId,
  activeUsers,
  currentUserId,
}: QuestionPresenceProps) {
  const usersOnQuestion = activeUsers.filter(
    (user) =>
      user.user_id !== currentUserId && user.current_question_id === questionId
  );

  if (usersOnQuestion.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex -space-x-1">
        {usersOnQuestion.slice(0, 3).map((user) => (
          <Tooltip key={user.user_id}>
            <TooltipTrigger asChild>
              <Avatar className="w-5 h-5 ring-1 ring-background cursor-pointer">
                <AvatarImage src={user.user_avatar || ''} alt={user.user_name} />
                <AvatarFallback
                  className={cn(getUserColor(user.user_id), 'text-white text-[10px]')}
                >
                  {getInitials(user.user_name, user.user_email)}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>{user.user_name || user.user_email} is editing</p>
            </TooltipContent>
          </Tooltip>
        ))}
        {usersOnQuestion.length > 3 && (
          <div className="w-5 h-5 ring-1 ring-background rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
            +{usersOnQuestion.length - 3}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
