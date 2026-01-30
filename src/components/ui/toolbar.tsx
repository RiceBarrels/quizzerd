"use client"
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs"
import { useSidebar } from "./sidebar"
import { Button } from "./button"
import JoinButton from "./join-button"
import BackNav from "@/app/(sidebarNav)/back-nav"
import { HomeIcon, PanelTopDashedIcon, PanelTopCloseIcon, Minus, Square, X, Maximize2 } from "lucide-react"
import { Link } from "next-view-transitions"
import { Separator } from "./separator"
import { motion } from "framer-motion"
import { useState, useEffect, useRef } from "react"

export default function Toolbar(){
    const [isToolbarHidden, setIsToolbarHidden] = useState(false)
    const [showToolbar, setShowToolbar] = useState(true)
    const toolbarRef = useRef<HTMLDivElement>(null)
    const { setOpen: setSidebarOpen } = useSidebar()
    const [isHoveringTrigger, setIsHoveringTrigger] = useState(false)
    const { isSignedIn } = useUser()

    // Electron state
    const [isElectron, setIsElectron] = useState(false)
    const [isMac, setIsMac] = useState(false)
    const [isMaximized, setIsMaximized] = useState(false)

    // Check if running in Electron
    useEffect(() => {
        const electron = window.electronAPI
        if (electron?.isElectron) {
            setIsElectron(true)
            setIsMac(electron.isMac)
            electron.isMaximized?.().then(setIsMaximized)
        }
    }, [])

    // Sync with localStorage after mount to avoid hydration mismatch
    useEffect(() => {
        const storedValue = localStorage.getItem('toolbarHidden') === 'true'
        setIsToolbarHidden(storedValue)
        setShowToolbar(!storedValue)
        // Also sync sidebar state
        if (storedValue && !isHoveringTrigger) {
            setSidebarOpen(false)
        }
    }, [setSidebarOpen])

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            setIsHoveringTrigger(true)
            // console.log("hovering trigger")
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
        console.log("hide toolbar")
        setIsToolbarHidden(true)
        setShowToolbar(false)
        setSidebarOpen(false)
        if (typeof window !== 'undefined') {
            localStorage.setItem('toolbarHidden', 'true')
            // Dispatch custom event for same-tab synchronization
            window.dispatchEvent(new CustomEvent('toolbarHiddenChange', { detail: 'true' }))
        }
    }

    const handleShowToolbar = () => {
        setIsToolbarHidden(false)
        setShowToolbar(true)
        setSidebarOpen(true)
        if (typeof window !== 'undefined') {
            localStorage.setItem('toolbarHidden', 'false')
            // Dispatch custom event for same-tab synchronization
            window.dispatchEvent(new CustomEvent('toolbarHiddenChange', { detail: 'false' }))
        }
    }

    // Electron window controls
    const handleMinimize = () => window.electronAPI?.minimizeWindow()
    const handleMaximize = () => {
        window.electronAPI?.maximizeWindow()
        setIsMaximized(!isMaximized)
    }
    const handleClose = () => window.electronAPI?.closeWindow()

    return (
      <>
        <motion.div
          ref={toolbarRef}
          className="w-full bg-sidebar overflow-hidden user-select-none relative z-50"
          style={isElectron ? { WebkitAppRegion: 'drag' } as React.CSSProperties : undefined}
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
          <div
            className="flex items-center p-1 pb-0 gap-4"
            style={{
              // Add padding for macOS traffic lights
              paddingLeft: isElectron && isMac ? '80px' : '24px',
              WebkitAppRegion: 'drag'
            } as React.CSSProperties}
          >
              {/* Hide home button when user is signed in */}
              {!isSignedIn && (
                <>
                  <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                    <Link href="/exam">
                      <Button variant="ghost" size="icon">
                        <HomeIcon/>
                      </Button>
                    </Link>
                  </div>
                  <Separator className="" orientation="vertical"/>
                </>
              )}

              <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <BackNav/>
              </div>

              <div className="flex-1"/>

              <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={isToolbarHidden ? handleShowToolbar : handleHideToolbar}
                  title={isToolbarHidden ? "Show toolbar" : "Hide toolbar"}
                >
                  {isToolbarHidden ? <PanelTopDashedIcon /> : <PanelTopCloseIcon />}
                </Button>

                <JoinButton />
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

              {/* Electron window controls - Windows/Linux only */}
              {isElectron && !isMac && (
                <div
                  className="flex items-center -mr-2"
                  style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMinimize}
                    className="h-8 w-10 rounded-none hover:bg-muted"
                    title="Minimize"
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMaximize}
                    className="h-8 w-10 rounded-none hover:bg-muted"
                    title={isMaximized ? "Restore" : "Maximize"}
                  >
                    {isMaximized ? (
                      <Square className="w-3 h-3" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="h-8 w-10 rounded-none hover:bg-destructive hover:text-destructive-foreground"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
          </div>
        </motion.div>
      </>
    )
}