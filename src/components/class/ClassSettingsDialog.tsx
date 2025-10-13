'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Switch } from '@/components/ui/switch'
import { Info, Clock, AlertTriangle, Archive, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface ClassSettingsDialogProps {
  open: boolean
  classData: any
  onClose: () => void
  onUpdate: (updatedData: any) => void
}

export function ClassSettingsDialog({ open, classData, onClose, onUpdate }: ClassSettingsDialogProps) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  
  // General settings
  const [className, setClassName] = useState(classData.class_name || '')
  const [description, setDescription] = useState(classData.description || '')
  
  // Schedule settings
  const [periodStart, setPeriodStart] = useState(classData.period_start || '')
  const [periodEnd, setPeriodEnd] = useState(classData.period_end || '')
  
  // Archive setting
  const [isArchived, setIsArchived] = useState(classData.is_archived || false)

  const handleSaveGeneral = async () => {
    if (!className.trim()) {
      toast.error('Class name is required')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/classes/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classData.class_id,
          class_name: className.trim(),
          description: description.trim() || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update class information')
      }

      onUpdate({
        ...classData,
        class_name: className.trim(),
        description: description.trim() || null
      })

      toast.success('Class information updated successfully!')
    } catch (err) {
      console.error('Error updating class:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to update class information')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSchedule = async () => {
    if (!periodStart || !periodEnd) {
      toast.error('Both start and end times are required')
      return
    }

    // Validate that end time is after start time
    const [startHour, startMin] = periodStart.split(':').map(Number)
    const [endHour, endMin] = periodEnd.split(':').map(Number)
    
    if (startHour > endHour || (startHour === endHour && startMin >= endMin)) {
      toast.error('End time must be after start time')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/classes/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classData.class_id,
          period_start: periodStart,
          period_end: periodEnd
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update class schedule')
      }

      onUpdate({
        ...classData,
        period_start: periodStart,
        period_end: periodEnd
      })

      toast.success('Class schedule updated successfully!')
    } catch (err) {
      console.error('Error updating schedule:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to update class schedule')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleArchive = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/classes/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classData.class_id,
          is_archived: !isArchived
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update archive status')
      }

      const newArchiveStatus = !isArchived
      setIsArchived(newArchiveStatus)
      
      onUpdate({
        ...classData,
        is_archived: newArchiveStatus
      })

      toast.success(newArchiveStatus ? 'Class archived successfully!' : 'Class unarchived successfully!')
    } catch (err) {
      console.error('Error toggling archive:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to update archive status')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClass = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/classes/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classData.class_id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete class')
      }

      toast.success('Class deleted successfully!')
      onClose()
      // Redirect to home or class list
      window.location.href = '/class'
    } catch (err) {
      console.error('Error deleting class:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete class')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Class Settings</DialogTitle>
          <DialogDescription>
            Manage your class settings and configuration
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">
              <Info className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="schedule">
              <Clock className="h-4 w-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="className">Class Name *</Label>
              <Input
                id="className"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Enter class name"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter class description"
                rows={4}
                disabled={loading}
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <Info className="h-3 w-3 inline mr-1" />
                Changes to the class name and description will be visible to all members.
              </p>
            </div>

            <DialogFooter>
              <Button
                onClick={handleSaveGeneral}
                disabled={loading || !className.trim()}
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Schedule Settings */}
          <TabsContent value="schedule" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodStart">Start Time *</Label>
                <Input
                  id="periodStart"
                  type="time"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="periodEnd">End Time *</Label>
                <Input
                  id="periodEnd"
                  type="time"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <Clock className="h-3 w-3 inline mr-1" />
                Set the regular meeting time for this class. This helps students know when to attend.
              </p>
            </div>

            <DialogFooter>
              <Button
                onClick={handleSaveSchedule}
                disabled={loading || !periodStart || !periodEnd}
              >
                {loading ? 'Saving...' : 'Save Schedule'}
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Advanced Settings */}
          <TabsContent value="advanced" className="space-y-4 py-4">
            <div className="space-y-4">
              {/* Archive Section */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Archive className="h-4 w-4" />
                      <h4 className="font-medium">Archive Class</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {isArchived 
                        ? 'This class is currently archived. Unarchive it to make it active again.'
                        : 'Archive this class to hide it from the active class list. You can unarchive it later.'}
                    </p>
                  </div>
                  <Switch
                    checked={isArchived}
                    onCheckedChange={handleToggleArchive}
                    disabled={loading}
                  />
                </div>
              </div>

              <Separator />

              {/* Delete Section */}
              <div className="border border-destructive/50 rounded-lg p-4 space-y-3 bg-destructive/5">
                <div className="flex items-start gap-3">
                  <Trash2 className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <h4 className="font-medium text-destructive">Danger Zone</h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete this class and all associated data. This action cannot be undone.
                    </p>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Class
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the class <strong>{classData.class_name}</strong> and remove all associated data including:
                            <ul className="list-disc list-inside mt-2 space-y-1">
                              <li>All class members and their assignments</li>
                              <li>All exams and test results</li>
                              <li>All class settings and configurations</li>
                            </ul>
                            <br />
                            <strong>This action cannot be undone.</strong>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteClass}
                            disabled={loading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {loading ? 'Deleting...' : 'Yes, Delete Class'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="sm:justify-start">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

