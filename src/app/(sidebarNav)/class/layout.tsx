import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Classes",
  description: "Manage your classes on QuizZerd. Organize students, track progress, assign exams, and collaborate with teachers and administrators.",
  openGraph: {
    title: "Classes - QuizZerd",
    description: "Manage your classes on QuizZerd. Organize students, track progress, and assign exams.",
    type: "website",
  },
}

export default function ClassLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

