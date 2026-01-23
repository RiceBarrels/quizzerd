"use client";

import { useState, useEffect, use } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  GraduationCap,
  Users,
  BookOpen,
  Loader2,
  Copy,
  Check,
  Settings,
  MoreVertical,
  Plus,
  Megaphone,
  Pin,
  FileText,
  Calendar,
  Clock,
  ChevronRight,
  UserPlus,
  Mail,
  Trash2,
  Edit,
  ExternalLink,
  ArrowLeft,
  BarChart3
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTransitionRouter } from "next-view-transitions";

interface ClassPageProps {
  params: Promise<{ classId: string }>;
}

export default function ClassDetailPage({ params }: ClassPageProps) {
  const { classId } = use(params);
  const { user, isLoaded } = useUser();
  const [classData, setClassData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("stream");
  const [copiedCode, setCopiedCode] = useState(false);
  const [announcementDialogOpen, setAnnouncementDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "" });
  const [inviteEmails, setInviteEmails] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const router = useTransitionRouter();

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
        setClassData(data.data);
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

  const copyClassCode = () => {
    if (classData?.class_code) {
      navigator.clipboard.writeText(classData.class_code);
      setCopiedCode(true);
      toast.success("Class code copied!");
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handlePostAnnouncement = async () => {
    if (!newAnnouncement.content.trim()) {
      toast.error("Please enter announcement content");
      return;
    }

    setIsPosting(true);
    try {
      const response = await fetch(`/api/classes/${classId}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAnnouncement)
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Announcement posted!");
        setAnnouncementDialogOpen(false);
        setNewAnnouncement({ title: "", content: "" });
        fetchClassData();
      } else {
        toast.error(data.error || "Failed to post announcement");
      }
    } catch (error) {
      toast.error("Failed to post announcement");
    } finally {
      setIsPosting(false);
    }
  };

  const handleInviteMembers = async () => {
    const emails = inviteEmails.split(/[,\n]/).map(e => e.trim()).filter(e => e);
    if (emails.length === 0) {
      toast.error("Please enter at least one email");
      return;
    }

    setIsInviting(true);
    try {
      const response = await fetch(`/api/classes/${classId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails, role: 'student' })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        setInviteDialogOpen(false);
        setInviteEmails("");
        fetchClassData();
      } else {
        toast.error(data.error || "Failed to invite members");
      }
    } catch (error) {
      toast.error("Failed to invite members");
    } finally {
      setIsInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!classData) {
    return null;
  }

  const isTeacher = classData.is_teacher || classData.is_owner;
  const teachers = classData.class_members?.filter((m: any) =>
    ['teacher', 'co-teacher'].includes(m.role) && m.status === 'active'
  ) || [];
  const students = classData.class_members?.filter((m: any) =>
    m.role === 'student' && m.status === 'active'
  ) || [];
  const announcements = classData.class_announcements || [];
  const exams = classData.class_exams || [];

  return (
    <motion.div
      className="min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Banner */}
      <div
        className="h-48 relative"
        style={{ backgroundColor: classData.banner_color }}
      >
        {/* Back button */}
        <Button
          variant="secondary"
          size="sm"
          className="absolute top-4 left-4 bg-white/90 hover:bg-white"
          onClick={() => router.push('/classes')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        {/* Settings button for teachers */}
        {isTeacher && (
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 bg-white/90 hover:bg-white"
            onClick={() => router.push(`/classes/${classId}/settings`)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}

        {/* Class info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
          <h1 className="text-white text-3xl font-bold drop-shadow-lg">
            {classData.class_name}
          </h1>
          {classData.class_description && (
            <p className="text-white/80 mt-1 drop-shadow">
              {classData.class_description}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Class code card for teachers */}
        {isTeacher && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Class Code</p>
                  <p className="text-2xl font-mono font-bold tracking-wider">
                    {classData.class_code}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyClassCode}
                >
                  {copiedCode ? (
                    <Check className="h-4 w-4 mr-1" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  {copiedCode ? "Copied!" : "Copy"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-lg grid-cols-4">
            <TabsTrigger value="stream">
              <Megaphone className="h-4 w-4 mr-2 hidden sm:inline" />
              Stream
            </TabsTrigger>
            <TabsTrigger value="classwork">
              <BookOpen className="h-4 w-4 mr-2 hidden sm:inline" />
              Classwork
            </TabsTrigger>
            <TabsTrigger value="people">
              <Users className="h-4 w-4 mr-2 hidden sm:inline" />
              People
            </TabsTrigger>
            {isTeacher && (
              <TabsTrigger value="grades">
                <BarChart3 className="h-4 w-4 mr-2 hidden sm:inline" />
                Grades
              </TabsTrigger>
            )}
          </TabsList>

          {/* Stream Tab */}
          <TabsContent value="stream" className="mt-6 space-y-6">
            {/* Post announcement button for teachers */}
            {isTeacher && (
              <Dialog open={announcementDialogOpen} onOpenChange={setAnnouncementDialogOpen}>
                <DialogTrigger asChild>
                  <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user?.imageUrl} />
                        <AvatarFallback>{user?.firstName?.[0]}</AvatarFallback>
                      </Avatar>
                      <p className="text-muted-foreground">
                        Announce something to your class...
                      </p>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Post Announcement</DialogTitle>
                    <DialogDescription>
                      Share something with your class
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title (Optional)</Label>
                      <Input
                        id="title"
                        placeholder="Announcement title"
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        placeholder="What do you want to announce?"
                        value={newAnnouncement.content}
                        onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                        rows={4}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAnnouncementDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handlePostAnnouncement} disabled={isPosting}>
                      {isPosting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Post
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Announcements list */}
            <AnimatePresence>
              {announcements.length === 0 ? (
                <Card className="p-8 text-center">
                  <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No announcements yet</p>
                </Card>
              ) : (
                announcements.map((announcement: any, index: number) => (
                  <motion.div
                    key={announcement.announcement_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                <GraduationCap className="h-5 w-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold">Teacher</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(announcement.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {announcement.pinned && (
                            <Badge variant="secondary">
                              <Pin className="h-3 w-3 mr-1" />
                              Pinned
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {announcement.title && (
                          <h3 className="font-semibold mb-2">{announcement.title}</h3>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{announcement.content}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </TabsContent>

          {/* Classwork Tab */}
          <TabsContent value="classwork" className="mt-6 space-y-6">
            {isTeacher && (
              <div className="flex justify-end">
                <Button onClick={() => router.push(`/classes/${classId}/add-exam`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Exam
                </Button>
              </div>
            )}

            {exams.length === 0 ? (
              <Card className="p-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No exams assigned yet</p>
                {isTeacher && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push(`/classes/${classId}/add-exam`)}
                  >
                    Add your first exam
                  </Button>
                )}
              </Card>
            ) : (
              <div className="space-y-3">
                {exams.map((exam: any, index: number) => (
                  <motion.div
                    key={exam.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => router.push(`/exam/${exam.exam_id}`)}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">
                            {exam.exams?.exam_name || "Untitled Exam"}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {exam.exams?.duration_minutes && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {exam.exams.duration_minutes} min
                              </span>
                            )}
                            {exam.end_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Due {new Date(exam.end_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant={
                          exam.status === 'published' ? 'default' :
                          exam.status === 'closed' ? 'secondary' : 'outline'
                        }>
                          {exam.status}
                        </Badge>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* People Tab */}
          <TabsContent value="people" className="mt-6 space-y-6">
            {/* Invite button for teachers */}
            {isTeacher && (
              <div className="flex justify-end">
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Students
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invite Students</DialogTitle>
                      <DialogDescription>
                        Enter student email addresses (one per line or comma-separated)
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <Textarea
                        placeholder="student1@example.com&#10;student2@example.com"
                        value={inviteEmails}
                        onChange={(e) => setInviteEmails(e.target.value)}
                        rows={5}
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleInviteMembers} disabled={isInviting}>
                        {isInviting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Send Invites
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {/* Teachers section */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Teachers
              </h3>
              <div className="space-y-2">
                {/* Owner */}
                <Card>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {classData.owner_info?.img_url ? (
                        <AvatarImage src={classData.owner_info.img_url} />
                      ) : null}
                      <AvatarFallback>
                        {classData.owner_info?.full_name?.[0]?.toUpperCase() || <GraduationCap className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{classData.owner_info?.full_name || "Class Owner"}</p>
                      <p className="text-sm text-muted-foreground">{classData.owner_info?.email || classData.created_by}</p>
                    </div>
                    <Badge>Owner</Badge>
                  </CardContent>
                </Card>
                {teachers.map((teacher: any) => (
                  <Card key={teacher.member_id}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        {teacher.img_url ? (
                          <AvatarImage src={teacher.img_url} />
                        ) : null}
                        <AvatarFallback>
                          {teacher.full_name?.[0]?.toUpperCase() || teacher.email?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{teacher.full_name || teacher.display_name || "Teacher"}</p>
                        <p className="text-sm text-muted-foreground">{teacher.user_email || teacher.email}</p>
                      </div>
                      <Badge variant="secondary">{teacher.role}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* Students section */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Students ({students.length})
              </h3>
              {students.length === 0 ? (
                <Card className="p-6 text-center">
                  <p className="text-muted-foreground">No students yet</p>
                  {isTeacher && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Share the class code or invite students by email
                    </p>
                  )}
                </Card>
              ) : (
                <div className="grid gap-2">
                  {students.map((student: any) => (
                    <Card key={student.member_id}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          {student.img_url ? (
                            <AvatarImage src={student.img_url} />
                          ) : null}
                          <AvatarFallback>
                            {student.full_name?.[0]?.toUpperCase() || student.email?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium">{student.full_name || student.display_name || "Student"}</p>
                          <p className="text-sm text-muted-foreground">{student.user_email || student.email}</p>
                        </div>
                        {isTeacher && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Mail className="h-4 w-4 mr-2" />
                                Email Student
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Grades Tab (Teachers only) */}
          {isTeacher && (
            <TabsContent value="grades" className="mt-6">
              <Card className="p-8 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Gradebook</p>
                <p className="text-muted-foreground">
                  View and manage student grades for all exams
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push(`/classes/${classId}/grades`)}
                >
                  Open Gradebook
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </motion.div>
  );
}
