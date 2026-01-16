"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  History,
  Save,
  RotateCcw,
  Loader2,
  Clock,
  FileText,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format } from "date-fns";

interface ExamVersion {
  version_id: string;
  version_number: number;
  exam_name: string;
  total_points: number | null;
  change_summary: string | null;
  changed_by: string;
  created_at: string;
}

interface VersionHistoryProps {
  examId: string;
  onRestore?: () => void;
  className?: string;
}

export function VersionHistory({
  examId,
  onRestore,
  className,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<ExamVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ExamVersion | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [changeSummary, setChangeSummary] = useState("");
  const [open, setOpen] = useState(false);

  const fetchVersions = useCallback(async () => {
    try {
      const response = await fetch(`/api/exams/${examId}/versions`);
      const data = await response.json();
      if (data.success) {
        setVersions(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch versions:", error);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  useEffect(() => {
    if (open) {
      fetchVersions();
    }
  }, [open, fetchVersions]);

  const handleSaveVersion = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/exams/${examId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ change_summary: changeSummary }),
      });

      const data = await response.json();
      if (data.success) {
        setChangeSummary("");
        setShowSaveDialog(false);
        fetchVersions();
      }
    } catch (error) {
      console.error("Failed to save version:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedVersion) return;

    setRestoring(true);
    try {
      const response = await fetch(
        `/api/exams/${examId}/versions/${selectedVersion.version_id}`,
        {
          method: "POST",
        }
      );

      const data = await response.json();
      if (data.success) {
        setShowRestoreDialog(false);
        setSelectedVersion(null);
        setOpen(false);
        onRestore?.();
      }
    } catch (error) {
      console.error("Failed to restore version:", error);
    } finally {
      setRestoring(false);
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "-";
    }
  };

  const formatFullDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "-";
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className={cn("gap-2", className)}>
            <History className="h-4 w-4" />
            Version History
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Version History</span>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setShowSaveDialog(true)}
              >
                <Save className="h-4 w-4" />
                Save Version
              </Button>
            </SheetTitle>
          </SheetHeader>

          <div className="h-[calc(100vh-120px)] mt-4 pr-4 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No versions saved yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Save a version to track changes
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {versions.map((version, index) => (
                  <div
                    key={version.version_id}
                    className={cn(
                      "p-4 rounded-lg border transition-colors",
                      index === 0
                        ? "bg-primary/5 border-primary/20"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={index === 0 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            v{version.version_number}
                          </Badge>
                          {index === 0 && (
                            <Badge variant="outline" className="text-xs">
                              Latest
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium mt-2 truncate">
                          {version.exam_name}
                        </p>
                        {version.change_summary && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {version.change_summary}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(version.created_at)}
                          </span>
                          {version.total_points !== null && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {version.total_points} points
                            </span>
                          )}
                        </div>
                      </div>
                      {index > 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1"
                          onClick={() => {
                            setSelectedVersion(version);
                            setShowRestoreDialog(true);
                          }}
                        >
                          <RotateCcw className="h-4 w-4" />
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Save Version Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Version</DialogTitle>
            <DialogDescription>
              Create a snapshot of the current exam state
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="summary">Change Summary (optional)</Label>
              <Input
                id="summary"
                placeholder="What changed in this version?"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveVersion} disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Version
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Version</DialogTitle>
            <DialogDescription>
              This will restore the exam to version {selectedVersion?.version_number}.
              The current state will be saved automatically before restoring.
            </DialogDescription>
          </DialogHeader>
          {selectedVersion && (
            <div className="p-4 rounded-lg border bg-muted/50 space-y-2">
              <p className="font-medium">{selectedVersion.exam_name}</p>
              {selectedVersion.change_summary && (
                <p className="text-sm text-muted-foreground">
                  {selectedVersion.change_summary}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Created {formatFullDate(selectedVersion.created_at)}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRestoreDialog(false);
                setSelectedVersion(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRestore}
              disabled={restoring}
              className="gap-2"
            >
              {restoring ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  Restore
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
