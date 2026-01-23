"use client";

import { useState, useEffect, use } from "react";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  ArrowLeft,
  Search,
  Download,
  BarChart3,
  Users,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { useTransitionRouter } from "next-view-transitions";
import { cn } from "@/lib/utils";

interface GradesPageProps {
  params: Promise<{ classId: string }>;
}

interface Student {
  member_id: string;
  user_id: string;
  email: string;
  display_name: string;
  full_name: string;
  user_email: string;
  img_url: string | null;
  grades: Record<string, { score: number | null; status: string; attempt_id?: string }>;
  average: number | null;
}

interface Exam {
  id: string;
  exam_id: string;
  exam_name: string;
  total_points: number;
  status: string;
}

export default function GradesPage({ params }: GradesPageProps) {
  const { classId } = use(params);
  const { user, isLoaded } = useUser();
  const router = useTransitionRouter();

  const [loading, setLoading] = useState(true);
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "average">("name");
  const [selectedAttempt, setSelectedAttempt] = useState<string | null>(null);
  const [attemptDetails, setAttemptDetails] = useState<any>(null);
  const [loadingAttempt, setLoadingAttempt] = useState(false);

  useEffect(() => {
    if (isLoaded && classId) {
      fetchGradebookData();
    }
  }, [isLoaded, classId]);

  const fetchGradebookData = async () => {
    setLoading(true);
    try {
      // Fetch class data with members and exams
      const [classResponse, examsResponse] = await Promise.all([
        fetch(`/api/classes/${classId}`),
        fetch(`/api/classes/${classId}/exams`)
      ]);

      const classData = await classResponse.json();
      const examsData = await examsResponse.json();

      if (!classData.success) {
        toast.error("Failed to load class");
        router.push('/classes');
        return;
      }

      if (!classData.data.is_teacher && !classData.data.is_owner) {
        toast.error("Only teachers can view the gradebook");
        router.push(`/classes/${classId}`);
        return;
      }

      setClassName(classData.data.class_name);

      // Get class members (students only)
      const members = classData.data.class_members?.filter(
        (m: any) => m.role === 'student' && m.status === 'active'
      ) || [];

      // Get exams
      const classExams = (examsData.data || []).map((ce: any) => ({
        id: ce.id,
        exam_id: ce.exam_id,
        exam_name: ce.exams?.exam_name || 'Untitled',
        total_points: ce.points_possible || ce.exams?.total_points || 100,
        status: ce.status
      }));

      setExams(classExams);

      // Fetch attempts for each exam to build the gradebook
      const studentGrades: Student[] = [];

      for (const member of members) {
        const grades: Record<string, { score: number | null; status: string; attempt_id?: string }> = {};
        let totalScore = 0;
        let totalPossible = 0;
        let gradedCount = 0;

        for (const exam of classExams) {
          // Initialize with no attempt
          grades[exam.exam_id] = { score: null, status: 'not_started' };
        }

        // Fetch attempts for this student in this class
        try {
          const attemptsResponse = await fetch(
            `/api/exams/attempts/list?class_id=${classId}&student_id=${member.user_id}`
          );
          const attemptsData = await attemptsResponse.json();

          if (attemptsData.success && attemptsData.data) {
            for (const attempt of attemptsData.data) {
              if (grades[attempt.exam_id]) {
                grades[attempt.exam_id] = {
                  score: attempt.score,
                  status: attempt.status,
                  attempt_id: attempt.attempt_id
                };

                if (attempt.status === 'completed' && attempt.score !== null) {
                  const examData = classExams.find((e: Exam) => e.exam_id === attempt.exam_id);
                  if (examData) {
                    totalScore += attempt.score;
                    totalPossible += examData.total_points;
                    gradedCount++;
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Error fetching attempts:", error);
        }

        studentGrades.push({
          member_id: member.member_id,
          user_id: member.user_id,
          email: member.email,
          display_name: member.display_name || member.email?.split('@')[0] || 'Student',
          full_name: member.full_name || member.display_name || member.email?.split('@')[0] || 'Student',
          user_email: member.user_email || member.email,
          img_url: member.img_url || null,
          grades,
          average: gradedCount > 0 ? (totalScore / totalPossible) * 100 : null
        });
      }

      setStudents(studentGrades);
    } catch (error) {
      console.error("Failed to fetch gradebook:", error);
      toast.error("Failed to load gradebook");
    } finally {
      setLoading(false);
    }
  };

  const viewAttemptDetails = async (attemptId: string) => {
    setSelectedAttempt(attemptId);
    setLoadingAttempt(true);
    try {
      // For now, just show basic info - you could expand this to show full attempt details
      setAttemptDetails({ attempt_id: attemptId });
    } finally {
      setLoadingAttempt(false);
    }
  };

  const exportGrades = () => {
    // Create CSV content
    const headers = ['Student', 'Email', ...exams.map(e => e.exam_name), 'Average'];
    const rows = filteredStudents.map(student => [
      student.full_name,
      student.user_email,
      ...exams.map(e => {
        const grade = student.grades[e.exam_id];
        if (!grade || grade.status === 'not_started') return '-';
        if (grade.status === 'in_progress') return 'In Progress';
        return grade.score?.toString() || '-';
      }),
      student.average !== null ? `${student.average.toFixed(1)}%` : '-'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${className}-grades.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Grades exported!");
  };

  const getGradeColor = (percentage: number | null) => {
    if (percentage === null) return "text-muted-foreground";
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 80) return "text-blue-600";
    if (percentage >= 70) return "text-yellow-600";
    if (percentage >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'not_started':
        return <XCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const filteredStudents = students
    .filter(student => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        student.full_name?.toLowerCase().includes(searchLower) ||
        student.user_email?.toLowerCase().includes(searchLower) ||
        student.display_name?.toLowerCase().includes(searchLower) ||
        student.email?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.full_name.localeCompare(b.full_name);
      }
      // Sort by average (nulls last)
      if (a.average === null && b.average === null) return 0;
      if (a.average === null) return 1;
      if (b.average === null) return -1;
      return b.average - a.average;
    });

  // Calculate class statistics
  const classStats = {
    totalStudents: students.length,
    averageGrade: students.filter(s => s.average !== null).length > 0
      ? students.reduce((acc, s) => acc + (s.average || 0), 0) /
        students.filter(s => s.average !== null).length
      : null,
    completionRate: exams.length > 0 && students.length > 0
      ? (students.flatMap(s => Object.values(s.grades))
          .filter(g => g.status === 'completed').length /
        (students.length * exams.length)) * 100
      : 0
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      className="p-6 max-w-7xl mx-auto space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
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
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Gradebook</h1>
              <p className="text-sm text-muted-foreground">{className}</p>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={exportGrades}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{classStats.totalStudents}</p>
              <p className="text-sm text-muted-foreground">Students</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className={cn("text-2xl font-bold", getGradeColor(classStats.averageGrade))}>
                {classStats.averageGrade !== null
                  ? `${classStats.averageGrade.toFixed(1)}%`
                  : '-'}
              </p>
              <p className="text-sm text-muted-foreground">Class Average</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{classStats.completionRate.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={(value: "name" | "average") => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="average">Sort by Average</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Gradebook Table */}
      <Card>
        <CardContent className="p-0">
          {students.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No students yet</p>
              <p className="text-sm text-muted-foreground">
                Invite students to see their grades here
              </p>
            </div>
          ) : exams.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No exams assigned</p>
              <p className="text-sm text-muted-foreground">
                Add exams to the class to track grades
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push(`/classes/${classId}/add-exam`)}
              >
                Add Exam
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background min-w-[200px]">Student</TableHead>
                    {exams.map(exam => (
                      <TableHead key={exam.exam_id} className="text-center min-w-[120px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="truncate max-w-[100px]" title={exam.exam_name}>
                            {exam.exam_name}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {exam.total_points} pts
                          </Badge>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center min-w-[100px]">Average</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.member_id}>
                      <TableCell className="sticky left-0 bg-background">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {student.img_url ? (
                              <AvatarImage src={student.img_url} alt={student.full_name} />
                            ) : null}
                            <AvatarFallback>
                              {student.full_name?.[0]?.toUpperCase() || 'S'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{student.full_name}</p>
                            <p className="text-xs text-muted-foreground">{student.user_email}</p>
                          </div>
                        </div>
                      </TableCell>
                      {exams.map(exam => {
                        const grade = student.grades[exam.exam_id];
                        const percentage = grade?.score !== null
                          ? (grade.score / exam.total_points) * 100
                          : null;

                        return (
                          <TableCell key={exam.exam_id} className="text-center">
                            {grade?.status === 'not_started' ? (
                              <span className="text-muted-foreground">-</span>
                            ) : grade?.status === 'in_progress' ? (
                              <Badge variant="outline" className="text-yellow-600">
                                <Clock className="h-3 w-3 mr-1" />
                                In Progress
                              </Badge>
                            ) : (
                              <div className="flex flex-col items-center">
                                <span className={cn("font-medium", getGradeColor(percentage))}>
                                  {grade?.score !== null ? grade.score : '-'}
                                </span>
                                {percentage !== null && (
                                  <span className="text-xs text-muted-foreground">
                                    {percentage.toFixed(0)}%
                                  </span>
                                )}
                                {grade?.attempt_id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 mt-1"
                                    onClick={() => router.push(`/exam/${exam.exam_id}/response?attempt=${grade.attempt_id}`)}
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        <span className={cn("font-bold text-lg", getGradeColor(student.average))}>
                          {student.average !== null ? `${student.average.toFixed(1)}%` : '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
