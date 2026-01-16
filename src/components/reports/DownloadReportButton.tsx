"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DownloadReportButtonProps {
  attemptId: string;
  studentName?: string;
  className?: string;
}

export function DownloadReportButton({
  attemptId,
  studentName,
  className,
}: DownloadReportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async (includeQuestions: boolean) => {
    setLoading(true);
    try {
      const response = await fetch("/api/exams/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt_id: attemptId,
          include_questions: includeQuestions,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `grade-report-${studentName?.replace(/\s+/g, "-") || attemptId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download report:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          className={cn("gap-2", className)}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Report
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleDownload(true)}>
          <FileText className="h-4 w-4 mr-2" />
          Full Report (with questions)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload(false)}>
          <FileText className="h-4 w-4 mr-2" />
          Summary Only
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface BatchDownloadButtonProps {
  sessionId?: string;
  examId?: string;
  className?: string;
}

export function BatchDownloadButton({
  sessionId,
  examId,
  className,
}: BatchDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleBatchDownload = async () => {
    setLoading(true);
    try {
      // First get list of attempts
      const params = new URLSearchParams();
      if (sessionId) params.append("sessionId", sessionId);
      if (examId) params.append("examId", examId);

      const listResponse = await fetch(`/api/exams/reports?${params}`);
      const listData = await listResponse.json();

      if (!listData.success || !listData.data?.length) {
        alert("No completed attempts to download");
        return;
      }

      setDownloading(true);

      // Download each report
      for (const attempt of listData.data) {
        const response = await fetch("/api/exams/reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attempt_id: attempt.attempt_id,
            include_questions: true,
          }),
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `grade-report-${attempt.student_name?.replace(/\s+/g, "-") || attempt.attempt_id}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);

          // Small delay between downloads
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error("Failed to batch download reports:", error);
    } finally {
      setLoading(false);
      setDownloading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleBatchDownload}
      disabled={loading}
      className={cn("gap-2", className)}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {downloading ? "Downloading..." : "Loading..."}
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          Download All Reports
        </>
      )}
    </Button>
  );
}
