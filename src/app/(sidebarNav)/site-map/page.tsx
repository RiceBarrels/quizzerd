import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Map } from "lucide-react"
import Link from "next/link"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Sitemap",
  description: "QuizZerd Sitemap - Find all pages and sections of our education platform.",
  openGraph: {
    title: "Sitemap | QuizZerd",
    description: "QuizZerd Sitemap - Find all pages and sections of our education platform.",
    type: "website",
  },
}

export default function SitemapPage() {
  const mainPages = [
    { href: "/", title: "Home", description: "Welcome page and platform overview" },
    { href: "/exam", title: "Exams", description: "Create, manage, and view exams" },
    { href: "/calender", title: "Calendar", description: "View exam schedules and events" },
    { href: "/todos", title: "Todos", description: "Manage your tasks and assignments" },
  ]

  const resourcePages = [
    { href: "/about", title: "About Us", description: "Learn about QuizZerd" },
    { href: "/features", title: "Features", description: "Explore platform features" },
    { href: "/help", title: "Help Center", description: "FAQs and support resources" },
    { href: "/contact", title: "Contact", description: "Get in touch with us" },
  ]

  const legalPages = [
    { href: "/privacy", title: "Privacy Policy", description: "How we protect your data" },
    { href: "/terms", title: "Terms of Service", description: "Terms and conditions" },
    { href: "/cookie-policy", title: "Cookie Policy", description: "Our cookie usage policy" },
  ]

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-6 md:p-8 lg:p-12">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center space-y-6 py-12 md:py-20">
        <div className="space-y-4 max-w-3xl">
          <Map className="h-16 w-16 mx-auto text-primary" />
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Site<span className="text-primary">map</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            Navigate through all pages and sections of QuizZerd
          </p>
        </div>
      </div>

      {/* Sitemap Content */}
      <div className="max-w-4xl mx-auto w-full space-y-8 py-12">
        {/* Main Pages */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-2xl mb-4">Main Pages</CardTitle>
            <div className="space-y-3">
              {mainPages.map((page) => (
                <div key={page.href} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b last:border-0">
                  <div>
                    <Link 
                      href={page.href} 
                      className="text-primary hover:underline font-medium text-lg"
                    >
                      {page.title}
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1">{page.description}</p>
                  </div>
                  <Link 
                    href={page.href}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {page.href}
                  </Link>
                </div>
              ))}
            </div>
          </CardHeader>
        </Card>

        {/* Resource Pages */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-2xl mb-4">Resources</CardTitle>
            <div className="space-y-3">
              {resourcePages.map((page) => (
                <div key={page.href} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b last:border-0">
                  <div>
                    <Link 
                      href={page.href} 
                      className="text-primary hover:underline font-medium text-lg"
                    >
                      {page.title}
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1">{page.description}</p>
                  </div>
                  <Link 
                    href={page.href}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {page.href}
                  </Link>
                </div>
              ))}
            </div>
          </CardHeader>
        </Card>

        {/* Legal Pages */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-2xl mb-4">Legal & Policies</CardTitle>
            <div className="space-y-3">
              {legalPages.map((page) => (
                <div key={page.href} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b last:border-0">
                  <div>
                    <Link 
                      href={page.href} 
                      className="text-primary hover:underline font-medium text-lg"
                    >
                      {page.title}
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1">{page.description}</p>
                  </div>
                  <Link 
                    href={page.href}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {page.href}
                  </Link>
                </div>
              ))}
            </div>
          </CardHeader>
        </Card>

        {/* Additional Info */}
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-xl">XML Sitemap</CardTitle>
            <CardDescription className="leading-relaxed">
              For search engines, our XML sitemap is available at{" "}
              <a href="/sitemap.xml" className="text-primary hover:underline">/sitemap.xml</a>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

