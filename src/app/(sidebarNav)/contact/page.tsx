import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, MessageCircle, HelpCircle, Send } from "lucide-react"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with QuizZerd - Contact our support team, send feedback, or ask questions about our platform.",
  openGraph: {
    title: "Contact | QuizZerd",
    description: "Get in touch with QuizZerd - Contact our support team, send feedback, or ask questions about our platform.",
    type: "website",
  },
}

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-6 md:p-8 lg:p-12">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center space-y-6 py-12 md:py-20">
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Get in <span className="text-primary">Touch</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            We're here to help! Reach out with questions, feedback, or support requests
          </p>
        </div>
      </div>

      {/* Contact Options */}
      <div className="max-w-4xl mx-auto w-full space-y-8 py-12">
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <Mail className="h-10 w-10 mb-4 text-primary" />
              <CardTitle>Email Support</CardTitle>
              <CardDescription className="leading-relaxed">
                Send us an email and we'll get back to you as soon as possible. 
                For general inquiries, support, or feedback, email us at:
              </CardDescription>
              <div className="mt-4">
                <a 
                  href="mailto:support@quizzerd.com" 
                  className="text-primary hover:underline font-medium"
                >
                  support@quizzerd.com
                </a>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <HelpCircle className="h-10 w-10 mb-4 text-primary" />
              <CardTitle>Help Center</CardTitle>
              <CardDescription className="leading-relaxed">
                Looking for answers to common questions? Check out our comprehensive 
                Help Center with FAQs and guides.
              </CardDescription>
              <div className="mt-4">
                <a 
                  href="/help" 
                  className="text-primary hover:underline font-medium"
                >
                  Visit Help Center →
                </a>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <MessageCircle className="h-10 w-10 mb-4 text-primary" />
              <CardTitle>Feature Requests</CardTitle>
              <CardDescription className="leading-relaxed">
                Have an idea for a new feature? We'd love to hear about it! 
                Send us your suggestions and feedback.
              </CardDescription>
              <div className="mt-4">
                <a 
                  href="mailto:feedback@quizzerd.com" 
                  className="text-primary hover:underline font-medium"
                >
                  feedback@quizzerd.com
                </a>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <Send className="h-10 w-10 mb-4 text-primary" />
              <CardTitle>Technical Support</CardTitle>
              <CardDescription className="leading-relaxed">
                Experiencing technical issues? Our technical support team is ready 
                to help resolve any problems you encounter.
              </CardDescription>
              <div className="mt-4">
                <a 
                  href="mailto:tech@quizzerd.com" 
                  className="text-primary hover:underline font-medium"
                >
                  tech@quizzerd.com
                </a>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Response Time Info */}
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-xl">Response Times</CardTitle>
            <CardDescription className="leading-relaxed space-y-2">
              <p>
                We aim to respond to all inquiries within 24-48 hours during business days. 
                For urgent technical issues, please mark your email as "Urgent" in the subject line.
              </p>
              <p className="text-sm mt-4">
                <strong>Business Hours:</strong> Monday - Friday, 9:00 AM - 5:00 PM EST
              </p>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Additional Resources */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-xl">Additional Resources</CardTitle>
            <CardDescription className="leading-relaxed space-y-2">
              <p>Before contacting us, you might find these resources helpful:</p>
              <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                <li><a href="/help" className="text-primary hover:underline">Help Center & FAQs</a></li>
                <li><a href="/features" className="text-primary hover:underline">Features Documentation</a></li>
                <li><a href="/about" className="text-primary hover:underline">About QuizZerd</a></li>
                <li><a href="/terms" className="text-primary hover:underline">Terms of Service</a></li>
                <li><a href="/privacy" className="text-primary hover:underline">Privacy Policy</a></li>
              </ul>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

