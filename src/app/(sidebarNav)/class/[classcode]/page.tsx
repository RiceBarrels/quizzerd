'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Users, 
  FileText, 
  Settings,
  Clock,
  UserCheck,
  GraduationCap,
  Shield,
  CopyIcon,
  CheckIcon
} from 'lucide-react'
import { Dialog, DialogTrigger } from '@/components/ui/dialog'
import { DialogContent } from '@radix-ui/react-dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

export default function ClassPage() {
  const params = useParams()
  const router = useRouter()
  const [classData, setClassData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  useEffect(() => {
    const fetchClass = async () => {
      try {
        const response = await fetch(`/api/classes/get?classCode=${params.classcode}`)
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch class')
        }
        
        setClassData(data.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (params.classcode) {
      fetchClass()
    }
  }, [params.classcode])

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-[250px]" />
          <Skeleton className="h-4 w-[400px]" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/home')}>
              Go Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!classData) {
    return null
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

  const getRoleBadgeVariant = (role: string) => {
    switch(role) {
      case 'admin': return 'destructive'
      case 'teacher': return 'secondary'
      default: return 'default'
    }
  }

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'admin': return <Shield className="h-4 w-4" />
      case 'teacher': return <UserCheck className="h-4 w-4" />
      default: return <GraduationCap className="h-4 w-4" />
    }
  }

  const memberCount = classData.member_count || 
    ((classData.admin_ids?.length || 0) + 
     (classData.teacher_ids?.length || 0) + 
     (classData.student_ids?.length || 0))

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{classData.class_name}</h1>
            <Badge variant={getRoleBadgeVariant(classData.role)} className="flex items-center gap-1">
              {getRoleIcon(classData.role)}
              {classData.role}
            </Badge>
          </div>
          {classData.description && (
            <p className="text-muted-foreground">{classData.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {classData.role === 'admin' && (
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger>
                <Button size="sm">
                    Code: {classData.class_code || params.classcode}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="flex flex-col gap-8">
                <AlertDialogHeader>
                    <AlertDialogTitle>Class code</AlertDialogTitle>
                    <AlertDialogDescription className='text-xs'>{classData.class_name}</AlertDialogDescription>
                </AlertDialogHeader>
                <div>
                    <div className='font-black flex justify-center text-6xl md:text-8xl'>
                        {classData.class_code}
                    </div>
                    <div className='text-right px-8'>
                        <Button variant="ghost" onClick={
                            async()=>{
                                await navigator.clipboard.writeText(classData.class_code);

                                setIsCopied(true);
                                setTimeout(()=>setIsCopied(false), 2000)
                            }
                        }>
                            {isCopied ? <><CheckIcon className='text-green-600'/> <span className='text-green-600'>Copied</span></> : <><CopyIcon/> Copy</>}
                        </Button>
                    </div>
                </div>
                <AlertDialogFooter className="gap-4">

                    <AlertDialogCancel>
                        Close
                    </AlertDialogCancel>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

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
              {formatTime(classData.period_start)} - {formatTime(classData.period_end)}
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
              {classData.admin_ids?.length || 0} admins, {classData.teacher_ids?.length || 0} teachers, {classData.student_ids?.length || 0} students
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
            <div className="text-2xl font-bold">{classData.assignments?.length || 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Total assignments</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          {(classData.role === 'admin' || classData.role === 'teacher') && (
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Class Information</CardTitle>
              <CardDescription>Details about this class</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Class Code</p>
                  <p className="text-sm font-mono">{classData.class_code || params.classcode}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Class ID</p>
                  <p className="text-sm">{classData.class_id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-sm">{new Date(classData.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={classData.is_archived ? 'secondary' : 'default'}>
                    {classData.is_archived ? 'Archived' : 'Active'}
                  </Badge>
                </div>
              </div>
              {classData.description && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                    <p className="text-sm">{classData.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates in this class</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assignments</CardTitle>
              <CardDescription>View and manage class assignments</CardDescription>
            </CardHeader>
            <CardContent>
              {classData.assignments && classData.assignments.length > 0 ? (
                <div className="space-y-4">
                  {classData.assignments.map((assignment: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{assignment.title || `Assignment ${index + 1}`}</p>
                        <p className="text-sm text-muted-foreground">{assignment.description}</p>
                      </div>
                      <Button variant="outline" size="sm">View</Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No assignments yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Class Members</CardTitle>
              <CardDescription>View all members in this class</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {classData.admins && classData.admins.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Administrators ({classData.admins.length})
                  </h3>
                  <div className="space-y-3">
                    {classData.admins.map((admin: any) => (
                      <div key={admin.user_id} className="flex items-center gap-3 p-3 border rounded-lg">
                        {admin.img_url ? (
                          <img 
                            src={admin.img_url} 
                            alt={admin.full_name || admin.email}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                            <Shield className="h-5 w-5 text-red-600" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{admin.full_name || admin.email}</p>
                            <Badge variant="destructive">Admin</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{admin.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {classData.teachers && classData.teachers.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Teachers ({classData.teachers.length})
                  </h3>
                  <div className="space-y-3">
                    {classData.teachers.map((teacher: any) => (
                      <div key={teacher.user_id} className="flex items-center gap-3 p-3 border rounded-lg">
                        {teacher.img_url ? (
                          <img 
                            src={teacher.img_url} 
                            alt={teacher.full_name || teacher.email}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <UserCheck className="h-5 w-5 text-blue-600" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{teacher.full_name || teacher.email}</p>
                            <Badge variant="secondary">Teacher</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{teacher.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {classData.students && classData.students.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Students ({classData.students.length})
                  </h3>
                  <div className="space-y-3">
                    {classData.students.map((student: any) => (
                      <div key={student.user_id} className="flex items-center gap-3 p-3 border rounded-lg">
                        {student.img_url ? (
                          <img 
                            src={student.img_url} 
                            alt={student.full_name || student.email}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                            <GraduationCap className="h-5 w-5 text-green-600" />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{student.full_name || student.email}</p>
                            <Badge variant="default">Student</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {memberCount === 0 && (
                <p className="text-sm text-muted-foreground">No members in this class yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {(classData.role === 'admin' || classData.role === 'teacher') && (
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Class Analytics</CardTitle>
                <CardDescription>Performance and engagement metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Analytics coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}