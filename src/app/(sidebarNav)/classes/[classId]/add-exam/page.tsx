"use client";

import { useState, useEffect, use } from "react";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  Search,
  FileText,
  Clock,
  HelpCircle,
  CalendarIcon,
  Check,
  Plus
} from "lucide-react";
import { useTransitionRouter } from "next-view-transitions";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface AddExamPageProps {
  params: Promise<{ classId: string }>;
}

export default function AddExamPage({ params }: AddExamPageProps) {
  const { classId } = use(params);
  const { user, isLoaded } = useUser();
  const router = useTransitionRouter();

  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [adding, setAdding] = useState(false);

  // Exam settings
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [pointsPossible, setPointsPossible] = useState<string>("");
  const [status, setStatus] = useState<string>("published");

  useEffect(() => {
    if (isLoaded) {
      fetchExams();
    }
  }, [isLoaded]);

  const fetchExams = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/exams/get');
      const data = await response.json();

      if (data.success) {
        setExams(data.data || []);
      } else {
        toast.error("Failed to load exams");
      }
    } catch (error) {
      console.error("Failed to fetch exams:", error);
      toast.error("Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  const handleAddExam = async () => {
    if (!selectedExam) {
      toast.error("Please select an exam");
      return;
    }

    setAdding(true);
    try {
      const response = await fetch(`/api/classes/${classId}/exams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_id: selectedExam.exam_id,
          start_date: startDate?.toISOString() || null,
          end_date: endDate?.toISOString() || null,
          points_possible: pointsPossible ? parseInt(pointsPossible) : null,
          status
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Exam added to class!");
        router.push(`/classes/${classId}`);
      } else {
        toast.error(data.error || "Failed to add exam");
      }
    } catch (error) {
      toast.error("Failed to add exam");
    } finally {
      setAdding(false);
    }
  };

  const filteredExams = exams.filter((exam) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      exam.exam_name?.toLowerCase().includes(searchLower) ||
      exam.exam_description?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 max-w-4xl mx-auto space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/classes/${classId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Add Exam to Class</h1>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Exam Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Exam</CardTitle>
            <CardDescription>
              Choose an exam from your library to add to this class
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search exams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Exam List */}
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {filteredExams.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No exams found</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push('/exam')}
                  >
                    Create an Exam
                  </Button>
                </div>
              ) : (
                filteredExams.map((exam) => (
                  <div
                    key={exam.exam_id}
                    className={cn(
                      "p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedExam?.exam_id === exam.exam_id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => setSelectedExam(exam)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{exam.exam_name}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <HelpCircle className="h-3 w-3" />
                            {exam.items?.filter((i: any) =>
                              i.question_type !== 'page_break' &&
                              i.question_type !== 'section_header'
                            ).length || 0} questions
                          </span>
                          {exam.duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {exam.duration_minutes} min
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedExam?.exam_id === exam.exam_id && (
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Exam Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Exam Settings</CardTitle>
            <CardDescription>
              Configure how this exam appears in the class
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selected Exam Preview */}
            {selectedExam ? (
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold">{selectedExam.exam_name}</h4>
                {selectedExam.exam_description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {selectedExam.exam_description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  <Badge variant="secondary">
                    {selectedExam.items?.filter((i: any) =>
                      i.question_type !== 'page_break' &&
                      i.question_type !== 'section_header'
                    ).length || 0} questions
                  </Badge>
                  {selectedExam.total_points && (
                    <Badge variant="outline">
                      {selectedExam.total_points} points
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
                Select an exam from the list
              </div>
            )}

            {/* Start Date */}
            <div className="space-y-2">
              <Label>Start Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "No start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="space-y-2">
              <Label>Due Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "No due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Points */}
            <div className="space-y-2">
              <Label htmlFor="points">Points Possible (Optional)</Label>
              <Input
                id="points"
                type="number"
                placeholder={selectedExam?.total_points?.toString() || "100"}
                value={pointsPossible}
                onChange={(e) => setPointsPossible(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use the exam's default points
              </p>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft (Hidden from students)</SelectItem>
                  <SelectItem value="published">Published (Visible to students)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Add Button */}
            <Button
              className="w-full"
              onClick={handleAddExam}
              disabled={!selectedExam || adding}
            >
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Exam to Class
            </Button>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
