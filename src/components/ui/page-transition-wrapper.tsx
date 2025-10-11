'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

interface PageTransitionWrapperProps {
  children: ReactNode
}

export default function PageTransitionWrapper({ children }: PageTransitionWrapperProps) {
  const pathname = usePathname()
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentRef.current) {
      // Trigger exit animation
      contentRef.current.style.animation = 'contentFadeOut 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards'
      
      setTimeout(() => {
        // Trigger enter animation
        if (contentRef.current) {
          contentRef.current.style.animation = 'contentFadeIn 0.3s cubic-bezier(0.22, 0.61, 0.36, 1) forwards'
        }
      }, 200)
    }
  }, [pathname])

  return (
    <div ref={contentRef} className="page-content-wrapper">
      {children}
    </div>
  )
}