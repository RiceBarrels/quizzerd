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
  Settings,
  CopyIcon,
  CheckIcon,
  Palette,
  Shield,
  UserCheck,
  GraduationCap,
  Clock
} from 'lucide-react'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { ClassStatsCards } from '@/components/class/ClassStatsCards'
import { MembersList } from '@/components/class/MembersList'
import { ProfileDialog, RoleChangeDialog, RemoveMemberDialog } from '@/components/class/MemberManagementDialogs'
import { ClassSettingsDialog } from '@/components/class/ClassSettingsDialog'

const AVAILABLE_THEMES = [
  { value: 'default', label: 'Default', description: 'System default theme' },
  { value: 'neo-brutalism', label: 'Neo Brutalism', description: 'Bold and striking design' },
  { value: 'solar-dusk', label: 'Solar Dusk', description: 'Warm sunset colors' },
]

export default function ClassPage() {
  const params = useParams()
  const router = useRouter()
  const [classData, setClassData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [themeDialogOpen, setThemeDialogOpen] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState('default')
  const [savingTheme, setSavingTheme] = useState(false)
  const [managingMember, setManagingMember] = useState<string | null>(null)
  const [roleChangeDialog, setRoleChangeDialog] = useState<{open: boolean, member: any, currentRole: string} | null>(null)
  const [profileDialog, setProfileDialog] = useState<{open: boolean, member: any, role: string} | null>(null)
  const [removeDialog, setRemoveDialog] = useState<{open: boolean, member: any, role: string} | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [assignments, setAssignments] = useState<any[]>([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)

  // Load theme from localStorage on mount
  useEffect(() => {
    const classCode = params.classcode as string
    if (classCode) {
      const savedTheme = localStorage.getItem(`class-theme-${classCode}`)
      if (savedTheme) {
        setSelectedTheme(savedTheme)
      }
    }
  }, [params.classcode])

  useEffect(() => {
    const fetchClass = async () => {
      try {
        const response = await fetch(`/api/classes/get?classCode=${params.classcode}`)
        const data = await response.json()
        
        console.log('Fetched class response:', response)
        console.log('Fetched class data:', data)
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch class')
        }
        
        setClassData(data.data)
        // Set the theme if available from class_settings, otherwise use localStorage
        if (data.data?.class_settings?.theme) {
          const theme = data.data.class_settings.theme
          setSelectedTheme(theme)
          // Save to localStorage
          localStorage.setItem(`class-theme-${params.classcode}`, theme)
        }
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
  
  const fetchAssignments = async () => {
    if (!classData?.class_id) {
      console.log('⚠️  Cannot fetch assignments: classData.class_id is not available')
      return
    }
    
    console.log('📥 Fetching assignments for class:', classData.class_id)
    setLoadingAssignments(true)
    try {
      const response = await fetch(`/api/classes/assignments/get?classId=${classData.class_id}`)
      const data = await response.json()
      
      console.log('📦 Assignments response:', data)
      
      if (data.success) {
        setAssignments(data.data || [])
        console.log('✅ Loaded assignments:', data.data?.length || 0)
      } else {
        console.error('❌ Failed to fetch assignments:', data.error)
      }
    } catch (err) {
      console.error('❌ Error fetching assignments:', err)
    } finally {
      setLoadingAssignments(false)
    }
  }
  
  // Fetch assignments when class data is loaded
  useEffect(() => {
    if (classData?.class_id) {
      fetchAssignments()
    }
  }, [classData?.class_id])

  // Load and apply theme
  useEffect(() => {
    const applyTheme = () => {
      // Remove any existing theme
      const existingThemes = document.querySelectorAll('link[data-class-theme]')
      existingThemes.forEach(theme => theme.remove())

      // Apply new theme if not default
      if (selectedTheme && selectedTheme !== 'default') {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = `/themes/${selectedTheme}.css`
        link.setAttribute('data-class-theme', 'true')
        document.head.appendChild(link)
      }
    }

    applyTheme()

    // Cleanup on unmount
    return () => {
      const existingThemes = document.querySelectorAll('link[data-class-theme]')
      existingThemes.forEach(theme => theme.remove())
    }
  }, [selectedTheme])

  const handleSaveTheme = async () => {
    setSavingTheme(true)
    try {
      console.log('Saving theme:', { 
        class_id: classData.class_id, 
        theme: selectedTheme 
      })

      const response = await fetch(`/api/classes/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classData.class_id,
          theme: selectedTheme
        })
      })

      console.log('Response status:', response.status, response.statusText)

      let data
      try {
        data = await response.json()
        console.log('Response data:', data)
      } catch (parseError) {
        console.error('Failed to parse response:', parseError)
        throw new Error('Invalid response from server')
      }

      if (!response.ok) {
        console.error('Theme update failed:', { 
          status: response.status, 
          statusText: response.statusText,
          data 
        })
        const errorMessage = data.details 
          ? `${data.error}: ${data.details}` 
          : data.error || 'Failed to update theme'
        throw new Error(errorMessage)
      }

      // Update class_settings with the new theme
      const updatedClassData = {
        ...classData,
        class_settings: {
          ...(classData.class_settings || {}),
          theme: selectedTheme
        }
      }
      setClassData(updatedClassData)
      
      // Save to localStorage
      localStorage.setItem(`class-theme-${params.classcode}`, selectedTheme)
      
      setThemeDialogOpen(false)
      toast.success('Theme updated successfully!')
    } catch (err) {
      console.error('Error saving theme:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to save theme')
    } finally {
      setSavingTheme(false)
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    setManagingMember(memberId)
    try {
      const response = await fetch('/api/classes/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classData.class_id,
          member_id: memberId,
          action: 'remove'
        })
      })

      const data = await response.json()

      console.log('Remove member response:', response)
      console.log('Remove member data:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove member')
      }

      // Update local state
      setClassData((prev: any) => ({
        ...prev,
        admin_ids: data.data.admin_ids,
        teacher_ids: data.data.teacher_ids,
        student_ids: data.data.student_ids,
        admins: prev.admins?.filter((m: any) => m.user_id !== memberId) || [],
        teachers: prev.teachers?.filter((m: any) => m.user_id !== memberId) || [],
        students: prev.students?.filter((m: any) => m.user_id !== memberId) || []
      }))

      toast.success(`${memberName} removed from class`)
    } catch (err) {
      console.error('Error removing member:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to remove member')
    } finally {
      setManagingMember(null)
    }
  }

  const handleChangeRole = async (memberId: string, newRole: string, memberName: string) => {
    setManagingMember(memberId)
    try {
      const response = await fetch('/api/classes/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classData.class_id,
          member_id: memberId,
          action: 'change_role',
          new_role: newRole
        })
      })

      const data = await response.json()

      console.log('Change role response:', response)
      console.log('Change role data:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change role')
      }

      // Refresh the class data to get updated member lists
      const refreshResponse = await fetch(`/api/classes/get?classCode=${params.classcode}`)
      const refreshData = await refreshResponse.json()
      
      console.log('Refresh class response:', refreshResponse)
      console.log('Refresh class data:', refreshData)
      
      if (refreshResponse.ok) {
        setClassData(refreshData.data)
      }

      setRoleChangeDialog(null)
      toast.success(`${memberName}'s role changed to ${newRole}`)
    } catch (err) {
      console.error('Error changing role:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to change role')
    } finally {
      setManagingMember(null)
    }
  }

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
            <Button onClick={() => router.push('/class')}>
              Go Back to Classes
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!classData) {
    return null
  }

  const getRoleBadgeVariant = (role: string): "default" | "destructive" | "secondary" => {
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
          {(classData.role === 'admin' || classData.role === 'teacher') && (
            <>
              <Dialog open={themeDialogOpen} onOpenChange={setThemeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Palette className="h-4 w-4 mr-2" />
                    Theme
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Class Theme</DialogTitle>
                    <DialogDescription>
                      Choose a theme for this class. The theme will be applied to all members viewing this class.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Theme</label>
                      <Select 
                        value={selectedTheme} 
                        onValueChange={(value) => {
                          setSelectedTheme(value)
                          // Save to localStorage for immediate preview
                          localStorage.setItem(`class-theme-${params.classcode}`, value)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a theme" />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_THEMES.map((theme) => (
                            <SelectItem key={theme.value} value={theme.value}>
                              <div className="flex flex-col">
                                <span className="font-medium">{theme.label}</span>
                                <span className="text-xs text-muted-foreground">{theme.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {selectedTheme !== 'default' && (
                      <div className="p-4 border rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">
                          Preview: The {AVAILABLE_THEMES.find(t => t.value === selectedTheme)?.label} theme is currently applied to this page.
                        </p>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const originalTheme = classData.class_settings?.theme || 'default'
                        setSelectedTheme(originalTheme)
                        // Restore localStorage to original value
                        localStorage.setItem(`class-theme-${params.classcode}`, originalTheme)
                        setThemeDialogOpen(false)
                      }}
                      disabled={savingTheme}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveTheme} disabled={savingTheme}>
                      {savingTheme ? 'Saving...' : 'Save Theme'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
          {classData.role === 'admin' && (
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
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

      <ClassStatsCards
        periodStart={classData.period_start}
        periodEnd={classData.period_end}
        memberCount={memberCount}
        adminCount={classData.admin_ids?.length || 0}
        teacherCount={classData.teacher_ids?.length || 0}
        studentCount={classData.student_ids?.length || 0}
        assignmentCount={classData.assignments?.length || 0}
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="h-4 w-4" />
            Members ({memberCount})
          </TabsTrigger>
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
              {loadingAssignments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : assignments && assignments.length > 0 ? (
                <div className="space-y-4">
                  {assignments.map((assignment: any) => (
                    <div 
                      key={assignment.assignment} 
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/exam/${assignment.exam_id}/public`)}
                    >
                      <div className="flex-1 space-y-2">
                        <div>
                          <p className="font-medium text-lg">{assignment.name}</p>
                          {assignment.exam && (
                            <p className="text-sm text-muted-foreground">{assignment.exam.exam_name}</p>
                          )}
                        </div>
                        {assignment.description && (
                          <p className="text-sm text-muted-foreground">{assignment.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {assignment.exam && (
                            <>
                              {assignment.exam.duration_minutes && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {assignment.exam.duration_minutes} min
                                </span>
                              )}
                              {assignment.exam.total_points && (
                                <span>
                                  {assignment.exam.total_points} points
                                </span>
                              )}
                            </>
                          )}
                          {assignment.due_at && (
                            <span>
                              Due: {new Date(assignment.due_at).toLocaleDateString()}
                            </span>
                          )}
                          {assignment.publish_at && (
                            <span>
                              Published: {new Date(assignment.publish_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/exam/${assignment.exam_id}/public`)
                          }}
                        >
                          Take Exam
                        </Button>
                        {(classData.role === 'admin' || classData.role === 'teacher') && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/exam/${assignment.exam_id}/edit`)
                            }}
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No assignments yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4 flex items-start gap-3">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm text-blue-900 dark:text-blue-100">
                Public Member List
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                All class members can view this list. Everyone in the class can see each other&apos;s names, emails, and profile pictures.
              </p>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Class Members</CardTitle>
              <CardDescription>
                All {memberCount} members in this class
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MembersList
                admins={classData.admins}
                teachers={classData.teachers}
                students={classData.students}
                isAdmin={classData.role === 'admin'}
                managingMember={managingMember}
                onViewProfile={(member, role) => setProfileDialog({ open: true, member, role })}
                onChangeRole={(member, role) => setRoleChangeDialog({ open: true, member, currentRole: role })}
                onRemove={(member, role) => setRemoveDialog({ open: true, member, role })}
              />
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

      {/* Dialogs */}
      {profileDialog && (
        <ProfileDialog
          open={profileDialog.open}
          member={profileDialog.member}
          role={profileDialog.role}
          onClose={() => setProfileDialog(null)}
        />
      )}

      {roleChangeDialog && (
        <RoleChangeDialog
          open={roleChangeDialog.open}
          member={roleChangeDialog.member}
          currentRole={roleChangeDialog.currentRole}
          isManaging={managingMember !== null}
          onChangeRole={handleChangeRole}
          onClose={() => setRoleChangeDialog(null)}
        />
      )}

      {removeDialog && (
        <RemoveMemberDialog
          open={removeDialog.open}
          member={removeDialog.member}
          isManaging={managingMember === removeDialog.member.user_id}
          onRemove={(memberId, memberName) => {
            handleRemoveMember(memberId, memberName)
                  setRemoveDialog(null)
                }}
          onClose={() => setRemoveDialog(null)}
        />
      )}

      {/* Settings Dialog */}
      <ClassSettingsDialog
        open={settingsOpen}
        classData={classData}
        onClose={() => setSettingsOpen(false)}
        onUpdate={(updatedData) => {
          setClassData(updatedData)
          setSettingsOpen(false)
        }}
      />
    </div>
  )
}