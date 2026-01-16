"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  PlayCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface AttemptProgress {
  attempt_id: string;
  student_name: string;
  student_email: string;
  status: string;
  score: number | null;
  started_at: string;
  submitted_at: string | null;
  current_question: number;
  progress: {
    answered: number;
    total: number;
    lastActivity: string;
  } | null;
  violations: Array<{ type: string; timestamp: string }>;
}

interface Stats {
  total: number;
  inProgress: number;
  completed: number;
  notStarted: number;
  withViolations: number;
}

interface LiveProgressDashboardProps {
  sessionId: string;
  className?: string;
  refreshInterval?: number; // in milliseconds, default 30000 (30 seconds)
}

export function LiveProgressDashboard({
  sessionId,
  className,
  refreshInterval = 30000,
}: LiveProgressDashboardProps) {
  const [attempts, setAttempts] = useState<AttemptProgress[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    inProgress: 0,
    completed: 0,
    notStarted: 0,
    withViolations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchProgress = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/exams/attempts/progress?sessionId=${sessionId}`
      );
      const data = await response.json();

      if (data.success) {
        setAttempts(data.data || []);
        setStats(data.stats || stats);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch progress:", error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchProgress();

    // Set up polling
    const interval = setInterval(fetchProgress, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchProgress, refreshInterval]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "in_progress":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1">
            <PlayCircle className="h-3 w-3" />
            In Progress
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
            <CheckCircle className="h-3 w-3" />
            Completed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getProgressPercent = (progress: AttemptProgress["progress"]) => {
    if (!progress || !progress.total) return 0;
    return Math.round((progress.answered / progress.total) * 100);
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "-";
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PlayCircle className="h-4 w-4" />
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.inProgress}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.completed}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              With Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.withViolations}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Live Progress</CardTitle>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  Updated {formatTime(lastUpdated.toISOString())}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchProgress}
                className="gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {attempts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No attempts yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Violations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((attempt) => (
                  <TableRow key={attempt.attempt_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{attempt.student_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {attempt.student_email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(attempt.status)}</TableCell>
                    <TableCell>
                      <div className="w-32 space-y-1">
                        <Progress
                          value={getProgressPercent(attempt.progress)}
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground">
                          {attempt.progress?.answered || 0} /{" "}
                          {attempt.progress?.total || "?"} questions
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {formatTime(attempt.started_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {attempt.progress?.lastActivity
                          ? formatTime(attempt.progress.lastActivity)
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {attempt.violations?.length > 0 ? (
                        <Badge
                          variant="destructive"
                          className="gap-1"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {attempt.violations.length}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
