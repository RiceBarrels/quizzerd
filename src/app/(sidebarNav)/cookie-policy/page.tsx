import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Cookie } from "lucide-react"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "QuizZerd Cookie Policy - Learn about how we use cookies and similar technologies on our platform.",
  openGraph: {
    title: "Cookie Policy | QuizZerd",
    description: "QuizZerd Cookie Policy - Learn about how we use cookies and similar technologies on our platform.",
    type: "website",
  },
}

export default function CookiePolicyPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-6 md:p-8 lg:p-12">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center space-y-6 py-12 md:py-20">
        <div className="space-y-4 max-w-3xl">
          <Cookie className="h-16 w-16 mx-auto text-primary" />
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Cookie <span className="text-primary">Policy</span>
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
            <CardTitle className="text-2xl">1. What Are Cookies?</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Cookies are small text files that are placed on your device when you visit a website. 
              They are widely used to make websites work more efficiently and provide information to 
              the website owners. Cookies allow websites to remember your preferences and improve your 
              browsing experience.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">2. How We Use Cookies</CardTitle>
            <CardDescription className="text-base leading-relaxed space-y-4">
              <p>QuizZerd uses cookies and similar technologies for the following purposes:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Essential Cookies:</strong> Required for the Service to function properly, including authentication and security</li>
                <li><strong>Functional Cookies:</strong> Remember your preferences and settings to enhance your experience</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our platform to improve performance</li>
                <li><strong>Performance Cookies:</strong> Monitor and improve website performance and speed</li>
              </ul>
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">3. Types of Cookies We Use</CardTitle>
            <CardDescription className="text-base leading-relaxed space-y-4">
              <p><strong>Session Cookies:</strong> Temporary cookies that are deleted when you close your browser. 
              These are essential for maintaining your session and security.</p>
              <p><strong>Persistent Cookies:</strong> Remain on your device for a set period or until you delete them. 
              These help us remember your preferences and improve your experience.</p>
              <p><strong>First-Party Cookies:</strong> Set directly by QuizZerd on our domain.</p>
              <p><strong>Third-Party Cookies:</strong> Set by third-party services we use, such as analytics providers.</p>
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">4. Specific Cookies We Use</CardTitle>
            <CardDescription className="text-base leading-relaxed space-y-4">
              <p>We use the following types of cookies:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Authentication Cookies:</strong> To keep you logged in and maintain your session</li>
                <li><strong>Preference Cookies:</strong> To remember your settings, theme preferences, and language choices</li>
                <li><strong>Security Cookies:</strong> To protect against fraud and ensure account security</li>
                <li><strong>Analytics Cookies:</strong> To analyze usage patterns and improve our Service</li>
                <li><strong>Performance Cookies:</strong> To monitor and optimize website performance</li>
              </ul>
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">5. Third-Party Cookies</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Some cookies are placed by third-party services that appear on our pages. These may include 
              analytics services, authentication providers, and other service integrations. We do not control 
              these third-party cookies, and you should review their respective privacy policies.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">6. Managing Cookies</CardTitle>
            <CardDescription className="text-base leading-relaxed space-y-4">
              <p>You have control over cookies. You can:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Adjust your browser settings to refuse or delete cookies</li>
                <li>Use browser extensions to block cookies</li>
                <li>Delete cookies that are already stored on your device</li>
              </ul>
              <p className="mt-4">
                <strong>Note:</strong> Disabling certain cookies may affect the functionality of the Service. 
                Essential cookies are required for the Service to work properly, and disabling them may 
                prevent you from using certain features.
              </p>
              <p className="mt-4">
                Instructions for managing cookies in popular browsers:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
                <li>Chrome: Settings → Privacy and Security → Cookies and other site data</li>
                <li>Firefox: Options → Privacy & Security → Cookies and Site Data</li>
                <li>Safari: Preferences → Privacy → Cookies and website data</li>
                <li>Edge: Settings → Privacy, search, and services → Cookies and site permissions</li>
              </ul>
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">7. Local Storage and Similar Technologies</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              In addition to cookies, we may use other similar technologies such as local storage, session 
              storage, and web beacons. These technologies serve similar purposes to cookies and are used 
              to enhance your experience and provide functionality on our platform.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">8. Updates to This Policy</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              We may update this Cookie Policy from time to time to reflect changes in our practices or 
              for other operational, legal, or regulatory reasons. We will notify you of any material 
              changes by posting the updated policy on this page.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <CardTitle className="text-2xl">9. Contact Us</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              If you have questions about our use of cookies, please contact us at:
              <br />
              <a href="mailto:privacy@quizzerd.com" className="text-primary hover:underline">privacy@quizzerd.com</a>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

