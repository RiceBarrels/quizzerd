"use client"

import { Calendar1Icon, CheckLineIcon, HomeIcon, ListCheckIcon, ListTodoIcon, GraduationCap, Loader2, BookOpen, Archive} from "lucide-react"
import { SidebarGroup, SidebarMenuButton, useSidebar } from "./sidebar"
import { Link } from 'next-view-transitions'
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Badge } from "./badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion"
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
            link:"/class",
            label: "Classes",
            icon: GraduationCap
        },
        {
            link:"/exam",
            label: "Exams",
            icon: ListTodoIcon
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

export function ClassesGroup({className}: {className?: string}){
    const pathname = usePathname()
    const { state } = useSidebar()
    const isCollapsed = state === "collapsed"
    const [classes, setClasses] = useState<any[]>([])
    const [archivedClasses, setArchivedClasses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchClasses()
    }, [])

    const fetchClasses = async () => {
        try {
            // Fetch active classes
            const activeResponse = await fetch('/api/classes/get?limit=10')
            const activeData = await activeResponse.json()
            
            if (activeData.success) {
                setClasses(activeData.data)
            }

            // Fetch archived classes
            const archivedResponse = await fetch('/api/classes/get?limit=10&includeArchived=true')
            const archivedData = await archivedResponse.json()
            
            if (archivedData.success) {
                // Filter only archived classes
                const archived = archivedData.data.filter((c: any) => c.is_archived)
                setArchivedClasses(archived)
            }
        } catch (error) {
            console.error('Failed to fetch classes:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <SidebarGroup className={cn(
            "gap-3 px-2 transition-all duration-300",
            "group-data-[collapsible=icon]:px-1",
            className
        )}>
            <AnimatePresence mode="popLayout">
                {!isCollapsed && (
                    <motion.div 
                        className="flex items-center justify-between px-3 pt-2 pb-0"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{
                            opacity: { duration: 0.15 },
                            y: { type: "spring", stiffness: 250, damping: 28 }
                        }}
                        layout
                    >
                        <h3 className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                            My Classes
                        </h3>
                        {loading && (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
            
            {!loading && classes.length === 0 && archivedClasses.length === 0 ? (
                <div className={cn(
                    "px-4 py-8 text-center rounded-2xl bg-muted border border-dashed border-border mx-1 transition-opacity duration-300",
                    "group-data-[collapsible=icon]:hidden"
                )}>
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground font-medium mb-2">No classes yet</p>
                    <Link 
                        href="/class" 
                        className="text-xs text-primary hover:text-primary/80 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                        Join your first class
                        <span className="text-lg leading-none">→</span>
                    </Link>
                </div>
            ) : (
                <div className={cn(
                    "space-y-1.5",
                    "group-data-[collapsible=icon]:space-y-2"
                )}>
                    {/* Active Classes */}
                    {classes.slice(0, isCollapsed ? 6 : 8).map((classItem) => {
                        const isActive = pathname === `/class/${classItem.class_code}`
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
                                    tooltip={isCollapsed ? classItem.class_name : undefined}
                                    className={cn(
                                        "sidebar-menu-button group relative rounded-2xl",
                                        "h-11 px-4 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center"
                                    )}
                                >
                                    <Link 
                                        href={`/class/${classItem.class_code}`} 
                                        className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center relative"
                                    >
                                        <AnimatePresence mode="wait">
                                            {isActive && !isCollapsed && (
                                                <motion.div 
                                                    className="absolute left-0 bg-primary rounded-r-full h-6 w-1"
                                                    initial={{ scaleY: 0 }}
                                                    animate={{ scaleY: 1 }}
                                                    exit={{ scaleY: 0 }}
                                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                />
                                            )}
                                            {isActive && isCollapsed && (
                                                <motion.div 
                                                    className="absolute inset-0 bg-primary/20 rounded-2xl"
                                                    initial={{ scale: 0.8, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    exit={{ scale: 0.8, opacity: 0 }}
                                                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                                />
                                            )}
                                        </AnimatePresence>
                                        <motion.div 
                                            className={cn(
                                                "rounded-full shrink-0 shadow-sm relative z-10",
                                                "w-3 h-3 group-data-[collapsible=icon]:w-2.5 group-data-[collapsible=icon]:h-2.5"
                                            )}
                                            style={{ backgroundColor: classItem.class_settings?.themeColor || '#bc6a4a' }}
                                            whileHover={{ scale: 1.1 }}
                                            transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                        />
                                        <AnimatePresence mode="popLayout">
                                            {!isCollapsed && (
                                                <motion.span 
                                                    className="truncate flex-1 text-sm font-medium relative z-10"
                                                    initial={{ opacity: 0, x: -5 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -5 }}
                                                    transition={{
                                                        opacity: { duration: 0.2 },
                                                        x: { type: "spring", stiffness: 250, damping: 28 }
                                                    }}
                                                    layout
                                                >
                                                    {classItem.class_name}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                        <AnimatePresence mode="popLayout">
                                            {!isCollapsed && (classItem.role === 'admin' || classItem.role === 'teacher') && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.8 }}
                                                    transition={{
                                                        opacity: { duration: 0.15 },
                                                        scale: { type: "spring", stiffness: 250, damping: 28 }
                                                    }}
                                                    layout
                                                >
                                                    <Badge 
                                                        variant="secondary" 
                                                        className="text-[9px] px-2 py-0.5 h-5 font-bold rounded-full relative z-10"
                                                    >
                                                        {classItem.role === 'admin' ? 'A' : 'T'}
                                                    </Badge>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </Link>
                                </SidebarMenuButton>
                            </motion.div>
                        )
                    })}
                    
                    {classes.length > 8 && !isCollapsed && (
                        <SidebarMenuButton 
                            asChild 
                            className="mt-3 h-10 rounded-2xl text-xs text-muted-foreground hover:text-foreground"
                        >
                            <Link href="/class" className="flex items-center justify-center gap-1 font-medium">
                                View all {classes.length} classes
                                <span className="text-lg leading-none">→</span>
                            </Link>
                        </SidebarMenuButton>
                    )}
                    
                    {/* Archived Classes Accordion */}
                    {archivedClasses.length > 0 && !isCollapsed && (
                        <Accordion type="single" collapsible className="mt-3">
                            <AccordionItem value="archived" className="border-none">
                                <AccordionTrigger className="px-4 py-2 hover:no-underline rounded-2xl hover:bg-sidebar-accent">
                                    <div className="flex items-center gap-2">
                                        <Archive className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xs font-medium text-muted-foreground">
                                            Archived ({archivedClasses.length})
                                        </span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-1.5 pt-1">
                                    {archivedClasses.map((classItem) => {
                                        const isActive = pathname === `/class/${classItem.class_code}`
                                        return (
                                            <SidebarMenuButton 
                                                key={classItem.class_id} 
                                                isActive={isActive} 
                                                asChild
                                                className="sidebar-menu-button group relative h-11 rounded-2xl px-4 opacity-70 hover:opacity-100"
                                            >
                                                <Link 
                                                    href={`/class/${classItem.class_code}`} 
                                                    className="flex items-center gap-3 w-full"
                                                >
                                                    {isActive && (
                                                        <div className="absolute left-0 h-6 w-1 bg-primary rounded-r-full" />
                                                    )}
                                                    <div 
                                                        className="w-3 h-3 rounded-full shrink-0 shadow-sm transition-transform group-hover:scale-110" 
                                                        style={{ backgroundColor: classItem.class_settings?.themeColor || '#bc6a4a' }}
                                                    />
                                                    <span className="truncate flex-1 text-sm font-medium">
                                                        {classItem.class_name}
                                                    </span>
                                                    {(classItem.role === 'admin' || classItem.role === 'teacher') && (
                                                        <Badge 
                                                            variant="secondary" 
                                                            className="text-[9px] px-2 py-0.5 h-5 font-bold rounded-full"
                                                        >
                                                            {classItem.role === 'admin' ? 'A' : 'T'}
                                                        </Badge>
                                                    )}
                                                </Link>
                                            </SidebarMenuButton>
                                        )
                                    })}
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}
                </div>
            )}
        </SidebarGroup>
    )
}