"use client"

import { Calendar1Icon, CheckLineIcon, HomeIcon, ListCheckIcon, ListTodoIcon, GraduationCap, Loader2, BookOpen} from "lucide-react"
import { SidebarGroup, SidebarMenuButton } from "./sidebar"
import { Link } from 'next-view-transitions'
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Badge } from "./badge"

export function GeneralGroup(){
    const pathname = usePathname()
    const buttons = [
        {
            link:"/",
            children:<><HomeIcon className="h-4 w-4" /> Home</>
        },
        {
            link:"/class",
            children:<><GraduationCap className="h-4 w-4" /> Classes</>
        },
        {
            link:"/exam",
            children:<><ListTodoIcon className="h-4 w-4" /> Exams</>
        },
        {
            link:"/calender",
            children:<><Calendar1Icon className="h-4 w-4" /> Calendar</>
        }
    ]
    return (
        <SidebarGroup className="gap-3 px-2">
            <h3 className="text-[11px] px-4 py-2 font-bold tracking-wider text-muted-foreground uppercase">
                General
            </h3>
            <div className="space-y-1.5">
                {buttons.map((button,i)=>{
                    const isActive = pathname === button.link
                    return (
                        <SidebarMenuButton 
                            key={i} 
                            isActive={isActive}
                            asChild
                            className="sidebar-menu-button relative h-11 rounded-2xl px-4"
                        >
                            <Link href={button.link} className="flex items-center gap-3 font-medium">
                                {isActive && (
                                    <div className="absolute left-0 h-6 w-1 bg-primary rounded-r-full" />
                                )}
                                {button.children}
                            </Link>
                        </SidebarMenuButton>
                    )
                })}
            </div>
        </SidebarGroup>
    )
}

export function ClassesGroup(){
    const pathname = usePathname()
    const [classes, setClasses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchClasses()
    }, [])

    const fetchClasses = async () => {
        try {
            const response = await fetch('/api/classes/get?limit=10')
            const data = await response.json()
            
            if (data.success) {
                setClasses(data.data)
            }
        } catch (error) {
            console.error('Failed to fetch classes:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <SidebarGroup className="gap-3 px-2">
            <div className="flex items-center justify-between px-4 py-2">
                <h3 className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                    My Classes
                </h3>
                {loading && (
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
            </div>
            
            {!loading && classes.length === 0 ? (
                <div className="px-4 py-8 text-center rounded-2xl bg-muted border border-dashed border-border mx-1">
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
                <div className="space-y-1.5">
                    {classes.slice(0, 8).map((classItem) => {
                        const isActive = pathname === `/class/${classItem.class_code}`
                        return (
                            <SidebarMenuButton 
                                key={classItem.class_id} 
                                isActive={isActive} 
                                asChild
                                className="sidebar-menu-button group relative h-11 rounded-2xl px-4"
                            >
                                <Link 
                                    href={`/class/${classItem.class_code}`} 
                                    className="flex items-center gap-3 w-full"
                                >
                                    {isActive && (
                                        <div className="absolute left-0 h-6 w-1 bg-primary rounded-r-full" />
                                    )}
                                    <div 
                                        className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm transition-transform group-hover:scale-110" 
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
                    {classes.length > 8 && (
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
                </div>
            )}
        </SidebarGroup>
    )
}