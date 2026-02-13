"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CreateClassButton from "@/components/ui/create-class-button";
import JoinButton from "@/components/ui/join-button";
import { GraduationCapIcon, HardDriveUploadIcon, PaperclipIcon, PlusIcon, SearchIcon, Users, Clock, ChevronLeft, ChevronRight, Loader2, Archive, Link2, AlertCircle, Key, CheckCircle, FileUp } from "lucide-react";
import Image from "next/image";
import { FcGoogle } from "react-icons/fc";
import { Input } from "@/components/ui/input";
import { Link, useTransitionRouter } from "next-view-transitions";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function Home() {
    const [classes, setClasses] = useState<any[]>([]);
    const [archivedClasses, setArchivedClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [archivedLoading, setArchivedLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<any>(null);
    const router = useTransitionRouter();
    const limit = 6;

    // Import from Google Forms state
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [importFormUrl, setImportFormUrl] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [googleForms, setGoogleForms] = useState<any[]>([]);
    const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
    const [googleAccessToken, setGoogleAccessToken] = useState("");
    const [loadingForms, setLoadingForms] = useState(false);
    const [importMode, setImportMode] = useState('url');

    useEffect(() => {
        fetchClasses();
    }, [page, search]);

    useEffect(() => {
        fetchArchivedClasses();
    }, []);

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...(search && { search })
            });

            const response = await fetch(`/api/classes/get?${params}`);
            const data = await response.json();

            if (data.success) {
                setClasses(data.data);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error("Failed to fetch classes:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchArchivedClasses = async () => {
        setArchivedLoading(true);
        try {
            const params = new URLSearchParams({
                page: '1',
                limit: '100',
                includeArchived: 'true'
            });

            const response = await fetch(`/api/classes/get?${params}`);
            const data = await response.json();

            if (data.success) {
                // Filter only archived classes
                const archived = data.data.filter((c: any) => c.is_archived);
                setArchivedClasses(archived);
            }
        } catch (error) {
            console.error("Failed to fetch archived classes:", error);
        } finally {
            setArchivedLoading(false);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const handleLoadForms = async () => {
        setLoadingForms(true);
        try {
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

    const handleSelectForm = (formId: string) => {
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
                class_ids: [],
                is_public: false
            };

            if (importMode === 'url') {
                payload.formUrl = importFormUrl;
            } else {
                payload.formId = selectedFormId;
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

    const formatTime = (timeString: string | null | undefined) => {
        if (!timeString) return null;
        const time = timeString.split(':');
        const hours = parseInt(time[0]);
        const minutes = time[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes} ${ampm}`;
    };
    
    return (
        <>
            <div className="p-2 m-2 bg-sidebar rounded-t-3xl rounded-b-xl flex flex-col gap-1 border">
                <h2 className="font-bold text-lg flex gap-2 p-2">
                    <PaperclipIcon />
                    Create a new Exam...

                    <div className="flex-1"/>

                    <JoinButton defaultValue="joinExam"/>
                </h2>
                <div className="flex bg-background rounded-t-3xl rounded-b-xl p-4 px-8 gap-4">
                    <Button onClick={()=>router.push('exam')} variant="outline" className="h-32 w-24 flex flex-col gap-2">

                        <div className="text-xs h-6 -space-x-2 flex items-center justify-center">
                            <PlusIcon />
                        </div>

                        <div className="flex gap-2 justify-center items-center">
                            <span className="font-bold text-xs">Blank</span>
                        </div>

                    </Button>
                    
                    <Button variant="outline" className="h-32 w-24 flex flex-col">
                        <div className="text-xs h-6 -space-x-2 flex items-center justify-center">
                            <SearchIcon />

                        </div>
                        <div className="flex gap-2 justify-center items-center">
                            <span className="font-bold text-xs">Search</span>
                        </div>
                    </Button>
                    
                    <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="h-32 w-24 flex flex-col">
                                <div className="text-xs h-6 -space-x-2 flex items-center justify-center">

                                    <div className="bg-accent p-1 rounded-2xl border-2 border-background size-7 flex items-center justify-center">
                                        <FcGoogle className="size-4"/>
                                    </div>

                                    <div className="bg-accent p-1 rounded-2xl border-2 border-background size-7 flex items-center justify-center">
                                        <Image alt='' src="./microsoft-form.svg" width={32} height={32} className="size-3"/>
                                    </div>

                                </div>
                                <div className="flex gap-2 justify-center items-center">
                                    <HardDriveUploadIcon />
                                    <span className="font-bold text-xs">Import</span>
                                </div>
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
                </div>
            </div>
            
            <div className="p-2 m-2 bg-sidebar rounded-b-3xl rounded-t-xl flex flex-col gap-1 border">
                <div className="flex gap-2 p-2 items-center">
                    <GraduationCapIcon />
                    <h2 className="font-bold text-lg">My Classes</h2>
                    
                    <div className="flex-1 max-w-md">
                        <Input
                            type="search"
                            placeholder="Search classes by name or code..."
                            value={search}
                            onChange={handleSearch}
                            className="h-9"
                        />
                    </div>

                    <div className="flex-1"/>
                    <CreateClassButton/>
                    <JoinButton><Button> <PlusIcon /> Join</Button></JoinButton>
                </div>
                
                <div className="bg-background rounded-b-3xl rounded-t-xl p-8">
                    {loading ? (
                        <div className="flex items-center justify-center h-52">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : classes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-52 text-muted-foreground">
                            <GraduationCapIcon className="h-16 w-16 mb-4" />
                            <p className="text-lg font-medium">No classes found</p>
                            <p className="text-sm">Create or join a class to get started</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {classes.map((classItem) => (
                                    <Link key={classItem.class_id}  href={`class/${classItem.class_code}`}>
                                        <Card 
                                            className={`h-52 flex flex-col gap-2 p-0 overflow-clip bg-sidebar cursor-pointer duration-150`}
                                        >
                                            <CardHeader 
                                                className="rounded-b-2xl shadow m-0 p-1 gap-1"
                                                style={{ backgroundColor: classItem.class_settings?.themeColor || '#bc6a4a' }}
                                            >
                                                <CardTitle className="text-sidebar-foreground text-shadow-2xs w-full gap-2 bg-sidebar p-3 rounded-t-2xl rounded-b-lg m-0 font-black">
                                                    {classItem.class_name}
                                                </CardTitle>
                                                <CardDescription className="text-sidebar-foreground text-shadow-2xs m-0 bg-sidebar p-2 rounded-t-lg rounded-b-2xl text-xs space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        {(classItem.role === "admin" || classItem.role === "teacher") &&
                                                            <Badge variant="outline" className="text-xs">
                                                                Class Code: {classItem.class_code}
                                                            </Badge>
                                                        }
                                                        <Badge variant="secondary" className="text-xs">
                                                            {classItem.role}
                                                        </Badge>
                                                    </div>
                                                    {classItem.period_start && (
                                                        <div className="flex items-center gap-1 text-muted-foreground">
                                                            <Clock className="h-3 w-3" />
                                                            <span>{formatTime(classItem.period_start)} - {formatTime(classItem.period_end)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <Users className="h-3 w-3" />
                                                        <span>{classItem.member_count} members</span>
                                                    </div>
                                                </CardDescription>
                                            </CardHeader>
                                        </Card>
                                    </Link>
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

                            {/* Archived Classes Accordion */}
                            {archivedClasses.length > 0 && (
                                <div className="mt-8">
                                    <Accordion type="single" collapsible className="w-full">
                                        <AccordionItem value="archived" className="border rounded-2xl px-4">
                                            <AccordionTrigger className="hover:no-underline py-4">
                                                <div className="flex items-center gap-3">
                                                    <Archive className="h-5 w-5 text-muted-foreground" />
                                                    <h3 className="text-lg font-bold">Archived Classes</h3>
                                                    <Badge variant="secondary" className="ml-2">
                                                        {archivedClasses.length}
                                                    </Badge>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                {archivedLoading ? (
                                                    <div className="flex items-center justify-center h-32">
                                                        <Loader2 className="h-8 w-8 animate-spin" />
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
                                                        {archivedClasses.map((classItem) => (
                                                            <Link key={classItem.class_id} href={`class/${classItem.class_code}`}>
                                                                <Card 
                                                                    className={`h-52 flex flex-col gap-2 p-0 overflow-clip bg-sidebar cursor-pointer duration-150 opacity-70 hover:opacity-100`}
                                                                >
                                                                    <CardHeader 
                                                                        className="rounded-b-2xl shadow m-0 p-1 gap-1"
                                                                        style={{ backgroundColor: classItem.class_settings?.themeColor || '#bc6a4a' }}
                                                                    >
                                                                        <CardTitle className="text-sidebar-foreground text-shadow-2xs w-full gap-2 bg-sidebar p-3 rounded-t-2xl rounded-b-lg m-0 font-black flex items-center justify-between">
                                                                            <span className="truncate">{classItem.class_name}</span>
                                                                            <Archive className="h-4 w-4 flex-shrink-0" />
                                                                        </CardTitle>
                                                                        <CardDescription className="text-sidebar-foreground text-shadow-2xs m-0 bg-sidebar p-2 rounded-t-lg rounded-b-2xl text-xs space-y-1">
                                                                            <div className="flex items-center gap-2">
                                                                                {(classItem.role === "admin" || classItem.role === "teacher") &&
                                                                                    <Badge variant="outline" className="text-xs">
                                                                                        Class Code: {classItem.class_code}
                                                                                    </Badge>
                                                                                }
                                                                                <Badge variant="secondary" className="text-xs">
                                                                                    {classItem.role}
                                                                                </Badge>
                                                                            </div>
                                                                            {classItem.period_start && (
                                                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                                                    <Clock className="h-3 w-3" />
                                                                                    <span>{formatTime(classItem.period_start)} - {formatTime(classItem.period_end)}</span>
                                                                                </div>
                                                                            )}
                                                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                                                <Users className="h-3 w-3" />
                                                                                <span>{classItem.member_count} members</span>
                                                                            </div>
                                                                        </CardDescription>
                                                                    </CardHeader>
                                                                </Card>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                )}
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    )
}
