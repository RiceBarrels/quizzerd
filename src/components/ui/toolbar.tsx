"use client"
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs"
import { SidebarTrigger } from "./sidebar"
import { Button } from "./button"
import JoinButton from "./join-button"
import BackNav from "@/app/(sidebarNav)/back-nav"
import { HomeIcon, PanelTopDashedIcon, PanelTopCloseIcon } from "lucide-react"
import { Link } from "next-view-transitions"
import { Separator } from "./separator"
import { motion } from "motion/react"
import { useState, useEffect, useRef } from "react"

interface ToolbarProps {
    sideBarButton?: boolean
}

export default function Toolbar({sideBarButton = false}: ToolbarProps){
    const [isToolbarHidden, setIsToolbarHidden] = useState(false)
    const [showToolbar, setShowToolbar] = useState(true)
    const toolbarRef = useRef<HTMLDivElement>(null)

    // Sync with localStorage after mount to avoid hydration mismatch
    useEffect(() => {
        const storedValue = localStorage.getItem('toolbarHidden') === 'true'
        setIsToolbarHidden(storedValue)
        setShowToolbar(!storedValue)
    }, [])

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isToolbarHidden) {
                // Show toolbar when mouse is near the top (within 10px)
                if (e.clientY <= 10) {
                    setShowToolbar(true)
                } else if (toolbarRef.current && showToolbar) {
                    const toolbarRect = toolbarRef.current.getBoundingClientRect()
                    // Hide toolbar when mouse leaves toolbar area (with some buffer)
                    if (e.clientY > toolbarRect.bottom + 50) {
                        setShowToolbar(false)
                    }
                }
            }
        }

        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [isToolbarHidden, showToolbar])

    const handleHideToolbar = () => {
        setIsToolbarHidden(true)
        setShowToolbar(false)
        if (typeof window !== 'undefined') {
            localStorage.setItem('toolbarHidden', 'true')
        }
    }

    const handleShowToolbar = () => {
        setIsToolbarHidden(false)
        setShowToolbar(true)
        if (typeof window !== 'undefined') {
            localStorage.setItem('toolbarHidden', 'false')
        }
    }

    return (
        <motion.div
          ref={toolbarRef}
          className="w-full bg-sidebar overflow-hidden"
          initial={false}
          animate={{
            height: showToolbar ? "auto" : 0,
            marginBottom: showToolbar ? 0 : 0,
            opacity: showToolbar ? 1 : 0
          }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 40,
            opacity: { duration: 0.2 }
          }}
        >
          <div className="flex items-center p-2 pt-0 pl-6 gap-4">
              {sideBarButton && <SidebarTrigger />}

              <Link href="/home">
                <Button variant="ghost" size="icon">
                  <HomeIcon/>
                </Button>
              </Link>

              <Separator className="" orientation="vertical"/>
              

              <BackNav/>

              <div className="flex-1"/>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={isToolbarHidden ? handleShowToolbar : handleHideToolbar}
                title={isToolbarHidden ? "Show toolbar" : "Hide toolbar"}
              >
                {isToolbarHidden ? <PanelTopDashedIcon /> : <PanelTopCloseIcon />}
              </Button>

              <JoinButton/>
              {/* user */}
              <SignedOut>
                <SignInButton>
                  <Button className="">
                    Sign In
                  </Button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                <UserButton />
              </SignedIn>
          </div>
        </motion.div>
    )
}