import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield } from "lucide-react"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "QuizZerd Privacy Policy - Learn how we collect, use, and protect your personal information.",
  openGraph: {
    title: "Privacy Policy | QuizZerd",
    description: "QuizZerd Privacy Policy - Learn how we collect, use, and protect your personal information.",
    type: "website",
  },
}

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-6 md:p-8 lg:p-12">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center space-y-6 py-12 md:py-20">
        <div className="space-y-4 max-w-3xl">
          <Shield className="h-16 w-16 mx-auto text-primary" />
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Privacy <span className="text-primary">Policy</span>
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
            <CardTitle className="text-2xl">1. Introduction</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              QuizZerd ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, disclose, and safeguard your information when you use our 
              education platform and services.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">2. Information We Collect</CardTitle>
            <CardDescription className="text-base leading-relaxed space-y-4">
              <p>We collect information that you provide directly to us, including:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Account Information:</strong> Name, email address, and profile information</li>
                <li><strong>Educational Data:</strong> Classes, exams, assignments, and student responses</li>
                <li><strong>Usage Data:</strong> How you interact with our platform, features used, and activity logs</li>
                <li><strong>Technical Data:</strong> IP address, browser type, device information, and cookies</li>
                <li><strong>Monitoring Data:</strong> Activity during exams including tab switches and other behaviors for academic integrity</li>
              </ul>
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">3. How We Use Your Information</CardTitle>
            <CardDescription className="text-base leading-relaxed space-y-4">
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide, maintain, and improve our services</li>
                <li>Process and manage exams, classes, and assignments</li>
                <li>Monitor academic integrity and detect potential violations</li>
                <li>Send you updates, notifications, and support communications</li>
                <li>Analyze usage patterns to improve user experience</li>
                <li>Ensure security and prevent fraud or abuse</li>
                <li>Comply with legal obligations</li>
              </ul>
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">4. Information Sharing and Disclosure</CardTitle>
            <CardDescription className="text-base leading-relaxed space-y-4">
              <p>We do not sell your personal information. We may share your information in the following circumstances:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>With Instructors:</strong> Class and exam data is shared with authorized instructors</li>
                <li><strong>Service Providers:</strong> With third-party services that help us operate our platform (e.g., hosting, analytics)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>With Consent:</strong> When you explicitly authorize us to share information</li>
              </ul>
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">5. Data Security</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              We implement industry-standard security measures to protect your information, including encryption, 
              secure servers, and access controls. However, no method of transmission over the internet is 100% 
              secure, and we cannot guarantee absolute security.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">6. Your Rights and Choices</CardTitle>
            <CardDescription className="text-base leading-relaxed space-y-4">
              <p>You have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Access and update your personal information</li>
                <li>Delete your account and associated data</li>
                <li>Opt-out of certain communications</li>
                <li>Request a copy of your data</li>
                <li>Object to certain processing activities</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, please contact us at <a href="mailto:privacy@quizzerd.com" className="text-primary hover:underline">privacy@quizzerd.com</a>
              </p>
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">7. Children's Privacy</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Our platform is designed for educational use. If you are under 13 years old, please do not use 
              our services without parental consent. We comply with applicable children's privacy laws including COPPA.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">8. Changes to This Policy</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting 
              the new policy on this page and updating the "Last updated" date. Your continued use of our 
              services after changes constitutes acceptance of the updated policy.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">9. Contact Us</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at:
              <br />
              <a href="mailto:privacy@quizzerd.com" className="text-primary hover:underline">privacy@quizzerd.com</a>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

