"use client"

import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Home, ArrowLeft, Search, FileText, GraduationCap } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function NotFound() {
  const router = useRouter()
  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-6 md:p-8 lg:p-12">
      <div className="max-w-2xl w-full space-y-8">
        {/* 404 Content */}
        <div className="text-center space-y-4">
          <h1 className="text-8xl md:text-9xl font-bold text-primary/20">404</h1>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Page Not Found
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          <Button asChild size="lg" className="gap-2">
            <Link href="/">
              <Home className="h-5 w-5" />
              Go Home
            </Link>
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="gap-2"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
            Go Back
          </Button>
        </div>

        {/* Quick Links */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Popular Pages</CardTitle>
            <CardDescription>
              Here are some pages you might be looking for:
            </CardDescription>
          </CardHeader>
          <div className="p-6 pt-0">
            <div className="grid gap-4 md:grid-cols-2">
              <Link
                href="/exam"
                className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors group"
              >
                <FileText className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                <div>
                  <p className="font-medium">Exams</p>
                  <p className="text-sm text-muted-foreground">View and manage exams</p>
                </div>
              </Link>
              <Link
                href="/class"
                className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors group"
              >
                <GraduationCap className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                <div>
                  <p className="font-medium">Classes</p>
                  <p className="text-sm text-muted-foreground">Manage your classes</p>
                </div>
              </Link>
              <Link
                href="/help"
                className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors group"
              >
                <Search className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                <div>
                  <p className="font-medium">Help Center</p>
                  <p className="text-sm text-muted-foreground">Find answers and support</p>
                </div>
              </Link>
              <Link
                href="/site-map"
                className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors group"
              >
                <Search className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                <div>
                  <p className="font-medium">Sitemap</p>
                  <p className="text-sm text-muted-foreground">Browse all pages</p>
                </div>
              </Link>
            </div>
          </div>
        </Card>

        {/* Contact Support */}
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardHeader className="text-center">
            <CardTitle>Still Can't Find What You're Looking For?</CardTitle>
            <CardDescription>
              If you believe this is an error, please{" "}
              <Link href="/contact" className="text-primary hover:underline">
                contact our support team
              </Link>
              .
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

