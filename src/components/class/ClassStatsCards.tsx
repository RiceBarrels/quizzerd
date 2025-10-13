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

const formatTime = (timeString: string | null | undefined) => {
  if (!timeString) return 'Not set'
  const time = timeString.split(':')
  const hours = parseInt(time[0])
  const minutes = time[1]
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes} ${ampm}`
}

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

