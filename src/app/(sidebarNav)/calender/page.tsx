"use client"

import { useEffect, useState } from "react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, Clock, FileText } from "lucide-react"
import { format } from "date-fns"
import type { Exam } from "@/types/exam"
import Link from "next/link"

interface ExamWithDates extends Exam {
  start_date: string | null
  end_date: string | null
}

export default function CalendarPage() {
  const [exams, setExams] = useState<ExamWithDates[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExams()
  }, [])

  const fetchExams = async () => {
    try {
      const response = await fetch("/api/exams/get")
      if (response.ok) {
        const data = await response.json()
        setExams(data.exams || [])
      }
    } catch (error) {
      console.error("Error fetching exams:", error)
    } finally {
      setLoading(false)
    }
  }

  // Get exams for a specific date
  const getExamsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    return exams.filter((exam) => {
      if (!exam.start_date && !exam.end_date) return false
      
      const startDate = exam.start_date ? format(new Date(exam.start_date), "yyyy-MM-dd") : null
      const endDate = exam.end_date ? format(new Date(exam.end_date), "yyyy-MM-dd") : null
      
      // Check if date falls within exam date range
      if (startDate && endDate) {
        return dateStr >= startDate && dateStr <= endDate
      } else if (startDate) {
        return dateStr === startDate
      } else if (endDate) {
        return dateStr === endDate
      }
      return false
    })
  }

  // Get dates that have exams
  const getDatesWithExams = () => {
    const dates = new Set<string>()
    exams.forEach((exam) => {
      if (exam.start_date) {
        dates.add(format(new Date(exam.start_date), "yyyy-MM-dd"))
      }
      if (exam.end_date) {
        dates.add(format(new Date(exam.end_date), "yyyy-MM-dd"))
      }
    })
    return dates
  }

  const datesWithExams = getDatesWithExams()
  const selectedDateExams = selectedDate ? getExamsForDate(selectedDate) : []

  // Custom day modifier for calendar
  const isExamDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd")
    return datesWithExams.has(dateStr)
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-4rem)] p-6 md:p-8 lg:p-12">
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-6 md:p-8 lg:p-12">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center space-y-6 py-8 md:py-12">
        <div className="space-y-4 max-w-3xl">
          <CalendarIcon className="h-12 w-12 mx-auto text-primary" />
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Exam <span className="text-primary">Calendar</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            View and manage your scheduled exams
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full space-y-8 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          {/* Calendar */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
              <CardDescription>
                Dates with scheduled exams are highlighted
              </CardDescription>
            </CardHeader>
            <div className="p-6 flex flex-col items-center gap-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                  hasExam: isExamDate,
                }}
                className="rounded-md border"
              />
              {datesWithExams.size > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  <span className="inline-block w-2 h-2 rounded-full bg-primary mr-2"></span>
                  Dates with scheduled exams
                </p>
              )}
            </div>
          </Card>

          {/* Selected Date Exams */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle>
                {selectedDate
                  ? `Exams on ${format(selectedDate, "MMMM d, yyyy")}`
                  : "Select a date"}
              </CardTitle>
              <CardDescription>
                {selectedDateExams.length > 0
                  ? `${selectedDateExams.length} exam(s) scheduled`
                  : "No exams scheduled for this date"}
              </CardDescription>
            </CardHeader>
            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
              {selectedDateExams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No exams scheduled for this date</p>
                </div>
              ) : (
                selectedDateExams.map((exam) => (
                  <Card key={exam.exam_id} className="border hover:border-primary/50 transition-colors">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">
                            <Link
                              href={`/exam/${exam.exam_id}`}
                              className="hover:text-primary transition-colors"
                            >
                              {exam.exam_name}
                            </Link>
                          </CardTitle>
                          {exam.exam_description && (
                            <CardDescription className="line-clamp-2">
                              {exam.exam_description}
                            </CardDescription>
                          )}
                        </div>
                        <Badge variant={exam.status === "published" ? "default" : "secondary"}>
                          {exam.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <div className="px-6 pb-4 space-y-2">
                      {exam.start_date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarIcon className="h-4 w-4" />
                          <span>
                            Starts: {format(new Date(exam.start_date), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                      )}
                      {exam.end_date && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarIcon className="h-4 w-4" />
                          <span>
                            Ends: {format(new Date(exam.end_date), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                      )}
                      {exam.duration_minutes && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Duration: {exam.duration_minutes} minutes</span>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Upcoming Exams Summary */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Upcoming Exams</CardTitle>
            <CardDescription>
              Exams scheduled in the next 30 days
            </CardDescription>
          </CardHeader>
          <div className="p-6">
            {exams.filter((exam) => {
              if (!exam.start_date) return false
              const examDate = new Date(exam.start_date)
              const today = new Date()
              const thirtyDaysFromNow = new Date()
              thirtyDaysFromNow.setDate(today.getDate() + 30)
              return examDate >= today && examDate <= thirtyDaysFromNow
            }).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No upcoming exams in the next 30 days</p>
              </div>
            ) : (
              <div className="space-y-3">
                {exams
                  .filter((exam) => {
                    if (!exam.start_date) return false
                    const examDate = new Date(exam.start_date)
                    const today = new Date()
                    const thirtyDaysFromNow = new Date()
                    thirtyDaysFromNow.setDate(today.getDate() + 30)
                    return examDate >= today && examDate <= thirtyDaysFromNow
                  })
                  .sort((a, b) => {
                    const dateA = a.start_date ? new Date(a.start_date).getTime() : 0
                    const dateB = b.start_date ? new Date(b.start_date).getTime() : 0
                    return dateA - dateB
                  })
                  .map((exam) => (
                    <div
                      key={exam.exam_id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <Link
                          href={`/exam/${exam.exam_id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {exam.exam_name}
                        </Link>
                        {exam.start_date && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(exam.start_date), "MMMM d, yyyy 'at' h:mm a")}
                          </p>
                        )}
                      </div>
                      <Badge variant={exam.status === "published" ? "default" : "secondary"}>
                        {exam.status}
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
