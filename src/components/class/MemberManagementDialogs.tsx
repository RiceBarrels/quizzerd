'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, UserCheck, GraduationCap } from 'lucide-react'

interface ProfileDialogProps {
  open: boolean
  member: any
  role: string
  onClose: () => void
}

interface RoleChangeDialogProps {
  open: boolean
  member: any
  currentRole: string
  isManaging: boolean
  onChangeRole: (memberId: string, newRole: string, memberName: string) => void
  onClose: () => void
}

interface RemoveDialogProps {
  open: boolean
  member: any
  isManaging: boolean
  onRemove: (memberId: string, memberName: string) => void
  onClose: () => void
}

const getRoleIcon = (role: string) => {
  switch(role) {
    case 'admin': return <Shield className="h-4 w-4" />
    case 'teacher': return <UserCheck className="h-4 w-4" />
    default: return <GraduationCap className="h-4 w-4" />
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
 * Dialog component for displaying detailed member profile information
 * @param {ProfileDialogProps} props - Component props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {any} props.member - Member data object
 * @param {string} props.role - The member's role
 * @param {() => void} props.onClose - Callback function called when dialog is closed
 * @returns {JSX.Element} Dialog showing member profile details
 */
export function ProfileDialog({ open, member, role, onClose }: ProfileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Member Profile</DialogTitle>
          <DialogDescription>
            Detailed information about this class member
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Profile Picture and Basic Info */}
          <div className="flex items-center gap-4">
            {member.img_url ? (
              <img 
                src={member.img_url} 
                alt={member.full_name || member.email}
                className="h-20 w-20 rounded-full object-cover border-4 border-primary/20"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20">
                {getRoleIcon(role)}
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-xl font-semibold">
                {member.full_name || 
                 `${member.first_name || ''} ${member.last_name || ''}`.trim() || 
                 'No Name'}
              </h3>
              <Badge variant={getRoleBadgeVariant(role)} className="mt-1">
                {getRoleIcon(role)}
                <span className="ml-1 capitalize">{role}</span>
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Detailed Information */}
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Email Address</p>
              <p className="text-sm font-mono bg-muted p-2 rounded">{member.email}</p>
            </div>

            {member.first_name && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">First Name</p>
                <p className="text-sm">{member.first_name}</p>
              </div>
            )}

            {member.last_name && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Last Name</p>
                <p className="text-sm">{member.last_name}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">User ID</p>
              <p className="text-xs font-mono bg-muted p-2 rounded break-all">{member.user_id}</p>
            </div>

            {member.created_at && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Member Since</p>
                <p className="text-sm">{new Date(member.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Dialog component for changing a member's role in the class
 * @param {RoleChangeDialogProps} props - Component props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {any} props.member - Member data object
 * @param {string} props.currentRole - Current role of the member
 * @param {boolean} props.isManaging - Whether a role change operation is in progress
 * @param {(memberId: string, newRole: string, memberName: string) => void} props.onChangeRole - Callback function called when role is changed
 * @param {() => void} props.onClose - Callback function called when dialog is closed
 * @returns {JSX.Element} Dialog for changing member role
 */
export function RoleChangeDialog({ 
  open, 
  member, 
  currentRole, 
  isManaging,
  onChangeRole, 
  onClose 
}: RoleChangeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Member Role</DialogTitle>
          <DialogDescription>
            Change the role for {member.full_name || member.email}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Role</label>
            <p className="text-sm text-muted-foreground capitalize">{currentRole}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">New Role</label>
            <Select 
              defaultValue={currentRole}
              onValueChange={(value) => {
                onChangeRole(
                  member.user_id, 
                  value, 
                  member.full_name || member.email
                )
              }}
              disabled={isManaging}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select new role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>Admin</span>
                  </div>
                </SelectItem>
                <SelectItem value="teacher">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    <span>Teacher</span>
                  </div>
                </SelectItem>
                <SelectItem value="student">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    <span>Student</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isManaging}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Dialog component for confirming removal of a member from the class
 * @param {RemoveDialogProps} props - Component props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {any} props.member - Member data object
 * @param {boolean} props.isManaging - Whether a removal operation is in progress
 * @param {(memberId: string, memberName: string) => void} props.onRemove - Callback function called when member is removed
 * @param {() => void} props.onClose - Callback function called when dialog is closed
 * @returns {JSX.Element} Alert dialog for confirming member removal
 */
export function RemoveMemberDialog({ 
  open, 
  member, 
  isManaging,
  onRemove, 
  onClose 
}: RemoveDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Member from Class</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <strong>{member.full_name || member.email}</strong> from this class? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={onClose}
            disabled={isManaging}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onRemove(
                member.user_id, 
                member.full_name || member.email
              )
            }}
            disabled={isManaging}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isManaging ? 'Removing...' : 'Remove'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

