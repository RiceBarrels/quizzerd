import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { GraduationCap, Users, Shield, Zap, Target, Heart } from "lucide-react"
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about QuizZerd - Our mission, vision, and commitment to revolutionizing online education and assessment.",
  openGraph: {
    title: "About Us | QuizZerd",
    description: "Learn about QuizZerd - Our mission, vision, and commitment to revolutionizing online education and assessment.",
    type: "website",
  },
}

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] p-6 md:p-8 lg:p-12">
      {/* Hero Section */}
      <div className="flex flex-col items-center text-center space-y-6 py-12 md:py-20">
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            About <span className="text-primary">QuizZerd</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground">
            Revolutionizing online education with advanced assessment tools and monitoring capabilities
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <div className="max-w-4xl mx-auto w-full space-y-12 py-12">
        <Card className="border-2">
          <CardHeader className="space-y-4">
            <Target className="h-12 w-12 text-primary" />
            <CardTitle className="text-3xl">Our Mission</CardTitle>
            <CardDescription className="text-lg leading-relaxed">
              At QuizZerd, we're dedicated to providing educators and institutions with powerful, 
              intuitive tools for creating, managing, and monitoring online assessments. We believe 
              that technology should enhance the learning experience while maintaining academic integrity 
              and providing valuable insights into student performance.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="border-2">
          <CardHeader className="space-y-4">
            <Zap className="h-12 w-12 text-primary" />
            <CardTitle className="text-3xl">What We Do</CardTitle>
            <CardDescription className="text-lg leading-relaxed space-y-4">
              <p>
                QuizZerd is a comprehensive education platform that empowers educators to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Create sophisticated exams with multiple question types including code editors, multiple choice, and text responses</li>
                <li>Import existing quizzes from Google Forms seamlessly</li>
                <li>Monitor student activity in real-time with advanced cheating detection</li>
                <li>Manage classes and track student progress efficiently</li>
                <li>Ensure academic integrity through comprehensive monitoring tools</li>
              </ul>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Values Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-12">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <Shield className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Security First</CardTitle>
              <CardDescription>
                We prioritize the security and privacy of all user data, ensuring your information 
                and assessments are protected with industry-standard encryption and security measures.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <Users className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>User-Centric</CardTitle>
              <CardDescription>
                Our platform is designed with educators and students in mind, providing intuitive 
                interfaces and powerful features that enhance the learning experience.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <GraduationCap className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Education Focused</CardTitle>
              <CardDescription>
                Every feature we build is centered around improving educational outcomes and 
                making assessment more effective and meaningful.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <Zap className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Innovation</CardTitle>
              <CardDescription>
                We continuously innovate to stay ahead of educational technology trends, 
                bringing you cutting-edge features and capabilities.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <Heart className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Accessibility</CardTitle>
              <CardDescription>
                We believe education should be accessible to everyone. Our platform is designed 
                to be inclusive and usable by educators and students of all technical skill levels.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <Target className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Reliability</CardTitle>
              <CardDescription>
                Count on QuizZerd for consistent, reliable performance when you need it most. 
                We maintain high uptime and fast response times for all users.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Contact CTA */}
        <Card className="border-2 border-primary/20 bg-primary/5 mt-12">
          <CardHeader className="text-center space-y-4">
            <CardTitle className="text-2xl">Get in Touch</CardTitle>
            <CardDescription className="text-base">
              Have questions or feedback? We'd love to hear from you. 
              Visit our <a href="/contact" className="text-primary hover:underline">Contact</a> page to reach out.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}

