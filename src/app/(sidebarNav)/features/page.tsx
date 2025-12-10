import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  FileText, 
  Users, 
  Shield, 
  Eye, 
  Code, 
  Import, 
  BarChart3, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Settings
} from "lucide-react"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Features",
  description: "Discover all the powerful features QuizZerd offers for creating, managing, and monitoring online exams and assessments.",
  openGraph: {
    title: "Features | QuizZerd",
    description: "Discover all the powerful features QuizZerd offers for creating, managing, and monitoring online exams and assessments.",
    type: "website",
  },
}

export default function FeaturesPage() {
  const features = [
    {
      icon: FileText,
      title: "Advanced Exam Creation",
      description: "Create comprehensive exams with multiple question types including text responses, multiple choice, checkboxes, and code editors with syntax highlighting."
    },
    {
      icon: Import,
      title: "Google Forms Import",
      description: "Seamlessly import your existing Google Forms quizzes and convert them to QuizZerd format with a single click."
    },
    {
      icon: Eye,
      title: "Real-time Monitoring",
      description: "Monitor student activity in real-time with advanced cheating detection including tab switching, copy-paste detection, and activity tracking."
    },
    {
      icon: Shield,
      title: "Academic Integrity",
      description: "Ensure academic integrity with comprehensive monitoring tools that track violations and suspicious behavior during exams."
    },
    {
      icon: Users,
      title: "Class Management",
      description: "Organize students into classes, manage memberships, track assignments, and monitor progress across multiple classes."
    },
    {
      icon: Code,
      title: "Code Editor Support",
      description: "Built-in code editor with syntax highlighting for programming questions, supporting multiple programming languages."
    },
    {
      icon: BarChart3,
      title: "Progress Tracking",
      description: "Track student progress, view exam responses, and analyze performance with detailed analytics and reporting."
    },
    {
      icon: Clock,
      title: "Time Management",
      description: "Set time limits for exams, track time spent on each question, and manage exam schedules efficiently."
    },
    {
      icon: CheckCircle2,
      title: "Auto-grading",
      description: "Automatically grade multiple choice and checkbox questions, with manual grading support for text and code responses."
    },
    {
      icon: AlertTriangle,
      title: "Violation Logging",
      description: "Automatically log and track violations such as tab switching, copy-paste attempts, and other suspicious activities."
    },
    {
      icon: Calendar,
      title: "Exam Scheduling",
      description: "Schedule exams, set availability windows, and manage exam calendars for better organization."
    },
    {
      icon: Settings,
      title: "Customizable Settings",
      description: "Customize exam settings, question types, grading rubrics, and monitoring preferences to fit your needs."
    }
  ]

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-6 md:p-8 lg:p-12">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center space-y-6 py-12 md:py-20">
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Powerful <span className="text-primary">Features</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            Everything you need to create, manage, and monitor online assessments
          </p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto w-full py-12">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <Icon className="h-10 w-10 mb-2 text-primary" />
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription className="leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      {/* CTA Section */}
      <div className="max-w-4xl mx-auto w-full mt-12 pb-12">
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader className="text-center space-y-4">
            <CardTitle className="text-2xl">Ready to Get Started?</CardTitle>
            <CardDescription className="text-base">
              Start creating your first exam or explore our platform to see all these features in action.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

