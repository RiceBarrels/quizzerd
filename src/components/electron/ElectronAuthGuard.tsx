"use client"

import { useUser } from "@clerk/nextjs"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState, ReactNode } from "react"

interface ElectronAuthGuardProps {
  children: ReactNode
}

// Public routes that don't require authentication (for SEO and public access)
const PUBLIC_ROUTES = [
  "/welcome",
  "/exam",
  "/about",
  "/help",
  "/features",
  "/contact",
  "/privacy",
  "/terms",
  "/cookie-policy",
  "/site-map",
]

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )
}

export function ElectronAuthGuard({ children }: ElectronAuthGuardProps) {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const [isElectron, setIsElectron] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const electron = window.electronAPI
    if (electron?.isElectron) {
      setIsElectron(true)
    }
    setIsChecking(false)
  }, [])

  useEffect(() => {
    // Only redirect if:
    // 1. We've finished checking Electron status
    // 2. Auth is loaded
    // 3. User is in Electron
    // 4. User is not signed in
    // 5. User is not on a public route
    if (!isChecking && isLoaded && isElectron && !isSignedIn && !isPublicRoute(pathname)) {
      router.push("/welcome")
    }
  }, [isChecking, isLoaded, isElectron, isSignedIn, pathname, router])

  // Show nothing while checking (prevents flash)
  if (isChecking || !isLoaded) {
    return null
  }

  // If in Electron and not signed in and not on public route, show nothing (redirect is happening)
  if (isElectron && !isSignedIn && !isPublicRoute(pathname)) {
    return null
  }

  return <>{children}</>
}
