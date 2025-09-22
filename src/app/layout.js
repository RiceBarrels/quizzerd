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
import { shadcn } from '@clerk/themes';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "QuizZerd",
  description: "The next education platform.",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
        appearance={{
          baseTheme: [shadcn],
        }}
      >
      <ViewTransitions>
        <html lang="en" suppressHydrationWarning>
          <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          >

            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </body>
        </html>
      </ViewTransitions>
    </ClerkProvider>
  );
}
