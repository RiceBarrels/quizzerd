"use client"

import { Calendar1Icon, HomeIcon, ListTodoIcon, LayoutDashboardIcon, UsersIcon } from "lucide-react"
import { SidebarGroup, SidebarMenuButton, useSidebar } from "./sidebar"
import { Link } from 'next-view-transitions'
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "motion/react"

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
            link:"/sessions",
            label: "Sessions",
            icon: UsersIcon
        },
        {
            link:"/calender",
            label: "Calendar",
            icon: Calendar1Icon
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