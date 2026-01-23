"use client";

import { useState, useEffect, use, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Settings,
  Loader2,
  ArrowLeft,
  Save,
  Trash2,
  RefreshCw,
  Palette,
  Users,
  Link2,
  Archive,
  Copy,
  Check,
  QrCode,
  Download,
  GraduationCap,
  UserPlus,
  ExternalLink
} from "lucide-react";
import { useTransitionRouter } from "next-view-transitions";

interface SettingsPageProps {
  params: Promise<{ classId: string }>;
}

const BANNER_COLORS = [
  "#4285f4", // Blue
  "#34a853", // Green
  "#fbbc05", // Yellow
  "#ea4335", // Red
  "#9c27b0", // Purple
  "#00bcd4", // Cyan
  "#ff9800", // Orange
  "#795548", // Brown
  "#607d8b", // Blue Grey
  "#e91e63", // Pink
];

export default function ClassSettingsPage({ params }: SettingsPageProps) {
  const { classId } = use(params);
  const { user, isLoaded } = useUser();
  const router = useTransitionRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [formData, setFormData] = useState({
    class_name: "",
    class_description: "",
    banner_color: "#4285f4",
    allow_join_by_code: true,
    auto_accept_students: true,
  });

  const [classCode, setClassCode] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [googleDialogOpen, setGoogleDialogOpen] = useState(false);
  const [googleCourses, setGoogleCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [importingStudents, setImportingStudents] = useState<string | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isLoaded && classId) {
      fetchClassData();
    }
  }, [isLoaded, classId]);

  const fetchClassData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/classes/${classId}`);
      const data = await response.json();

      if (data.success) {
        const cls = data.data;
        setFormData({
          class_name: cls.class_name || "",
          class_description: cls.class_description || "",
          banner_color: cls.banner_color || "#4285f4",
          allow_join_by_code: cls.allow_join_by_code ?? true,
          auto_accept_students: cls.auto_accept_students ?? true,
        });
        setClassCode(cls.class_code || "");
        setIsOwner(cls.is_owner || false);

        if (!cls.is_teacher && !cls.is_owner) {
          toast.error("You don't have permission to access settings");
          router.push(`/classes/${classId}`);
        }
      } else {
        toast.error(data.error || "Failed to load class");
        router.push('/classes');
      }
    } catch (error) {
      console.error("Failed to fetch class:", error);
      toast.error("Failed to load class");
      router.push('/classes');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.class_name.trim()) {
      toast.error("Class name is required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Settings saved!");
      } else {
        toast.error(data.error || "Failed to save settings");
      }
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateCode = async () => {
    setRegenerating(true);
    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate_code: true })
      });

      const data = await response.json();
      if (data.success) {
        setClassCode(data.data.class_code);
        toast.success("Class code regenerated!");
      } else {
        toast.error(data.error || "Failed to regenerate code");
      }
    } catch (error) {
      toast.error("Failed to regenerate code");
    } finally {
      setRegenerating(false);
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' })
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Class archived!");
        router.push('/classes');
      } else {
        toast.error(data.error || "Failed to archive class");
      }
    } catch (error) {
      toast.error("Failed to archive class");
    } finally {
      setArchiving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Class deleted!");
        router.push('/classes');
      } else {
        toast.error(data.error || "Failed to delete class");
      }
    } catch (error) {
      toast.error("Failed to delete class");
    } finally {
      setDeleting(false);
    }
  };

  const getJoinLink = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/classes/join?code=${classCode}`;
    }
    return '';
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getJoinLink());
    setCopiedLink(true);
    toast.success("Join link copied!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const generateQRCode = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const link = getJoinLink();
    const size = 256;
    canvas.width = size;
    canvas.height = size;

    // Use a simple QR code library approach - for now, create a placeholder
    // In production, you'd use a library like qrcode
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Draw QR code using the QR Code API
    const qrImage = new Image();
    qrImage.crossOrigin = 'anonymous';
    qrImage.onload = () => {
      ctx.drawImage(qrImage, 0, 0, size, size);
    };
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(link)}`;
  };

  const downloadQRCode = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `class-${classCode}-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success("QR code downloaded!");
  };

  const fetchGoogleCourses = async () => {
    setLoadingCourses(true);
    try {
      const response = await fetch('/api/auth/google-token');
      const tokenData = await response.json();

      if (!tokenData.access_token) {
        toast.error("Please connect your Google account first");
        return;
      }

      // Fetch courses from Google Classroom API
      const coursesResponse = await fetch(
        'https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE&teacherId=me',
        {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`
          }
        }
      );

      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json();
        setGoogleCourses(coursesData.courses || []);
      } else {
        toast.error("Failed to fetch Google Classroom courses");
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to connect to Google Classroom");
    } finally {
      setLoadingCourses(false);
    }
  };

  const importStudentsFromCourse = async (courseId: string, courseName: string) => {
    setImportingStudents(courseId);
    try {
      const response = await fetch('/api/auth/google-token');
      const tokenData = await response.json();

      if (!tokenData.access_token) {
        toast.error("Please connect your Google account first");
        return;
      }

      // Fetch students from Google Classroom
      const studentsResponse = await fetch(
        `https://classroom.googleapis.com/v1/courses/${courseId}/students`,
        {
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`
          }
        }
      );

      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        const students = studentsData.students || [];

        if (students.length === 0) {
          toast.info("No students found in this course");
          return;
        }

        // Extract emails
        const emails = students
          .map((s: any) => s.profile?.emailAddress)
          .filter((e: string) => e);

        // Add students to class
        const addResponse = await fetch(`/api/classes/${classId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emails, role: 'student' })
        });

        const addData = await addResponse.json();
        if (addData.success) {
          toast.success(`Imported ${addData.data.added?.length || 0} students from ${courseName}`);
          setGoogleDialogOpen(false);
        } else {
          toast.error(addData.error || "Failed to import students");
        }
      } else {
        toast.error("Failed to fetch students from Google Classroom");
      }
    } catch (error) {
      console.error("Error importing students:", error);
      toast.error("Failed to import students");
    } finally {
      setImportingStudents(null);
    }
  };

  // Generate QR code when dialog opens
  useEffect(() => {
    if (qrDialogOpen && classCode) {
      setTimeout(generateQRCode, 100);
    }
  }, [qrDialogOpen, classCode]);

  // Fetch Google courses when dialog opens
  useEffect(() => {
    if (googleDialogOpen) {
      fetchGoogleCourses();
    }
  }, [googleDialogOpen]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 max-w-3xl mx-auto space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/classes/${classId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Class Settings</h1>
        </div>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            General
          </CardTitle>
          <CardDescription>
            Basic class information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class_name">Class Name</Label>
            <Input
              id="class_name"
              value={formData.class_name}
              onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
              placeholder="Enter class name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="class_description">Description (Optional)</Label>
            <Textarea
              id="class_description"
              value={formData.class_description}
              onChange={(e) => setFormData({ ...formData, class_description: e.target.value })}
              placeholder="Enter class description"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how your class looks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Banner Color</Label>
            <div className="flex flex-wrap gap-2">
              {BANNER_COLORS.map((color) => (
                <button
                  key={color}
                  className={`h-10 w-10 rounded-full border-2 transition-all ${
                    formData.banner_color === color
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setFormData({ ...formData, banner_color: color })}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div
              className="h-24 rounded-lg flex items-end p-4"
              style={{ backgroundColor: formData.banner_color }}
            >
              <span className="text-white font-bold text-lg drop-shadow">
                {formData.class_name || "Class Name"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class Code & Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Students
          </CardTitle>
          <CardDescription>
            Multiple ways to invite students to your class
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Class Code */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Class Code</Label>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-muted rounded-lg p-4">
                <p className="text-3xl font-mono font-bold tracking-wider text-center">
                  {classCode}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRegenerateCode}
                disabled={regenerating}
                title="Regenerate code"
              >
                {regenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Students can enter this code at the join page
            </p>
          </div>

          <Separator />

          {/* Invite via Link */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Invite Link</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={getJoinLink()}
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                onClick={handleCopyLink}
              >
                {copiedLink ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {copiedLink ? "Copied!" : "Copy"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Share this link with students to let them join directly
            </p>
          </div>

          <Separator />

          {/* Invite via QR Code */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">QR Code</Label>
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground flex-1">
                Generate a QR code that students can scan to join
              </p>
              <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <QrCode className="h-4 w-4 mr-2" />
                    Show QR Code
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Class QR Code</DialogTitle>
                    <DialogDescription>
                      Students can scan this code to join the class
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="bg-white p-4 rounded-lg">
                      <canvas ref={qrCanvasRef} className="w-64 h-64" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Code: <span className="font-mono font-bold">{classCode}</span>
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
                      Close
                    </Button>
                    <Button onClick={downloadQRCode}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Separator />

          {/* Import from Google Classroom */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Google Classroom</Label>
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground flex-1">
                Import students from your Google Classroom courses
              </p>
              <Dialog open={googleDialogOpen} onOpenChange={setGoogleDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Import from Google
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Import from Google Classroom</DialogTitle>
                    <DialogDescription>
                      Select a course to import students from
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    {loadingCourses ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : googleCourses.length === 0 ? (
                      <div className="text-center py-8">
                        <GraduationCap className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-4">
                          No Google Classroom courses found
                        </p>
                        <Button
                          variant="outline"
                          onClick={fetchGoogleCourses}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                        </Button>
                      </div>
                    ) : (
                      <div className="max-h-[300px] overflow-y-auto space-y-2">
                        {googleCourses.map((course: any) => (
                          <div
                            key={course.id}
                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <GraduationCap className="h-5 w-5 text-blue-500" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">{course.name}</h4>
                                {course.section && (
                                  <p className="text-xs text-muted-foreground">
                                    {course.section}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => importStudentsFromCourse(course.id, course.name)}
                              disabled={importingStudents === course.id}
                            >
                              {importingStudents === course.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Import'
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setGoogleDialogOpen(false)}>
                      Close
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Separator />

          {/* Settings */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow join by code</Label>
              <p className="text-sm text-muted-foreground">
                Students can join using the class code or link
              </p>
            </div>
            <Switch
              checked={formData.allow_join_by_code}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, allow_join_by_code: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Member Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Members
          </CardTitle>
          <CardDescription>
            Control how students join your class
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-accept students</Label>
              <p className="text-sm text-muted-foreground">
                Automatically accept students when they join
              </p>
            </div>
            <Switch
              checked={formData.auto_accept_students}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, auto_accept_students: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>

      <Separator />

      {/* Danger Zone */}
      {isOwner && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Archive */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">Archive Class</p>
                <p className="text-sm text-muted-foreground">
                  Hide this class from the active list
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archive this class?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will hide the class from the active list. You can restore it later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleArchive} disabled={archiving}>
                      {archiving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Archive
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <Separator />

            {/* Delete */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium text-destructive">Delete Class</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this class and all its data
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this class?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. All class data including announcements,
                      member lists, and exam assignments will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Delete Permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
