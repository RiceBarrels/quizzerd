"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SimpleBarChart, StatRing } from "@/components/ui/simple-bar-chart";
import { CountUp } from "@/hooks/useCountUp";
import {
  FileText,
  Plus,
  Users,
  TrendingUp,
  ArrowRight,
  BookOpen,
  BarChart3,
  GraduationCap,
  ExternalLink,
  CheckCircle,
  Target,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useTransitionRouter } from "next-view-transitions";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const
    }
  }
};

interface DashboardStats {
  exams: {
    total: number;
    published: number;
    draft: number;
  };
  sessions: {
    total: number;
    active: number;
  };
  attempts: {
    total: number;
    completed: number;
    completionRate: number;
  };
  students: {
    total: number;
  };
  performance: {
    averageScore: number;
  };
  chartData: {
    date: string;
    label: string;
    attempts: number;
  }[];
}

interface RecentExam {
  exam_id: string;
  exam_name: string;
  status: string;
  is_public: boolean;
  questions: any[];
  created_at: string;
  updated_at: string;
}

interface RecentSession {
  session_id: string;
  exam_id: string;
  google_course_name: string;
  allowed_emails: string[];
  status: string;
  created_at: string;
  exam?: {
    exam_name: string;
  };
}

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useTransitionRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentExams, setRecentExams] = useState<RecentExam[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      fetchDashboardData();
    }
  }, [isLoaded, user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch stats and recent exams in parallel
      const [statsResponse, examsResponse] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/exams/get?type=my-exams&limit=5')
      ]);

      const [statsData, examsData] = await Promise.all([
        statsResponse.json(),
        examsResponse.json()
      ]);

      if (statsData.success) {
        setStats(statsData.data);
      }

      if (examsData.success) {
        setRecentExams(examsData.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'draft': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'archived': return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  if (!isLoaded) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-primary" />
            <CardTitle>Welcome to QuizZerd</CardTitle>
            <CardDescription>
              Sign in to access your dashboard and manage your exams.
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
    <motion.div
      className="p-6 space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        variants={itemVariants}
      >
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Dashboard
            <motion.span
              initial={{ rotate: 0, scale: 0 }}
              animate={{ rotate: [0, 15, -15, 0], scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Sparkles className="h-6 w-6 text-primary" />
            </motion.span>
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {user.firstName || user.emailAddresses[0]?.emailAddress}!
          </p>
        </div>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button asChild className="shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow">
            <Link href="/exam">
              <Plus className="h-4 w-4 mr-2" />
              Create Exam
            </Link>
          </Button>
        </motion.div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        variants={containerVariants}
      >
        <motion.div variants={cardVariants}>
          <Card className="overflow-hidden relative group hover:shadow-lg transition-shadow duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Exams
              </CardTitle>
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <FileText className="h-4 w-4 text-blue-500" />
              </motion.div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    <CountUp value={stats?.exams.total || 0} duration={1200} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.exams.published || 0} published, {stats?.exams.draft || 0} drafts
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="overflow-hidden relative group hover:shadow-lg transition-shadow duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Sessions
              </CardTitle>
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Users className="h-4 w-4 text-green-500" />
              </motion.div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    <CountUp value={stats?.sessions.active || 0} duration={1200} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.sessions.total || 0} total sessions
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="overflow-hidden relative group hover:shadow-lg transition-shadow duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Students
              </CardTitle>
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <GraduationCap className="h-4 w-4 text-purple-500" />
              </motion.div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    <CountUp value={stats?.students.total || 0} duration={1200} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across all sessions
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants}>
          <Card className="overflow-hidden relative group hover:shadow-lg transition-shadow duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Attempts
              </CardTitle>
              <motion.div
                whileHover={{ rotate: 15, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <BarChart3 className="h-4 w-4 text-orange-500" />
              </motion.div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    <CountUp value={stats?.attempts.total || 0} duration={1200} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.attempts.completed || 0} completed
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Performance Charts */}
      {!loading && stats && (stats.attempts.total > 0 || stats.chartData?.some(d => d.attempts > 0)) && (
        <motion.div
          className="grid gap-6 lg:grid-cols-3"
          variants={containerVariants}
        >
          <motion.div variants={cardVariants} className="lg:col-span-2">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-lg">Attempt Activity</CardTitle>
                <CardDescription>Student attempts over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.chartData && stats.chartData.length > 0 ? (
                  <SimpleBarChart
                    data={stats.chartData.map(d => ({
                      label: d.label,
                      value: d.attempts
                    }))}
                    height={140}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[140px] text-muted-foreground">
                    No activity data yet
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Card className="overflow-hidden h-full">
              <CardHeader>
                <CardTitle className="text-lg">Performance</CardTitle>
                <CardDescription>Overall student metrics</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-around pt-4">
                <StatRing
                  value={stats.attempts.completionRate}
                  label="Completion"
                  size={90}
                />
                <StatRing
                  value={stats.performance.averageScore}
                  label="Avg Score"
                  size={90}
                />
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Main Content Grid */}
      <motion.div
        className="grid gap-6 lg:grid-cols-2"
        variants={containerVariants}
      >
        {/* Recent Exams */}
        <motion.div variants={cardVariants}>
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Exams</CardTitle>
                <CardDescription>Your recently created or updated exams</CardDescription>
              </div>
              <motion.div whileHover={{ x: 3 }} transition={{ type: "spring", stiffness: 400 }}>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/exam">
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </motion.div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : recentExams.length === 0 ? (
                <motion.div
                  className="text-center py-8"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">No exams yet</p>
                  <Button variant="link" asChild className="mt-2">
                    <Link href="/exam">Create your first exam</Link>
                  </Button>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {recentExams.map((exam, index) => (
                    <motion.div
                      key={exam.exam_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.01, x: 4 }}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/exam/${exam.exam_id}/edit`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{exam.exam_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={getStatusColor(exam.status)}>
                            {exam.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {exam.questions?.length || 0} questions
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(exam.updated_at || exam.created_at).toLocaleDateString()}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={cardVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <motion.div whileHover={{ scale: 1.01, x: 4 }} whileTap={{ scale: 0.99 }}>
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4 hover:border-primary/50 transition-colors"
                  onClick={() => router.push('/exam')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Plus className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Create New Exam</p>
                      <p className="text-xs text-muted-foreground">Start from scratch or import from Google Forms</p>
                    </div>
                  </div>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.01, x: 4 }} whileTap={{ scale: 0.99 }}>
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4 hover:border-blue-500/50 transition-colors"
                  onClick={() => router.push('/exam?tab=public')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <BookOpen className="h-5 w-5 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Browse Public Exams</p>
                      <p className="text-xs text-muted-foreground">Explore exams shared by others</p>
                    </div>
                  </div>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.01, x: 4 }} whileTap={{ scale: 0.99 }}>
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4 hover:border-green-500/50 transition-colors"
                  onClick={() => router.push('/exam?tab=my-exams')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <FileText className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Manage My Exams</p>
                      <p className="text-xs text-muted-foreground">Edit, publish, or archive your exams</p>
                    </div>
                  </div>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.01, x: 4 }} whileTap={{ scale: 0.99 }}>
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4 hover:border-orange-500/50 transition-colors"
                  asChild
                >
                  <a href="https://classroom.google.com" target="_blank" rel="noopener noreferrer">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-500/10">
                        <GraduationCap className="h-5 w-5 text-orange-500" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-medium">Google Classroom</p>
                        <p className="text-xs text-muted-foreground">Open Google Classroom</p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </a>
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Getting Started Guide for new users */}
      {!loading && recentExams.length === 0 && (
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <GraduationCap className="h-5 w-5" />
                </motion.div>
                Getting Started
              </CardTitle>
              <CardDescription>
                Follow these steps to create your first exam
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { step: 1, title: 'Create an Exam', desc: 'Add questions, set time limits, and configure settings' },
                  { step: 2, title: 'Publish to Classroom', desc: 'Share with your Google Classroom students' },
                  { step: 3, title: 'Track Progress', desc: 'Monitor attempts and view analytics' }
                ].map((item, index) => (
                  <motion.div
                    key={item.step}
                    className="flex gap-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.15 }}
                  >
                    <motion.div
                      className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-lg shadow-primary/30"
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      {item.step}
                    </motion.div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
