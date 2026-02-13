"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import ExamContextMenu from "@/components/exam/ExamContextMenu";
import { toast } from "sonner";
import {
  FileTextIcon,
  PlusIcon,
  SearchIcon,
  Clock,
  Users,
  Lock,
  Globe,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Edit,
  CheckCircle,
  XCircle,
  FileUp,
  Link2,
  AlertCircle,
  Key,
  Copy,
  Trash2,
  Eye,
  Share2,
  Archive,
  Calendar,
  Target,
  Hash,
  TrendingUp,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  ListChecks,
  Award
} from "lucide-react";
import { useTransitionRouter } from "next-view-transitions";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
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
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

interface ExamPageClientProps {
  initialExams?: any[];
  initialPagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  } | null;
}

export default function ExamPageClient({ initialExams = [], initialPagination = null }: ExamPageClientProps) {
  const { isSignedIn, isLoaded } = useUser();
  const [exams, setExams] = useState<any[]>(initialExams);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(initialPagination);
  // Default to "public" until auth is loaded, then switch to "my-exams" if signed in
  const [activeTab, setActiveTab] = useState("public");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFormUrl, setImportFormUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [googleForms, setGoogleForms] = useState<any[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState("");
  const [loadingForms, setLoadingForms] = useState(false);
  const [importMode, setImportMode] = useState('url'); // 'url' or 'browse'
  const router = useTransitionRouter();
  const limit = 12;

  const [newExam, setNewExam] = useState<any>({
    exam_name: "",
    exam_description: "",
    subjects: [],
    is_public: false,
    duration_minutes: 60,
    attempts_allowed: 1,
    shuffle_questions: false,
    show_results_immediately: true,
    passing_score: 70
  });

  // Quick preview state
  const [previewExam, setPreviewExam] = useState<any>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  // Track if this is the initial load with SSR data
  const [hasInitialData, setHasInitialData] = useState(initialExams.length > 0);

  // Set default tab to "my-exams" when user signs in
  useEffect(() => {
    if (isLoaded && isSignedIn && activeTab === "public") {
      setActiveTab("my-exams");
      setHasInitialData(false); // Need to fetch my-exams
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    // Skip initial fetch if we have SSR data for public tab
    if (hasInitialData && activeTab === "public" && page === 1 && !search) {
      setHasInitialData(false); // Only skip once
      return;
    }

    // Always fetch - public exams don't require auth
    // For my-exams/shared, the API will handle auth check
    fetchExams();
  }, [page, search, activeTab, isLoaded]);

  const fetchExams = async () => {
    // Skip fetching non-public exams if not signed in
    if (activeTab !== "public" && !isSignedIn) {
      setExams([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        type: activeTab,
        ...(search && { search })
      });

      const response = await fetch(`/api/exams/get?${params}`);
      const data = await response.json();

      if (data.success) {
        setExams(data.data || []);
        setPagination(data.pagination);
      } else if (data.message && data.message.includes('table does not exist')) {
        toast.error("Database not configured. Please create the exams table.");
        console.error("Database setup required:", data.message);
      } else if (data.error === 'Unauthorized') {
        // Don't show error for expected auth issues - just clear exams
        setExams([]);
        setPagination(null);
      } else {
        // Only show error toast if user is signed in (not for public browse)
        if (isSignedIn) {
          toast.error(data.error || "Failed to load exams");
        }
        setExams([]);
        setPagination(null);
      }
    } catch (error) {
      console.error("Failed to fetch exams:", error);
      // Only show error toast if user is signed in
      if (isSignedIn) {
        toast.error("Failed to load exams");
      }
      setExams([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadForms = async () => {
    setLoadingForms(true);
    try {
      // Build URL with optional access token
      const url = new URL('/api/exams/google-forms-list', window.location.origin);
      if (googleAccessToken) {
        url.searchParams.append('access_token', googleAccessToken);
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.forms) {
        setGoogleForms(data.forms);
        if (data.forms.length > 0) {
          toast.success(`Found ${data.forms.length} Google Forms`);
        } else {
          toast.info(data.message || "No forms found. Provide a Google access token to see your forms.");
        }
      } else if (data.error) {
        toast.error(data.error || "Failed to fetch Google Forms");
        setGoogleForms([]);
      }
    } catch (error) {
      console.error("Error fetching Google Forms:", error);
      toast.error("Failed to fetch Google Forms");
      setGoogleForms([]);
    } finally {
      setLoadingForms(false);
    }
  };

  const handleSelectForm = async (formId: string) => {
    setSelectedFormId(formId);
    const form = googleForms.find((f: any) => f.id === formId);
    if (form) {
      setImportFormUrl(`https://docs.google.com/forms/d/${formId}/edit`);
    }
  };

  const handleImportFromGoogleForms = async () => {
    if (importMode === 'url' && !importFormUrl) {
      toast.error("Please enter a Google Forms URL");
      return;
    }

    if (importMode === 'browse' && !selectedFormId) {
      toast.error("Please select a form to import");
      return;
    }

    // Validate Google Forms URL if in URL mode
    if (importMode === 'url') {
      const googleFormsRegex = /^https:\/\/(docs\.google\.com\/forms|forms\.gle)/;
      if (!googleFormsRegex.test(importFormUrl)) {
        toast.error("Please enter a valid Google Forms URL");
        return;
      }
    }

    setIsImporting(true);
    try {
      const payload: any = {
        is_public: false
      };

      if (importMode === 'url') {
        payload.formUrl = importFormUrl;
      } else {
        payload.formId = selectedFormId;
        // Include access token if available
        if (googleAccessToken) {
          payload.accessToken = googleAccessToken;
        }
      }

      const response = await fetch('/api/exams/import-google-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Exam imported successfully!");
        setImportDialogOpen(false);
        setImportFormUrl("");
        setSelectedFormId(null);
        setGoogleForms([]);
        setGoogleAccessToken("");
        setImportMode('url');
        if (data.data?.exam_id) {
          router.push(`/exam/${data.data.exam_id}/edit`);
        } else {
          fetchExams();
        }
      } else {
        toast.error(data.error || "Failed to import from Google Forms");
      }
    } catch (error) {
      console.error("Error importing from Google Forms:", error);
      toast.error("Failed to import from Google Forms");
    } finally {
      setIsImporting(false);
    }
  };

  const handleCreateExam = async () => {
    if (!newExam.exam_name) {
      toast.error("Please enter an exam name");
      return;
    }

    try {
      const response = await fetch('/api/exams/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExam)
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Exam created successfully!");
        setCreateDialogOpen(false);
        setNewExam({
          exam_name: "",
          exam_description: "",
          subjects: [],
          is_public: false,
          duration_minutes: 60,
          attempts_allowed: 1,
          shuffle_questions: false,
          show_results_immediately: true,
          passing_score: 70
        });
        router.push(`/exam/${data.data.exam_id}/edit`);
      } else {
        toast.error(data.error || "Failed to create exam");
      }
    } catch (error) {
      console.error("Error creating exam:", error);
      toast.error("Failed to create exam");
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };


  const getStatusBadge = (status: string) => {
    const variants: any = {
      draft: { variant: "secondary", icon: Edit },
      published: { variant: "success", icon: CheckCircle },
      archived: { variant: "outline", icon: XCircle }
    };
    const config = variants[status] || variants.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const getVisibilityBadge = (isPublic: boolean) => {
    return isPublic ? (
      <Badge variant="outline" className="gap-1">
        <Globe className="h-3 w-3" />
        Public
      </Badge>
    ) : (
      <Badge variant="outline" className="gap-1">
        <Lock className="h-3 w-3" />
        Private
      </Badge>
    );
  };

  return (
    <motion.div
      className="p-4 space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="p-4">
        <motion.div
          className="flex items-center justify-between mb-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2">
            <motion.div
              whileHover={{ rotate: 15, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <FileTextIcon className="h-6 w-6 text-primary" />
            </motion.div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Exams
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
            <div className="relative max-w-md">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search exams..."
                value={search}
                onChange={handleSearch}
                className="pl-10"
              />
            </div>

            {isSignedIn && (
              <>
                <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <FileUp className="h-4 w-4 mr-2" />
                      Import from Google Forms
                    </Button>
                  </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Import from Google Forms</DialogTitle>
                  <DialogDescription>
                    Import questions from an existing Google Forms quiz or survey
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <Tabs value={importMode} onValueChange={(value) => {
                    setImportMode(value);
                    if (value === 'browse' && googleForms.length === 0 && !loadingForms) {
                      handleLoadForms();
                    }
                  }}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="browse">Browse My Forms</TabsTrigger>
                      <TabsTrigger value="url">Enter URL</TabsTrigger>
                    </TabsList>

                    <TabsContent value="browse" className="mt-4 space-y-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="access-token">Google Access Token (Optional)</Label>
                          <div className="flex gap-2">
                            <Input
                              id="access-token"
                              type="password"
                              placeholder="Enter your Google OAuth access token"
                              value={googleAccessToken}
                              onChange={(e) => setGoogleAccessToken(e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              onClick={handleLoadForms}
                              disabled={loadingForms}
                              variant="outline"
                            >
                              {loadingForms ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Load Forms'
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Leave empty to try automatic detection, or{' '}
                            <a
                              href="https://developers.google.com/oauthplayground/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary underline"
                            >
                              get a token here
                            </a>
                            {' '}(select Drive and Forms API scopes)
                          </p>
                        </div>

                        {loadingForms ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                          </div>
                        ) : googleForms.length > 0 ? (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {googleForms.map((form) => (
                              <div
                                key={form.id}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                  selectedFormId === form.id
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:bg-muted/50'
                                }`}
                                onClick={() => handleSelectForm(form.id)}
                              >
                                <img
                                  src={form.iconLink}
                                  alt="Form icon"
                                  className="h-8 w-8"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {form.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Modified {new Date(form.modifiedTime).toLocaleDateString()}
                                  </p>
                                </div>
                                {selectedFormId === form.id && (
                                  <CheckCircle className="h-5 w-5 text-primary" />
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                              <Key className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Click &quot;Load Forms&quot; to check for forms, or enter a token to access your Google Forms
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="url" className="mt-4 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="form-url">Google Forms URL</Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="form-url"
                              placeholder="https://docs.google.com/forms/d/..."
                              value={importFormUrl}
                              onChange={(e) => setImportFormUrl(e.target.value)}
                              className="pl-10"
                              disabled={isImporting}
                            />
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>

                  <div className="rounded-lg bg-muted p-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p className="font-medium">How to get an access token:</p>
                        <ol className="list-decimal list-inside space-y-1">
                          <li>Go to <a href="https://developers.google.com/oauthplayground/" target="_blank" rel="noopener noreferrer" className="underline">OAuth Playground</a></li>
                          <li>Select Drive API v3 and Forms API v1</li>
                          <li>Click &quot;Authorize APIs&quot;</li>
                          <li>Exchange authorization code for tokens</li>
                          <li>Copy the Access Token</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium mb-1">Supported question types:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>Multiple choice</li>
                      <li>Checkboxes (multiple select)</li>
                      <li>Short answer</li>
                      <li>Paragraph (long answer)</li>
                    </ul>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImportDialogOpen(false);
                      setImportFormUrl("");
                      setGoogleAccessToken("");
                      setSelectedFormId(null);
                    }}
                    disabled={isImporting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImportFromGoogleForms}
                    disabled={isImporting || (!importFormUrl && importMode === 'url') || (!selectedFormId && importMode === 'browse')}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <FileUp className="h-4 w-4 mr-2" />
                        Import
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Exam
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Exam</DialogTitle>
                  <DialogDescription>
                    Set up a new exam with basic information. You can add questions after creating.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="exam-name">Exam Name</Label>
                    <Input
                      id="exam-name"
                      placeholder="Enter exam name"
                      value={newExam.exam_name}
                      onChange={(e) => setNewExam({...newExam, exam_name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exam-desc">Description</Label>
                    <Textarea
                      id="exam-desc"
                      placeholder="Enter exam description (optional)"
                      value={newExam.exam_description}
                      onChange={(e) => setNewExam({...newExam, exam_description: e.target.value})}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        value={newExam.duration_minutes}
                        onChange={(e) => setNewExam({...newExam, duration_minutes: parseInt(e.target.value)})}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="attempts">Attempts Allowed</Label>
                      <Input
                        id="attempts"
                        type="number"
                        min="1"
                        value={newExam.attempts_allowed}
                        onChange={(e) => setNewExam({...newExam, attempts_allowed: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passing">Passing Score (%)</Label>
                    <Input
                      id="passing"
                      type="number"
                      min="0"
                      max="100"
                      value={newExam.passing_score}
                      onChange={(e) => setNewExam({...newExam, passing_score: parseInt(e.target.value)})}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="public"
                        checked={newExam.is_public}
                        onCheckedChange={(checked) => setNewExam({...newExam, is_public: checked})}
                      />
                      <Label htmlFor="public" className="text-sm font-normal">
                        Make this exam public (visible to everyone)
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="shuffle"
                        checked={newExam.shuffle_questions}
                        onCheckedChange={(checked) => setNewExam({...newExam, shuffle_questions: checked})}
                      />
                      <Label htmlFor="shuffle" className="text-sm font-normal">
                        Shuffle questions for each attempt
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="immediate"
                        checked={newExam.show_results_immediately}
                        onCheckedChange={(checked) => setNewExam({...newExam, show_results_immediately: checked})}
                      />
                      <Label htmlFor="immediate" className="text-sm font-normal">
                        Show results immediately after submission
                      </Label>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateExam}>
                    Create & Add Questions
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
              </>
            )}
          </div>
        </motion.div>

        {!isSignedIn && (
          <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-sm">
              <strong>Welcome!</strong> You&apos;re viewing public exams.
              <Button
                variant="link"
                className="px-1 h-auto"
                onClick={() => router.push('/sign-in')}
              >
                Sign in
              </Button>
              to create your own exams or view exams shared with you.
            </p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setPage(1); }}>
          <TabsList className={`grid w-full max-w-md ${isSignedIn ? 'grid-cols-3' : 'grid-cols-1'}`}>
            {isSignedIn && <TabsTrigger value="my-exams">My Exams</TabsTrigger>}
            <TabsTrigger value="public">Public Exams</TabsTrigger>
            {isSignedIn && <TabsTrigger value="shared">Shared with Me</TabsTrigger>}
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : exams.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                <FileTextIcon className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium">No exams found</p>
                <p className="text-sm">
                  {activeTab === "my-exams"
                    ? "Create your first exam to get started"
                    : activeTab === "public"
                    ? "No public exams available"
                    : "No exams have been shared with you"}
                </p>
              </div>
            ) : (
              <>
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  key={activeTab}
                >
                  <AnimatePresence mode="popLayout">
                    {exams.map((exam, index) => (
                      <motion.div
                        key={exam.exam_id}
                        variants={cardVariants}
                        layout
                        whileHover={{ y: -6 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <ExamContextMenu
                          exam={exam}
                          activeTab={activeTab}
                          onRefresh={fetchExams}
                        >
                          <Card
                            className="relative hover:shadow-2xl transition-all duration-300 cursor-pointer h-full flex flex-col border hover:border-primary/40 bg-card group overflow-hidden"
                            onClick={() => router.push(`/exam/${exam.exam_id}/${activeTab === "public" ? "public" : "edit"}`)}
                          >
                            {/* Top colored bar based on status */}
                            <div className={`h-1.5 w-full ${
                              exam.status === 'published' ? 'bg-green-500' :
                              exam.status === 'archived' ? 'bg-gray-400' :
                              'bg-amber-500'
                            }`} />

                            <CardHeader className="pb-2 space-y-3">
                              {/* Header with title and actions */}
                              <div className="flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-xl font-bold line-clamp-1 group-hover:text-primary transition-colors">
                                    {exam.exam_name}
                                  </CardTitle>
                                  <CardDescription className="line-clamp-2 text-sm mt-1">
                                    {exam.exam_description || "No description provided"}
                                  </CardDescription>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  {activeTab === "my-exams" && (
                                    <TooltipProvider delayDuration={200}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors rounded-full"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              router.push(`/exam/${exam.exam_id}/edit`);
                                            }}
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="text-xs">
                                          Edit Exam
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                              </div>

                              {/* Stats row */}
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3.5" />
                                  <span>{exam.duration_minutes || 60} min</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <ListChecks className="h-3.5 w-3.5" />
                                  <span>{exam.items?.length || 0} questions</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Target className="h-3.5 w-3.5" />
                                  <span>{exam.total_points || 0} pts</span>
                                </div>
                              </div>

                              {/* Badges */}
                              <div className="flex gap-2 flex-wrap">
                                {getStatusBadge(exam.status)}
                                {getVisibilityBadge(exam.is_public)}
                              </div>
                            </CardHeader>

                            <CardContent className="flex-1 pt-0 pb-4">
                              {/* Questions Preview */}
                              {exam.items && exam.items.length > 0 ? (
                                <div className="space-y-2">
                                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Preview
                                  </div>
                                  <div className="space-y-2 max-h-[180px] overflow-hidden relative">
                                    {exam.items.slice(0, 3).map((question: any, qIndex: number) => (
                                      <div
                                        key={question.question_id || qIndex}
                                        className="p-3 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted/80 transition-colors"
                                      >
                                        <div className="flex items-start gap-2">
                                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                                            {qIndex + 1}
                                          </span>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium line-clamp-2 leading-snug">
                                              {question.question_text}
                                            </p>
                                            {question.options && question.options.length > 0 && (
                                              <div className="mt-1.5 space-y-1">
                                                {question.options.slice(0, 2).map((option: any, oIndex: number) => (
                                                  <div
                                                    key={oIndex}
                                                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                                                  >
                                                    <div className={`w-3 h-3 rounded-full border flex-shrink-0 ${
                                                      question.question_type === 'multiple_choice' ? 'rounded-full' : 'rounded-sm'
                                                    }`} />
                                                    <span className="line-clamp-1">{option.text || option}</span>
                                                  </div>
                                                ))}
                                                {question.options.length > 2 && (
                                                  <span className="text-xs text-muted-foreground/70">
                                                    +{question.options.length - 2} more options
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 flex-shrink-0">
                                            {question.question_type?.replace(/_/g, ' ') || 'question'}
                                          </Badge>
                                        </div>
                                      </div>
                                    ))}
                                    {/* Fade out effect for more questions */}
                                    {exam.items.length > 3 && (
                                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                                    )}
                                  </div>
                                  {exam.items.length > 3 && (
                                    <div className="text-center pt-1">
                                      <span className="text-xs text-muted-foreground">
                                        +{exam.items.length - 3} more questions
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center h-[120px] text-muted-foreground rounded-lg bg-muted/30 border border-dashed">
                                  <FileTextIcon className="h-8 w-8 mb-2 opacity-50" />
                                  <p className="text-sm">No questions yet</p>
                                  {activeTab === "my-exams" && (
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="text-xs h-auto p-0 mt-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/exam/${exam.exam_id}/edit`);
                                      }}
                                    >
                                      Add questions
                                    </Button>
                                  )}
                                </div>
                              )}
                            </CardContent>

                            {/* Footer */}
                            <div className="px-4 py-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                Created {new Date(exam.created_at).toLocaleDateString()}
                              </span>
                              <div className="flex items-center gap-1 text-primary font-medium group-hover:gap-2 transition-all">
                                <span>{activeTab === "my-exams" ? "Edit" : "View"}</span>
                                <ExternalLink className="h-3 w-3" />
                              </div>
                            </div>
                          </Card>
                        </ExamContextMenu>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>

                {pagination && pagination.totalPages > 1 && (
                  <motion.div
                    className="flex items-center justify-center gap-4 mt-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <motion.div whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                    </motion.div>

                    <span className="text-sm text-muted-foreground">
                      Page {page} of {pagination.totalPages}
                    </span>

                    <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                        disabled={page === pagination.totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Quick Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {previewExam && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Header with gradient */}
                <div className="relative p-6 pb-4 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
                  <DialogHeader>
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileTextIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <DialogTitle className="text-xl font-semibold line-clamp-2 pr-8">
                          {previewExam.exam_name}
                        </DialogTitle>
                        <DialogDescription className="mt-1 line-clamp-2">
                          {previewExam.exam_description || "No description provided"}
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>

                  {/* Badges */}
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {getStatusBadge(previewExam.status)}
                    {getVisibilityBadge(previewExam.is_public)}
                  </div>
                </div>

                <Separator />

                {/* Content */}
                <div className="max-h-[50vh] overflow-y-auto">
                  <div className="p-6 space-y-4">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <motion.div
                        className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                      >
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                          <Clock className="h-4 w-4" />
                          <span className="text-xs font-medium">Duration</span>
                        </div>
                        <p className="text-lg font-bold">{previewExam.duration_minutes || 0} min</p>
                      </motion.div>

                      <motion.div
                        className="p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.15 }}
                      >
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                          <ListChecks className="h-4 w-4" />
                          <span className="text-xs font-medium">Questions</span>
                        </div>
                        <p className="text-lg font-bold">{previewExam.items?.length || 0}</p>
                      </motion.div>

                      <motion.div
                        className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                          <Target className="h-4 w-4" />
                          <span className="text-xs font-medium">Total Points</span>
                        </div>
                        <p className="text-lg font-bold">{previewExam.total_points || 0}</p>
                      </motion.div>

                      <motion.div
                        className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.25 }}
                      >
                        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                          <Award className="h-4 w-4" />
                          <span className="text-xs font-medium">Pass Score</span>
                        </div>
                        <p className="text-lg font-bold">{previewExam.passing_score || 70}%</p>
                      </motion.div>
                    </div>

                    {/* Additional Details */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground">Exam Settings</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          <span>Attempts: {previewExam.attempts_allowed || 1}</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                          <ShieldCheck className="h-4 w-4 text-primary" />
                          <span>
                            {previewExam.shuffle_questions ? "Shuffled" : "Fixed order"}
                          </span>
                        </div>
                        {previewExam.start_date && (
                          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span>Starts: {new Date(previewExam.start_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {previewExam.end_date && (
                          <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                            <Calendar className="h-4 w-4 text-primary" />
                            <span>Ends: {new Date(previewExam.end_date).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Question Types Summary */}
                    {previewExam.items && previewExam.items.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-muted-foreground">Question Types</h4>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const typeCounts: Record<string, number> = {};
                            previewExam.items.forEach((q: any) => {
                              typeCounts[q.question_type] = (typeCounts[q.question_type] || 0) + 1;
                            });
                            return Object.entries(typeCounts).map(([type, count]) => (
                              <Badge key={type} variant="secondary" className="gap-1">
                                <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                                <span className="text-xs bg-primary/20 px-1.5 py-0.5 rounded-full ml-1">
                                  {count}
                                </span>
                              </Badge>
                            ));
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Footer Actions */}
                <div className="p-4 flex justify-between items-center bg-muted/30">
                  <Button
                    variant="outline"
                    onClick={() => setPreviewDialogOpen(false)}
                  >
                    Close
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        router.push(`/exam/${previewExam.exam_id}/preview`);
                        setPreviewDialogOpen(false);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Full Preview
                      <ExternalLink className="h-3 w-3 ml-1.5 opacity-50" />
                    </Button>
                    {activeTab === "my-exams" && (
                      <Button
                        onClick={() => {
                          router.push(`/exam/${previewExam.exam_id}/edit`);
                          setPreviewDialogOpen(false);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Exam
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
