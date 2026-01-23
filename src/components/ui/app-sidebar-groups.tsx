"use client"

import { Calendar1Icon, HomeIcon, ListTodoIcon, LayoutDashboardIcon, GraduationCap, SettingsIcon, ChevronDown, ChevronRight, Plus, Loader2 } from "lucide-react"
import { SidebarGroup, SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, useSidebar } from "./sidebar"
import { Link } from 'next-view-transitions'
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"

interface ClassItem {
    class_id: string;
    class_name: string;
    banner_color: string;
    role: string;
}

export function ClassesGroup() {
    const pathname = usePathname()
    const { state } = useSidebar()
    const isCollapsed = state === "collapsed"
    const { isLoaded } = useUser()

    const [isOpen, setIsOpen] = useState(true)
    const [classes, setClasses] = useState<ClassItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (isLoaded) {
            fetchClasses()
        }
    }, [isLoaded])

    const fetchClasses = async () => {
        try {
            const response = await fetch('/api/classes')
            const data = await response.json()
            if (data.success) {
                // Combine teaching and enrolled classes
                const allClasses = [
                    ...(data.data.teaching || []).map((c: any) => ({ ...c, role: 'teacher' })),
                    ...(data.data.enrolled || []).map((c: any) => ({ ...c, role: 'student' }))
                ]
                setClasses(allClasses.slice(0, 10)) // Limit to 10 for sidebar
            }
        } catch (error) {
            console.error('Failed to fetch classes:', error)
        } finally {
            setLoading(false)
        }
    }

    const isClassActive = (classId: string) => pathname.startsWith(`/classes/${classId}`)

    if (isCollapsed) {
        return null // Don't show classes section when collapsed
    }

    return (
        <SidebarGroup className={cn(
            "gap-2 px-2 transition-all duration-300",
            "group-data-[collapsible=icon]:hidden"
        )}>
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    opacity: { duration: 0.15 },
                    y: { type: "spring", stiffness: 250, damping: 28 }
                }}
            >
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-between w-full text-[11px] px-3 pt-2 pb-0 font-bold tracking-wider text-muted-foreground uppercase hover:text-foreground transition-colors"
                >
                    <span>My Classes</span>
                    <motion.div
                        animate={{ rotate: isOpen ? 0 : -90 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown className="h-3 w-3" />
                    </motion.div>
                </button>
            </motion.div>

            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div className="space-y-1 pt-1">
                            {loading ? (
                                <div className="flex items-center justify-center py-3">
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                            ) : classes.length === 0 ? (
                                <div className="px-3 py-2 text-xs text-muted-foreground">
                                    No classes yet
                                </div>
                            ) : (
                                classes.map((classItem) => {
                                    const isActive = isClassActive(classItem.class_id)
                                    return (
                                        <motion.div
                                            key={classItem.class_id}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                        >
                                            <SidebarMenuButton
                                                isActive={isActive}
                                                asChild
                                                className={cn(
                                                    "sidebar-menu-button relative rounded-xl",
                                                    "h-9 px-3"
                                                )}
                                            >
                                                <Link
                                                    href={`/classes/${classItem.class_id}`}
                                                    className="flex items-center gap-2.5 font-medium relative"
                                                >
                                                    <AnimatePresence mode="wait">
                                                        {isActive && (
                                                            <motion.div
                                                                className="absolute left-0 bg-primary rounded-r-full h-5 w-1"
                                                                initial={{ scaleY: 0 }}
                                                                animate={{ scaleY: 1 }}
                                                                exit={{ scaleY: 0 }}
                                                                transition={{ type: "spring", stiffness: 250, damping: 28 }}
                                                            />
                                                        )}
                                                    </AnimatePresence>
                                                    <div
                                                        className="h-5 w-5 rounded-md flex-shrink-0"
                                                        style={{ backgroundColor: classItem.banner_color || '#4285f4' }}
                                                    />
                                                    <span className="truncate text-sm relative z-10">
                                                        {classItem.class_name}
                                                    </span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </motion.div>
                                    )
                                })
                            )}

                            {/* View All / Create Class Link */}
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            >
                                <SidebarMenuButton
                                    asChild
                                    className={cn(
                                        "sidebar-menu-button relative rounded-xl",
                                        "h-9 px-3 text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Link
                                        href="/classes"
                                        className="flex items-center gap-2.5 font-medium"
                                    >
                                        <Plus className="h-4 w-4" />
                                        <span className="text-sm">View All Classes</span>
                                    </Link>
                                </SidebarMenuButton>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </SidebarGroup>
    )
}

export function GeneralGroup(){
    const pathname = usePathname()
    const { state } = useSidebar()
    const isCollapsed = state === "collapsed"
    const buttons = [
        {
            link:"/",
            label: "Home",
            icon: HomeIcon
        },
        {
            link:"/dashboard",
            label: "Dashboard",
            icon: LayoutDashboardIcon
        },
        {
            link:"/exam",
            label: "Exams",
            icon: ListTodoIcon
        },
        {
            link:"/classes",
            label: "Classes",
            icon: GraduationCap
        },
        {
            link:"/calender",
            label: "Calendar",
            icon: Calendar1Icon
        },
        {
            link:"/settings",
            label: "Settings",
            icon: SettingsIcon
        }
    ]
    return (
        <SidebarGroup className={cn(
            "gap-3 px-2 transition-all duration-300",
            "group-data-[collapsible=icon]:px-1"
        )}>
            <AnimatePresence mode="popLayout">
                {!isCollapsed && (
                    <motion.h3 
                        className="text-[11px] px-3 pt-2 pb-0 font-bold tracking-wider text-muted-foreground uppercase"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{
                            opacity: { duration: 0.15 },
                            y: { type: "spring", stiffness: 250, damping: 28 }
                        }}
                        layout
                    >
                        General
                    </motion.h3>
                )}
            </AnimatePresence>
            <div className={cn(
                "space-y-1.5",
                "group-data-[collapsible=icon]:space-y-2"
            )}>
                {buttons.map((button,i)=>{
                    const isActive = pathname === button.link
                    const Icon = button.icon
                    return (
                        <motion.div
                            key={i}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        >
                            <SidebarMenuButton 
                                isActive={isActive}
                                asChild
                                tooltip={isCollapsed ? button.label : undefined}
                                className={cn(
                                    "sidebar-menu-button relative rounded-2xl",
                                    "h-11 px-4 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                                )}
                            >
                                <Link href={button.link} className="flex items-center gap-3 font-medium group-data-[collapsible=icon]:justify-center relative">
                                    <AnimatePresence mode="wait">
                                        {isActive && !isCollapsed && (
                                            <motion.div 
                                                className="absolute left-0 bg-primary rounded-r-full h-6 w-1"
                                                initial={{ scaleY: 0 }}
                                                animate={{ scaleY: 1 }}
                                                exit={{ scaleY: 0 }}
                                                transition={{ type: "spring", stiffness: 250, damping: 28 }}
                                            />
                                        )}
                                        {isActive && isCollapsed && (
                                            <motion.div 
                                                className="absolute inset-0 bg-primary/20 rounded-2xl"
                                                initial={{ scale: 0.8, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0.8, opacity: 0 }}
                                                transition={{
                                                    opacity: { duration: 0.15 },
                                                    scale: { type: "spring", stiffness: 250, damping: 28 }
                                                }}
                                            />
                                        )}
                                    </AnimatePresence>
                                    <Icon className="h-4 w-4 shrink-0 relative z-10" />
                                    <AnimatePresence mode="popLayout">
                                        {!isCollapsed && (
                                            <motion.span 
                                                className="relative z-10"
                                                initial={{ opacity: 0, x: -5 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -5 }}
                                                transition={{
                                                    opacity: { duration: 0.2 },
                                                    x: { type: "spring", stiffness: 250, damping: 28 }
                                                }}
                                                layout
                                            >
                                                {button.label}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </Link>
                            </SidebarMenuButton>
                        </motion.div>
                    )
                })}
            </div>
        </SidebarGroup>
    )
}