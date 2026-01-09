import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { 
  BookOpen, 
  GraduationCap, 
  FileText, 
  Settings, 
  Shield, 
  Users,
  HelpCircle,
  MessageCircle,
  Mail
} from "lucide-react"
import Link from "next/link"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Help Center",
  description: "Get help with QuizZerd - Find answers to common questions, learn how to use features, and get support.",
  openGraph: {
    title: "Help Center | QuizZerd",
    description: "Get help with QuizZerd - Find answers to common questions, learn how to use features, and get support.",
    type: "website",
  },
}

export default function HelpPage() {
  const faqCategories = [
    {
      title: "Getting Started",
      icon: BookOpen,
      questions: [
        {
          q: "How do I create my first exam?",
          a: "Navigate to the Exams page and click 'Create Exam'. You can start from scratch or import an existing Google Form. Fill in the exam details, add questions, and configure settings before publishing."
        },
        {
          q: "How do I join an exam?",
          a: "You can join an exam by entering the exam code provided by your instructor. Use the 'Join' button and enter the exam code to access it."
        },
        {
          q: "Can I import questions from Google Forms?",
          a: "Yes! QuizZerd supports importing quizzes directly from Google Forms. Go to the Exams page, click 'Import from Google Forms', and follow the prompts to connect your Google account and select a form."
        }
      ]
    },
    {
      title: "Exam Management",
      icon: FileText,
      questions: [
        {
          q: "What question types are supported?",
          a: "QuizZerd supports multiple question types including text responses, multiple choice, checkboxes, and code editor questions with syntax highlighting."
        },
        {
          q: "How do I preview an exam before publishing?",
          a: "Use the Preview mode available in the exam editor. This allows you to experience the exam exactly as students will see it, helping you catch any issues before publishing."
        },
        {
          q: "Can I edit an exam after publishing?",
          a: "Yes, you can edit exams after publishing. However, be aware that changes may affect students who have already started or completed the exam. Use caution when editing published exams."
        },
        {
          q: "How do I set time limits for exams?",
          a: "When creating or editing an exam, you can set time limits in the exam settings. You can set an overall time limit for the entire exam."
        }
      ]
    },
    {
      title: "Google Classroom",
      icon: GraduationCap,
      questions: [
        {
          q: "How do I publish exams to Google Classroom?",
          a: "When editing an exam, click 'Publish' and select 'Google Classroom'. Choose the course you want to publish to and set the due date. The exam will appear as an assignment in your Google Classroom."
        },
        {
          q: "What permissions are needed for Google Classroom?",
          a: "You need to connect your Google account with Classroom permissions. Make sure you are a teacher in the course you want to publish to."
        },
        {
          q: "Can students access exams through Google Classroom?",
          a: "Yes! Once published, students can click on the assignment in Google Classroom to access the exam directly."
        }
      ]
    },
    {
      title: "Monitoring & Security",
      icon: Shield,
      questions: [
        {
          q: "How does cheating detection work?",
          a: "QuizZerd monitors various activities during exams including tab switching, copy-paste attempts, and other suspicious behaviors. Violations are logged and can be reviewed after the exam."
        },
        {
          q: "What violations are tracked?",
          a: "The system tracks tab switching, copy-paste attempts, and other activities that may indicate academic dishonesty. All violations are timestamped and logged for review."
        },
        {
          q: "Can students see their violation logs?",
          a: "Violation logs are typically only visible to instructors and administrators. Students may be notified of violations depending on your settings."
        }
      ]
    },
    {
      title: "Account & Settings",
      icon: Settings,
      questions: [
        {
          q: "How do I update my profile?",
          a: "Click on your profile icon in the toolbar and select 'Profile' to update your account information, preferences, and settings."
        },
        {
          q: "How do I connect my Google account?",
          a: "To import Google Forms, you'll need to connect your Google account. This is done through the Google Forms import feature, which will prompt you to authenticate."
        },
        {
          q: "Can I change my account settings?",
          a: "Yes, you can access account settings through your profile menu. Here you can update preferences, notification settings, and other account-related options."
        }
      ]
    }
  ]

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-6 md:p-8 lg:p-12">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center space-y-6 py-12 md:py-20">
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Help <span className="text-primary">Center</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            Find answers to your questions and learn how to make the most of QuizZerd
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="max-w-6xl mx-auto w-full py-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-12">
          <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer">
            <Link href="/features">
              <CardHeader className="text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                <CardTitle className="text-sm">Features</CardTitle>
              </CardHeader>
            </Link>
          </Card>
          <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer">
            <Link href="/about">
              <CardHeader className="text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <CardTitle className="text-sm">About Us</CardTitle>
              </CardHeader>
            </Link>
          </Card>
          <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer">
            <Link href="/contact">
              <CardHeader className="text-center">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
                <CardTitle className="text-sm">Contact</CardTitle>
              </CardHeader>
            </Link>
          </Card>
          <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer">
            <Link href="/terms">
              <CardHeader className="text-center">
                <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
                <CardTitle className="text-sm">Terms</CardTitle>
              </CardHeader>
            </Link>
          </Card>
        </div>

        {/* FAQ Sections */}
        <div className="space-y-8">
          {faqCategories.map((category, catIndex) => {
            const Icon = category.icon
            return (
              <Card key={catIndex} className="border-2">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-4">
                    <Icon className="h-8 w-8 text-primary" />
                    <CardTitle className="text-2xl">{category.title}</CardTitle>
                  </div>
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((item, qIndex) => (
                      <AccordionItem key={qIndex} value={`item-${catIndex}-${qIndex}`}>
                        <AccordionTrigger className="text-left">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground leading-relaxed">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardHeader>
              </Card>
            )
          })}
        </div>

        {/* Contact Support */}
        <Card className="border-2 border-primary/20 bg-primary/5 mt-12">
          <CardHeader className="text-center space-y-4">
            <HelpCircle className="h-12 w-12 mx-auto text-primary" />
            <CardTitle className="text-2xl">Still Need Help?</CardTitle>
            <CardDescription className="text-base">
              Can't find what you're looking for? Our support team is here to help. 
              Visit our <Link href="/contact" className="text-primary hover:underline">Contact</Link> page to get in touch.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

