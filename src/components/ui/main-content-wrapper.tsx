"use client"

import { useSidebar } from "./sidebar"
import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface MainContentWrapperProps {
  children: ReactNode
}

export function MainContentWrapper({ children }: MainContentWrapperProps) {
  const { isHidden, showSidebar } = useSidebar()

  const sidebarVisible = !isHidden || showSidebar

  return (
    <div className={cn(
      "flex-1 flex flex-col p-1 overflow-hidden transition-all duration-300",
      sidebarVisible ? "pl-3.5" : "pl-1"
    )}>
      <div
        id="main-content"
        className={cn(
          "flex-1 bg-background border overflow-y-auto overflow-x-hidden flex flex-col transition-all duration-300",
          sidebarVisible ? "rounded-4xl rounded-l-2xl" : "rounded-4xl"
        )}
      >
        {children}
      </div>
    </div>
  )
}
