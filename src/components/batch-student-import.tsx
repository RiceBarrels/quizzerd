"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Upload,
  FileText,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface ImportResult {
  totalProcessed: number;
  validCount: number;
  addedCount: number;
  duplicateCount: number;
  invalidCount: number;
  finalCount: number;
  invalidEmails: string[];
  addedEmails: string[];
}

interface BatchStudentImportProps {
  sessionId: string;
  onImportComplete?: (result: ImportResult) => void;
  trigger?: React.ReactNode;
}

export function BatchStudentImport({
  sessionId,
  onImportComplete,
  trigger,
}: BatchStudentImportProps) {
  const [open, setOpen] = useState(false);
  const [csvData, setCsvData] = useState("");
  const [appendMode, setAppendMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv") && !file.name.endsWith(".txt")) {
      toast.error("Please upload a CSV or TXT file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvData(content);
      toast.success(`File loaded: ${file.name}`);
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvData.trim()) {
      toast.error("Please enter or upload student emails");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        `/api/exams/sessions/${sessionId}/import-students`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csvData, appendMode }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }

      setResult(data.data);
      toast.success(data.message);

      if (onImportComplete) {
        onImportComplete(data.data);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/exams/sessions/${sessionId}/import-students`
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `students-${sessionId.slice(0, 8)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Student list exported");
    } catch (error) {
      toast.error("Failed to export student list");
    }
  };

  const resetDialog = () => {
    setCsvData("");
    setResult(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetDialog();
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import Students
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Batch Import Students
          </DialogTitle>
          <DialogDescription>
            Import multiple student emails from a CSV file or paste them
            directly.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label>Upload CSV File</Label>
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
                <Button variant="outline" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Current
                </Button>
              </div>
            </div>

            {/* Manual Input */}
            <div className="space-y-2">
              <Label htmlFor="csv-data">
                Or paste emails (one per line or comma-separated)
              </Label>
              <Textarea
                id="csv-data"
                placeholder="student1@example.com&#10;student2@example.com&#10;student3@example.com"
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            {/* Options */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="append-mode">Append to existing list</Label>
                <p className="text-xs text-muted-foreground">
                  {appendMode
                    ? "New emails will be added to the current list"
                    : "Current list will be replaced with new emails"}
                </p>
              </div>
              <Switch
                id="append-mode"
                checked={appendMode}
                onCheckedChange={setAppendMode}
              />
            </div>

            {/* Format hint */}
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">
                <strong>Supported formats:</strong>
              </p>
              <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                <li>- One email per line</li>
                <li>- Comma-separated: email1@example.com, email2@example.com</li>
                <li>- CSV with header: name,email or email,name</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Results Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {result.addedCount}
                </div>
                <div className="text-xs text-muted-foreground">Added</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold">{result.finalCount}</div>
                <div className="text-xs text-muted-foreground">Total Students</div>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2">
              {result.duplicateCount > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  {result.duplicateCount} already in list (skipped)
                </div>
              )}
              {result.invalidCount > 0 && (
                <div className="flex items-start gap-2 text-sm text-red-600">
                  <XCircle className="h-4 w-4 mt-0.5" />
                  <div>
                    {result.invalidCount} invalid email(s)
                    {result.invalidEmails.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {result.invalidEmails.map((email, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-xs font-mono"
                          >
                            {email}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {result.addedCount > 0 && result.addedEmails.length > 0 && (
                <div className="flex items-start gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4 mt-0.5" />
                  <div>
                    Added emails:
                    <div className="mt-1 flex flex-wrap gap-1">
                      {result.addedEmails.map((email, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-xs font-mono bg-green-50"
                        >
                          {email}
                        </Badge>
                      ))}
                      {result.addedCount > result.addedEmails.length && (
                        <Badge variant="secondary" className="text-xs">
                          +{result.addedCount - result.addedEmails.length} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={loading || !csvData.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={resetDialog}>
                Import More
              </Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
