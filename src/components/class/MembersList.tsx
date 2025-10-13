'use client'

import { MemberListItem } from './MemberListItem'
import { Shield, UserCheck, GraduationCap } from 'lucide-react'

interface MembersListProps {
  admins?: any[]
  teachers?: any[]
  students?: any[]
  isAdmin: boolean
  managingMember: string | null
  onViewProfile: (member: any, role: string) => void
  onChangeRole: (member: any, role: string) => void
  onRemove: (member: any, role: string) => void
}

export function MembersList({
  admins = [],
  teachers = [],
  students = [],
  isAdmin,
  managingMember,
  onViewProfile,
  onChangeRole,
  onRemove
}: MembersListProps) {
  return (
    <div className="space-y-6">
      {admins.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Administrators ({admins.length})
          </h3>
          <div className="space-y-3">
            {admins.map((admin: any) => (
              <MemberListItem
                key={admin.user_id}
                member={admin}
                role="admin"
                isAdmin={isAdmin}
                isManaging={managingMember === admin.user_id}
                onViewProfile={() => onViewProfile(admin, 'admin')}
                onChangeRole={() => onChangeRole(admin, 'admin')}
                onRemove={() => onRemove(admin, 'admin')}
              />
            ))}
          </div>
        </div>
      )}

      {teachers.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Teachers ({teachers.length})
          </h3>
          <div className="space-y-3">
            {teachers.map((teacher: any) => (
              <MemberListItem
                key={teacher.user_id}
                member={teacher}
                role="teacher"
                isAdmin={isAdmin}
                isManaging={managingMember === teacher.user_id}
                onViewProfile={() => onViewProfile(teacher, 'teacher')}
                onChangeRole={() => onChangeRole(teacher, 'teacher')}
                onRemove={() => onRemove(teacher, 'teacher')}
              />
            ))}
          </div>
        </div>
      )}

      {students.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Students ({students.length})
          </h3>
          <div className="space-y-3">
            {students.map((student: any) => (
              <MemberListItem
                key={student.user_id}
                member={student}
                role="student"
                isAdmin={isAdmin}
                isManaging={managingMember === student.user_id}
                onViewProfile={() => onViewProfile(student, 'student')}
                onChangeRole={() => onChangeRole(student, 'student')}
                onRemove={() => onRemove(student, 'student')}
              />
            ))}
          </div>
        </div>
      )}

      {admins.length === 0 && teachers.length === 0 && students.length === 0 && (
        <p className="text-sm text-muted-foreground">No members in this class yet</p>
      )}
    </div>
  )
}

