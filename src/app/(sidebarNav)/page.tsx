import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, GraduationCap, Users, FileText, ArrowRight } from "lucide-react"
import Link from "next/link"
import { currentUser } from "@clerk/nextjs/server"
import type { Metadata } from 'next'
import { OrganizationSchema, WebSiteSchema, SoftwareApplicationSchema } from "@/components/seo/StructuredData"

export const metadata: Metadata = {
  title: "Home",
  description: "Welcome to QuizZerd - Your all-in-one platform for creating, managing, and taking exams with advanced monitoring. Import from Google Forms, track student progress, and ensure academic integrity.",
  openGraph: {
    title: "QuizZerd - The Next Generation Education Platform",
    description: "Create, manage, and take exams with advanced monitoring. Import from Google Forms, track student progress, and ensure academic integrity.",
    type: "website",
  },
}

export default async function IndexPage() {
  const user = await currentUser();

  return (
    <>
      <OrganizationSchema />
      <WebSiteSchema />
      <SoftwareApplicationSchema />
      <div className="flex flex-col min-h-[calc(100vh-4rem)] p-6 md:p-8 lg:p-12">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center space-y-6 py-12 md:py-20">
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Welcome to <span className="text-primary">QuizZerd</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            Your all-in-one platform for creating, managing, and taking exams with advanced monitoring
          </p>
        </div>
        
        <div className="flex flex-wrap gap-4 justify-center pt-4">
          <Button asChild size="lg" className="gap-2">
            <Link href="/exam">
              <FileText className="h-5 w-5" />
              View Exams
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link href="/class">
              <Users className="h-5 w-5" />
              Browse Classes
            </Link>
          </Button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto w-full py-12">
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <GraduationCap className="h-10 w-10 mb-2 text-primary" />
            <CardTitle>Create Exams</CardTitle>
            <CardDescription>
              Build comprehensive exams with multiple question types, code editors, and rich text formatting
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <Users className="h-10 w-10 mb-2 text-primary" />
            <CardTitle>Manage Classes</CardTitle>
            <CardDescription>
              Organize students, track progress, and manage multiple classes with ease
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <BookOpen className="h-10 w-10 mb-2 text-primary" />
            <CardTitle>Import from Google Forms</CardTitle>
            <CardDescription>
              Seamlessly import your existing Google Forms quizzes and convert them to QuizZerd format
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <FileText className="h-10 w-10 mb-2 text-primary" />
            <CardTitle>Real-time Monitoring</CardTitle>
            <CardDescription>
              Advanced cheating detection with tab switching, copy-paste, and activity monitoring
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <BookOpen className="h-10 w-10 mb-2 text-primary" />
            <CardTitle>Preview Mode</CardTitle>
            <CardDescription>
              Test your exams before publishing with a full student experience preview
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <GraduationCap className="h-10 w-10 mb-2 text-primary" />
            <CardTitle>Flexible Responses</CardTitle>
            <CardDescription>
              Support for text, code, multiple choice, checkboxes, and more question types
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Quick Stats */}
      {user && (
        <div className="border-t pt-12 mt-auto">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-semibold">
              Welcome back, {user.firstName}!
            </h2>
            <p className="text-muted-foreground">
              Ready to create or take an exam today?
            </p>
            <div className="flex gap-4 justify-center pt-4">
              <Button asChild variant="default">
                <Link href="/exam">My Exams</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/class">My Classes</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}