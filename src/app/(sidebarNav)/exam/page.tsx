"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Key
} from "lucide-react";
import { useTransitionRouter } from "next-view-transitions";

export default function ExamPage() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [activeTab, setActiveTab] = useState("my-exams");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFormUrl, setImportFormUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [googleForms, setGoogleForms] = useState([]);
  const [selectedFormId, setSelectedFormId] = useState(null);
  const [googleAccessToken, setGoogleAccessToken] = useState("");
  const [loadingForms, setLoadingForms] = useState(false);
  const [importMode, setImportMode] = useState('url'); // 'url' or 'browse'
  const [classes, setClasses] = useState([]);
  const router = useTransitionRouter();
  const limit = 12;

  const [newExam, setNewExam] = useState({
    exam_name: "",
    exam_description: "",
    class_ids: [],
    subjects: [],
    is_public: false,
    duration_minutes: 60,
    attempts_allowed: 1,
    shuffle_questions: false,
    show_results_immediately: true,
    passing_score: 70
  });

  useEffect(() => {
    fetchExams();
    fetchClasses();
  }, [page, search, activeTab]);

  const fetchClasses = async () => {
    try {
      const response = await fetch('/api/classes/get');
      const data = await response.json();
      if (data.success) {
        setClasses(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch classes:", error);
    }
  };

  const fetchExams = async () => {
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
      } else {
        toast.error(data.error || "Failed to load exams");
      }
    } catch (error) {
      console.error("Failed to fetch exams:", error);
      toast.error("Failed to load exams");
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

  const handleSelectForm = async (formId) => {
    setSelectedFormId(formId);
    const form = googleForms.find(f => f.id === formId);
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
      const payload = {
        class_ids: [],
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
          class_ids: [],
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

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const getStatusBadge = (status) => {
    const variants = {
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

  const getVisibilityBadge = (isPublic) => {
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
    <div className="p-4 space-y-4">
      <div className="bg-sidebar border rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileTextIcon className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Exams</h1>
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="classes">Classes (Optional)</Label>
                    <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                      {classes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No classes available</p>
                      ) : (
                        classes.map((cls) => (
                          <div key={cls.class_id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`class-${cls.class_id}`}
                              checked={newExam.class_ids.includes(cls.class_id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNewExam({...newExam, class_ids: [...newExam.class_ids, cls.class_id]});
                                } else {
                                  setNewExam({...newExam, class_ids: newExam.class_ids.filter(id => id !== cls.class_id)});
                                }
                              }}
                            />
                            <Label
                              htmlFor={`class-${cls.class_id}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {cls.class_name}
                            </Label>
                          </div>
                        ))
                      )}
                    </div>
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
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => { setActiveTab(value); setPage(1); }}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="my-exams">My Exams</TabsTrigger>
            <TabsTrigger value="public">Public Exams</TabsTrigger>
            <TabsTrigger value="shared">Shared with Me</TabsTrigger>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {exams.map((exam) => (
                    <Card 
                      key={exam.exam_id} 
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => router.push(`/exam/${exam.exam_id}/${activeTab === "my-exams" ? "edit" : "view"}`)}
                    >
                      <CardHeader>
                        <div className="flex justify-between items-start mb-2">
                          <CardTitle className="text-lg line-clamp-2">
                            {exam.exam_name}
                          </CardTitle>
                          {activeTab === "my-exams" && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/exam/${exam.exam_id}/edit`);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <CardDescription className="line-clamp-2">
                          {exam.exam_description || "No description"}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex gap-2 flex-wrap">
                            {getStatusBadge(exam.status)}
                            {getVisibilityBadge(exam.is_public)}
                          </div>
                          
                          {exam.class_names && exam.class_names.length > 0 && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {exam.class_names.join(", ")}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {exam.duration_minutes} minutes
                          </div>
                          
                          {exam.total_points > 0 && (
                            <div className="text-sm text-muted-foreground">
                              Total: {exam.total_points} points
                            </div>
                          )}
                          
                          {exam.questions && (
                            <div className="text-sm text-muted-foreground">
                              {exam.questions.length} questions
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {pagination.totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}