"use client"

import { useUser } from "@clerk/nextjs"
import { ReactNode } from "react"

export function FooterWrapper({ children }: { children: ReactNode }) {
  const { isSignedIn } = useUser()

  // Hide footer when user is signed in
  if (isSignedIn) {
    return null
  }

  return <>{children}</>
}
