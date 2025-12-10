import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText } from "lucide-react"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "QuizZerd Terms of Service - Read our terms and conditions for using our education platform.",
  openGraph: {
    title: "Terms of Service | QuizZerd",
    description: "QuizZerd Terms of Service - Read our terms and conditions for using our education platform.",
    type: "website",
  },
}

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-6 md:p-8 lg:p-12">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center space-y-6 py-12 md:py-20">
        <div className="space-y-4 max-w-3xl">
          <FileText className="h-16 w-16 mx-auto text-primary" />
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Terms of <span className="text-primary">Service</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto w-full space-y-8 py-12">
        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">1. Acceptance of Terms</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              By accessing and using QuizZerd ("the Service"), you accept and agree to be bound by these 
              Terms of Service. If you do not agree to these terms, please do not use our Service.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">2. Description of Service</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              QuizZerd is an online education platform that enables users to create, manage, and take exams 
              and assessments. The Service includes features for class management, exam creation, student 
              monitoring, and academic integrity tools.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">3. User Accounts</CardTitle>
            <CardDescription className="text-base leading-relaxed space-y-4">
              <p>To use certain features of the Service, you must create an account. You agree to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and update your account information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized access</li>
              </ul>
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">4. Acceptable Use</CardTitle>
            <CardDescription className="text-base leading-relaxed space-y-4">
              <p>You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Use the Service for any illegal or unauthorized purpose</li>
                <li>Violate any laws or regulations in your jurisdiction</li>
                <li>Attempt to circumvent security measures or monitoring systems</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Upload malicious code, viruses, or harmful content</li>
                <li>Impersonate others or provide false information</li>
                <li>Engage in academic dishonesty or cheating</li>
                <li>Violate intellectual property rights</li>
                <li>Harass, abuse, or harm other users</li>
              </ul>
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">5. Academic Integrity</CardTitle>
            <CardDescription className="text-base leading-relaxed space-y-4">
              <p>Users are expected to maintain academic integrity when using the Service. This includes:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Completing exams without unauthorized assistance</li>
                <li>Not sharing exam content with unauthorized parties</li>
                <li>Following all exam rules and guidelines</li>
                <li>Respecting intellectual property and copyright</li>
              </ul>
              <p className="mt-4">
                Violations of academic integrity may result in account suspension or termination.
              </p>
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">6. Content and Intellectual Property</CardTitle>
            <CardDescription className="text-base leading-relaxed space-y-4">
              <p><strong>Your Content:</strong> You retain ownership of content you create or upload. By using the Service, 
              you grant us a license to use, store, and display your content as necessary to provide the Service.</p>
              <p className="mt-4"><strong>Our Content:</strong> The Service, including its design, features, and functionality, 
              is owned by QuizZerd and protected by intellectual property laws. You may not copy, modify, or distribute 
              our content without permission.</p>
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">7. Monitoring and Privacy</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              The Service includes monitoring features for academic integrity purposes. By using the Service, 
              you acknowledge and consent to monitoring activities during exams, including tracking of tab 
              switches, copy-paste attempts, and other behaviors. Please review our Privacy Policy for 
              detailed information about data collection and use.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">8. Service Availability</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              We strive to maintain high availability but do not guarantee uninterrupted or error-free service. 
              We may perform maintenance, updates, or modifications that temporarily affect availability. 
              We are not liable for any losses resulting from service interruptions.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">9. Limitation of Liability</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              To the maximum extent permitted by law, QuizZerd shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages, or any loss of profits or revenues, 
              whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">10. Termination</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              We may terminate or suspend your account and access to the Service immediately, without prior 
              notice, for conduct that we believe violates these Terms or is harmful to other users, us, or 
              third parties. You may also terminate your account at any time.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">11. Changes to Terms</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of significant 
              changes. Your continued use of the Service after changes constitutes acceptance of the updated Terms.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">12. Contact Information</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              If you have questions about these Terms of Service, please contact us at:
              <br />
              <a href="mailto:legal@quizzerd.com" className="text-primary hover:underline">legal@quizzerd.com</a>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

