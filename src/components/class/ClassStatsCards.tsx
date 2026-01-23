'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, Users, FileText } from 'lucide-react'

interface ClassStatsCardsProps {
  periodStart: string | null | undefined
  periodEnd: string | null | undefined
  memberCount: number
  adminCount: number
  teacherCount: number
  studentCount: number
  assignmentCount: number
}

/**
 * Formats a time string (HH:MM) into a readable 12-hour format
 * @param {string | null | undefined} timeString - Time string in HH:MM format or null/undefined
 * @returns {string} Formatted time string in 12-hour format (e.g., "2:30 PM")
 */
const formatTime = (timeString: string | null | undefined) => {
  if (!timeString) return 'Not set'
  const time = timeString.split(':')
  const hours = parseInt(time[0])
  const minutes = time[1]
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes} ${ampm}`
}

/**
 * Component that displays class statistics in card format
 * Shows class schedule, member counts, and assignment count
 * @param {ClassStatsCardsProps} props - Component props
 * @param {string | null | undefined} props.periodStart - Class period start time
 * @param {string | null | undefined} props.periodEnd - Class period end time
 * @param {number} props.memberCount - Total number of class members
 * @param {number} props.adminCount - Number of admin members
 * @param {number} props.teacherCount - Number of teacher members
 * @param {number} props.studentCount - Number of student members
 * @param {number} props.assignmentCount - Total number of assignments
 * @returns {JSX.Element} Grid of stat cards displaying class information
 */
export function ClassStatsCards({
  periodStart,
  periodEnd,
  memberCount,
  adminCount,
  teacherCount,
  studentCount,
  assignmentCount
}: ClassStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Class Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatTime(periodStart)} - {formatTime(periodEnd)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Total Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{memberCount}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {adminCount} admins, {teacherCount} teachers, {studentCount} students
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{assignmentCount}</div>
          <div className="text-xs text-muted-foreground mt-1">Total assignments</div>
        </CardContent>
      </Card>
    </div>
  )
}

