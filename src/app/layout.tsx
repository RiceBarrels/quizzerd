import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import { Geist, Geist_Mono } from "next/font/google";
import { ViewTransitions } from 'next-view-transitions';
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { CompactModeProvider } from "@/components/compact-mode-provider"
import { shadcn } from '@clerk/themes';
import { ReactNode } from 'react';
import DevGate from '@/components/DevGate';
import { NavigationProgress } from '@/components/navigation-progress';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: "QuizZerd - The Next Generation Education Platform",
    template: "%s | QuizZerd"
  },
  description: "Create, manage, and take exams with advanced monitoring. Import from Google Forms, track student progress, and ensure academic integrity with real-time cheating detection.",
  keywords: [
    "online exams",
    "quiz platform",
    "education technology",
    "exam management",
    "online assessment",
    "quiz creator",
    "academic integrity",
    "cheating detection",
    "Google Forms import",
    "class management",
    "student assessment",
    "exam monitoring"
  ],
  authors: [{ name: "QuizZerd" }],
  creator: "QuizZerd",
  publisher: "QuizZerd",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://quizzerd.com')
  ),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "QuizZerd",
    title: "QuizZerd - The Next Generation Education Platform",
    description: "Create, manage, and take exams with advanced monitoring. Import from Google Forms, track student progress, and ensure academic integrity.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "QuizZerd - Education Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "QuizZerd - The Next Generation Education Platform",
    description: "Create, manage, and take exams with advanced monitoring. Import from Google Forms, track student progress, and ensure academic integrity.",
    images: ["/og-image.png"],
    creator: "@quizzerd",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes here when available
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export interface ComponentProps {
  children?: ReactNode;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
}


export interface PageParams {
  examId: string;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
        appearance={{
          baseTheme: [shadcn],
        }}
      >
      <ViewTransitions>
        <html lang="en" suppressHydrationWarning>
          <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased cursor-default `}
          >

            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <NavigationProgress />
              <CompactModeProvider>
                <DevGate isActive={false}>
                  {children}
                </DevGate>
              </CompactModeProvider>
            </ThemeProvider>
          </body>
        </html>
      </ViewTransitions>
    </ClerkProvider>
  );
}
