"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Calendar,
  Clock,
  ExternalLink,
  Copy,
  MoreHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Link2,
  FileText,
  CheckCircle,
  XCircle,
  Archive
} from "lucide-react";
import { toast } from "sonner";
import { useTransitionRouter } from "next-view-transitions";
import Link from "next/link";

interface Session {
  session_id: string;
  exam_id: string;
  google_course_id: string;
  google_course_name: string;
  google_classroom_id: string;
  allowed_emails: string[];
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  attempt_count: number;
  exams: {
    exam_id: string;
    exam_name: string;
    exam_description: string;
    items: any[];
    total_points: number;
  } | null;
}

export default function SessionsPage() {
  const { user, isLoaded } = useUser();
  const router = useTransitionRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const limit = 10;

  useEffect(() => {
    if (isLoaded && user) {
      fetchSessions();
    }
  }, [isLoaded, user, page, statusFilter]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        status: statusFilter
      });

      const response = await fetch(`/api/exams/sessions?${params}`);
      const data = await response.json();

      if (data.success) {
        setSessions(data.data || []);
        setPagination(data.pagination);
      } else {
        toast.error(data.error || "Failed to fetch sessions");
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      toast.error("Failed to fetch sessions");
    } finally {
      setLoading(false);
    }
  };

  const copySessionLink = (sessionId: string) => {
    const url = `${window.location.origin}/exam/session/${sessionId}`;
    navigator.clipboard.writeText(url);
    toast.success("Session link copied to clipboard");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
            <CheckCircle className="h-3 w-3" />
            Active
          </Badge>
        );
      case 'closed':
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
            <XCircle className="h-3 w-3" />
            Closed
          </Badge>
        );
      case 'archived':
        return (
          <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/20 gap-1">
            <Archive className="h-3 w-3" />
            Archived
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredSessions = sessions.filter(session => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      session.google_course_name?.toLowerCase().includes(searchLower) ||
      session.exams?.exam_name?.toLowerCase().includes(searchLower)
    );
  });

  if (!isLoaded) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-primary" />
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to view your exam sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Sessions
          </h1>
          <p className="text-muted-foreground">
            Manage your Google Classroom exam sessions
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by course or exam name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Sessions</CardTitle>
          <CardDescription>
            {pagination?.total || 0} total sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-lg font-medium text-muted-foreground">No sessions found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sessions are created when you publish exams to Google Classroom
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/exam">Go to Exams</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.map((session) => (
                      <TableRow key={session.session_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium line-clamp-1">
                                {session.exams?.exam_name || 'Unknown Exam'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {session.exams?.items?.length || 0} questions
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            <span className="line-clamp-1">{session.google_course_name || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {session.allowed_emails?.length || 0} students
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{session.attempt_count}</span>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(session.status)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDate(session.created_at)}
                          </div>
                          {session.end_date && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Due: {formatDate(session.end_date)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => copySessionLink(session.session_id)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Link
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/exam/${session.exam_id}/analytics`)}>
                                <FileText className="h-4 w-4 mr-2" />
                                View Analytics
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => router.push(`/exam/${session.exam_id}/edit`)}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Edit Exam
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm px-2">
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
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats Summary */}
      {!loading && sessions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sessions.filter(s => s.status === 'active').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sessions.reduce((acc, s) => acc + (s.allowed_emails?.length || 0), 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Attempts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sessions.reduce((acc, s) => acc + s.attempt_count, 0)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
