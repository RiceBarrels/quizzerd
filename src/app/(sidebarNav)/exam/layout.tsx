import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Exams",
  description: "Browse, create, and manage exams on QuizZerd. Import from Google Forms, create custom exams with multiple question types, and track student performance.",
  openGraph: {
    title: "Exams - QuizZerd",
    description: "Browse, create, and manage exams on QuizZerd. Import from Google Forms, create custom exams with multiple question types.",
    type: "website",
  },
}

export default function ExamLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

