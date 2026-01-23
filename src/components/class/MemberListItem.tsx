'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuSeparator, ContextMenuTrigger } from '@/components/ui/context-menu'
import { Shield, UserCheck, GraduationCap, Users, UserCog, Trash2, MoreVertical } from 'lucide-react'
import { useRef } from 'react'

interface MemberListItemProps {
  member: any
  role: 'admin' | 'teacher' | 'student'
  isAdmin: boolean
  isManaging: boolean
  onViewProfile: () => void
  onChangeRole?: () => void
  onRemove?: () => void
}

/**
 * Returns the appropriate icon component for a given role
 * @param {string} role - The role name ('admin', 'teacher', or 'student')
 * @returns {JSX.Element} Icon component for the role
 */
const getRoleIcon = (role: string) => {
  switch(role) {
    case 'admin': return <Shield className="h-5 w-5 text-red-600" />
    case 'teacher': return <UserCheck className="h-5 w-5 text-blue-600" />
    default: return <GraduationCap className="h-5 w-5 text-green-600" />
  }
}

/**
 * Returns the appropriate badge variant for a given role
 * @param {string} role - The role name ('admin', 'teacher', or 'student')
 * @returns {"default" | "destructive" | "secondary"} Badge variant for the role
 */
const getRoleBadgeVariant = (role: string): "default" | "destructive" | "secondary" => {
  switch(role) {
    case 'admin': return 'destructive'
    case 'teacher': return 'secondary'
    default: return 'default'
  }
}

/**
 * Returns the appropriate border color class for a given role
 * @param {string} role - The role name ('admin', 'teacher', or 'student')
 * @returns {string} Tailwind CSS class for border color
 */
const getRoleBorderColor = (role: string) => {
  switch(role) {
    case 'admin': return 'border-red-200'
    case 'teacher': return 'border-blue-200'
    default: return 'border-green-200'
  }
}

/**
 * Returns the appropriate background color class for a given role
 * @param {string} role - The role name ('admin', 'teacher', or 'student')
 * @returns {string} Tailwind CSS class for background color
 */
const getRoleBackgroundColor = (role: string) => {
  switch(role) {
    case 'admin': return 'bg-red-100'
    case 'teacher': return 'bg-blue-100'
    default: return 'bg-green-100'
  }
}

/**
 * Component that displays a single member item in the members list with context menu
 * @param {MemberListItemProps} props - Component props
 * @param {any} props.member - Member data object
 * @param {'admin' | 'teacher' | 'student'} props.role - The member's role
 * @param {boolean} props.isAdmin - Whether the current user is an admin
 * @param {boolean} props.isManaging - Whether a management operation is in progress
 * @param {() => void} props.onViewProfile - Callback when viewing member profile
 * @param {() => void} [props.onChangeRole] - Optional callback when changing member role
 * @param {() => void} [props.onRemove] - Optional callback when removing member
 * @returns {JSX.Element} Member list item with profile info and context menu
 */
export function MemberListItem({ 
  member, 
  role, 
  isAdmin, 
  isManaging,
  onViewProfile, 
  onChangeRole, 
  onRemove 
}: MemberListItemProps) {
  const contextMenuRef = useRef<HTMLDivElement>(null)

  const handleMoreClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Create and dispatch a context menu event
    const contextMenuEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: e.clientX,
      clientY: e.clientY,
    })
    
    contextMenuRef.current?.dispatchEvent(contextMenuEvent)
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div 
          ref={contextMenuRef}
          className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
        >
          <div 
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
            onClick={onViewProfile}
          >
            {member.img_url ? (
              <img 
                src={member.img_url} 
                alt={member.full_name || member.email}
                className={`h-10 w-10 rounded-full object-cover border-2 ${getRoleBorderColor(role)}`}
              />
            ) : (
              <div className={`h-10 w-10 rounded-full ${getRoleBackgroundColor(role)} flex items-center justify-center border-2 ${getRoleBorderColor(role)}`}>
                {getRoleIcon(role)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">
                  {member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.email}
                </p>
                <Badge variant={getRoleBadgeVariant(role)} className="shrink-0 capitalize">
                  {role}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
              <p className="text-xs text-muted-foreground/70 truncate font-mono">ID: {member.user_id}</p>
            </div>
          </div>
          {isAdmin && (
            <Button 
              variant="ghost" 
              size="sm" 
              disabled={isManaging}
              onClick={handleMoreClick}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel>
          {member.full_name || member.email}
        </ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onViewProfile}>
          <Users className="h-4 w-4 mr-2" />
          View Profile
        </ContextMenuItem>
        {isAdmin && onChangeRole && onRemove && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onChangeRole}>
              <UserCog className="h-4 w-4 mr-2" />
              Change Role
            </ContextMenuItem>
            <ContextMenuItem variant="destructive" onClick={onRemove}>
              <Trash2 className="h-4 w-4 mr-2" />
              Remove from Class
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

