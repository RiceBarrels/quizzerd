"use client";

import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import {
  GraduationCap,
  PlusIcon,
  Users,
  BookOpen,
  Loader2,
  Copy,
  Check,
  LogIn,
  Sparkles,
  MoreVertical,
  Archive,
  Settings,
  Trash2,
  FileText,
  ChevronRight
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTransitionRouter } from "next-view-transitions";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut" as const
    }
  }
};

// Color presets for class banners
const colorPresets = [
  "#4285f4", // Blue
  "#ea4335", // Red
  "#34a853", // Green
  "#fbbc05", // Yellow
  "#9c27b0", // Purple
  "#00bcd4", // Cyan
  "#ff5722", // Orange
  "#607d8b", // Gray
];

export default function ClassesPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinPreview, setJoinPreview] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const router = useTransitionRouter();

  const [newClass, setNewClass] = useState({
    class_name: "",
    class_description: "",
    banner_color: "#4285f4"
  });

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchClasses();
    }
  }, [isLoaded, isSignedIn, activeTab]);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const filter = activeTab === "all" ? "all" : activeTab === "teaching" ? "teaching" : "enrolled";
      const response = await fetch(`/api/classes?filter=${filter}`);
      const data = await response.json();

      if (data.success) {
        // Handle different response formats based on filter
        if (filter === 'all' && data.data?.all) {
          // For 'all' filter, the response has { teaching, enrolled, all }
          setClasses(data.data.all || []);
        } else if (Array.isArray(data.data)) {
          // For 'teaching' or 'enrolled' filters, response is an array
          setClasses(data.data);
        } else {
          setClasses([]);
        }
      } else {
        toast.error(data.error || "Failed to load classes");
      }
    } catch (error) {
      console.error("Failed to fetch classes:", error);
      toast.error("Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async () => {
    if (!newClass.class_name.trim()) {
      toast.error("Please enter a class name");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClass)
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Class created successfully!");
        setCreateDialogOpen(false);
        setNewClass({ class_name: "", class_description: "", banner_color: "#4285f4" });
        router.push(`/classes/${data.data.class_id}`);
      } else {
        toast.error(data.error || "Failed to create class");
      }
    } catch (error) {
      console.error("Error creating class:", error);
      toast.error("Failed to create class");
    } finally {
      setIsCreating(false);
    }
  };

  const handlePreviewClass = async () => {
    if (!joinCode.trim()) {
      return;
    }

    try {
      const response = await fetch(`/api/classes/join?code=${joinCode.trim()}`);
      const data = await response.json();

      if (data.success) {
        setJoinPreview(data.data);
      } else {
        setJoinPreview(null);
        toast.error(data.error || "Class not found");
      }
    } catch (error) {
      console.error("Error previewing class:", error);
      setJoinPreview(null);
    }
  };

  const handleJoinClass = async () => {
    if (!joinCode.trim()) {
      toast.error("Please enter a class code");
      return;
    }

    setIsJoining(true);
    try {
      const response = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_code: joinCode.trim() })
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setJoinDialogOpen(false);
        setJoinCode("");
        setJoinPreview(null);
        if (data.data.status === 'active') {
          router.push(`/classes/${data.data.class_id}`);
        } else {
          fetchClasses();
        }
      } else {
        toast.error(data.error || "Failed to join class");
      }
    } catch (error) {
      console.error("Error joining class:", error);
      toast.error("Failed to join class");
    } finally {
      setIsJoining(false);
    }
  };

  const copyClassCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Class code copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleArchiveClass = async (classId: string) => {
    try {
      const response = await fetch(`/api/classes/${classId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' })
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Class archived");
        fetchClasses();
      } else {
        toast.error(data.error || "Failed to archive class");
      }
    } catch (error) {
      toast.error("Failed to archive class");
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="p-4">
        <Card className="p-8 text-center">
          <GraduationCap className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-semibold mb-2">Sign in to view classes</h2>
          <p className="text-muted-foreground mb-4">
            Create or join classes to organize your exams and students.
          </p>
          <Button onClick={() => router.push('/sign-in')}>Sign In</Button>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      className="p-4 space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-4">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <GraduationCap className="h-6 w-6 text-primary" />
            </motion.div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Classes
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                <Sparkles className="h-5 w-5 text-primary/50" />
              </motion.span>
            </h1>
          </div>

          <div className="flex gap-2">
            {/* Join Class Dialog */}
            <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <LogIn className="h-4 w-4 mr-2" />
                  Join Class
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Join a Class</DialogTitle>
                  <DialogDescription>
                    Enter the class code provided by your teacher
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="class-code">Class Code</Label>
                    <Input
                      id="class-code"
                      placeholder="e.g., abc123"
                      value={joinCode}
                      onChange={(e) => {
                        setJoinCode(e.target.value);
                        setJoinPreview(null);
                      }}
                      onBlur={handlePreviewClass}
                      className="text-center text-lg font-mono tracking-wider"
                      maxLength={8}
                    />
                  </div>

                  {/* Preview */}
                  <AnimatePresence mode="wait">
                    {joinPreview && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="rounded-lg border overflow-hidden"
                      >
                        <div
                          className="h-16 flex items-end p-3"
                          style={{ backgroundColor: joinPreview.banner_color }}
                        >
                          <h3 className="text-white font-semibold text-lg drop-shadow">
                            {joinPreview.class_name}
                          </h3>
                        </div>
                        <div className="p-3 space-y-2">
                          {joinPreview.class_description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {joinPreview.class_description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>{joinPreview.member_count} members</span>
                          </div>
                          {joinPreview.is_member && (
                            <Badge variant="secondary">
                              Already a member
                            </Badge>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setJoinDialogOpen(false);
                    setJoinCode("");
                    setJoinPreview(null);
                  }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleJoinClass}
                    disabled={isJoining || !joinCode.trim() || joinPreview?.is_member}
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      "Join Class"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Create Class Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Class
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create a New Class</DialogTitle>
                  <DialogDescription>
                    Set up a class to organize your students and exams
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Banner Preview */}
                  <div
                    className="h-24 rounded-lg flex items-end p-4 transition-colors"
                    style={{ backgroundColor: newClass.banner_color }}
                  >
                    <p className="text-white font-semibold text-lg drop-shadow">
                      {newClass.class_name || "Class Name"}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="class-name">Class Name</Label>
                    <Input
                      id="class-name"
                      placeholder="e.g., Math 101 - Fall 2024"
                      value={newClass.class_name}
                      onChange={(e) => setNewClass({...newClass, class_name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="class-desc">Description (Optional)</Label>
                    <Textarea
                      id="class-desc"
                      placeholder="Add a description for your class"
                      value={newClass.class_description}
                      onChange={(e) => setNewClass({...newClass, class_description: e.target.value})}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Banner Color</Label>
                    <div className="flex gap-2 flex-wrap">
                      {colorPresets.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                            newClass.banner_color === color
                              ? "ring-2 ring-offset-2 ring-primary"
                              : ""
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewClass({...newClass, banner_color: color})}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateClass} disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Class"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all">All Classes</TabsTrigger>
            <TabsTrigger value="teaching">Teaching</TabsTrigger>
            <TabsTrigger value="enrolled">Enrolled</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : classes.length === 0 ? (
              <motion.div
                className="flex flex-col items-center justify-center h-64 text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <GraduationCap className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium">No classes yet</p>
                <p className="text-sm">
                  {activeTab === "teaching"
                    ? "Create a class to get started"
                    : activeTab === "enrolled"
                    ? "Join a class with a class code"
                    : "Create or join a class to get started"}
                </p>
              </motion.div>
            ) : (
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                key={activeTab}
              >
                <AnimatePresence mode="popLayout">
                  {classes.map((cls) => (
                    <motion.div
                      key={cls.class_id}
                      variants={cardVariants}
                      layout
                      whileHover={{ y: -4 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <Card
                        className="overflow-hidden cursor-pointer group relative"
                        onClick={() => router.push(`/classes/${cls.class_id}`)}
                      >
                        {/* Banner */}
                        <div
                          className="h-24 relative"
                          style={{ backgroundColor: cls.banner_color }}
                        >
                          {/* Class code for teachers */}
                          {(cls.user_role === 'owner' || cls.user_role === 'teacher') && (
                            <div className="absolute top-2 right-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-7 text-xs bg-white/90 hover:bg-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyClassCode(cls.class_code);
                                }}
                              >
                                {copiedCode === cls.class_code ? (
                                  <Check className="h-3 w-3 mr-1" />
                                ) : (
                                  <Copy className="h-3 w-3 mr-1" />
                                )}
                                {cls.class_code}
                              </Button>
                            </div>
                          )}

                          {/* Class name */}
                          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                            <h3 className="text-white font-semibold text-lg line-clamp-1 drop-shadow">
                              {cls.class_name}
                            </h3>
                          </div>

                          {/* Menu */}
                          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 w-7 p-0 bg-white/90 hover:bg-white"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start">
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/classes/${cls.class_id}`);
                                }}>
                                  <BookOpen className="h-4 w-4 mr-2" />
                                  Open Class
                                </DropdownMenuItem>
                                {(cls.user_role === 'owner' || cls.user_role === 'teacher') && (
                                  <>
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/classes/${cls.class_id}/settings`);
                                    }}>
                                      <Settings className="h-4 w-4 mr-2" />
                                      Settings
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleArchiveClass(cls.class_id);
                                      }}
                                    >
                                      <Archive className="h-4 w-4 mr-2" />
                                      Archive
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Content */}
                        <CardContent className="p-4 space-y-3">
                          {cls.class_description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {cls.class_description}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>{cls.member_count || 0}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <FileText className="h-4 w-4" />
                                <span>{cls.exam_count || 0} exams</span>
                              </div>
                            </div>

                            <Badge variant={
                              cls.user_role === 'owner' ? 'default' :
                              cls.user_role === 'teacher' ? 'secondary' :
                              'outline'
                            }>
                              {cls.user_role === 'owner' ? 'Owner' :
                               cls.user_role === 'teacher' ? 'Teacher' :
                               cls.user_role === 'co-teacher' ? 'Co-Teacher' :
                               'Student'}
                            </Badge>
                          </div>

                          {/* Quick action */}
                          <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="sm" variant="ghost" className="text-primary">
                              Open
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
}
