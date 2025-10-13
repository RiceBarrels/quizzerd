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
            children:<><HomeIcon/> Home</>
        },
        {
            link:"/class",
            children:<><GraduationCap/> Classes</>
        },
        {
            link:"/exam",
            children:<><ListTodoIcon/> Exams</>
        },
        {
            link:"/calender",
            children:<><Calendar1Icon/> Calendar</>
        }
    ]
    return (
        
        <SidebarGroup className="gap-2">
            <h3 className="text-xs px-2 font-bold text-foreground/95">GENERAL</h3>
            {buttons.map((button,i)=>{
                return (
                    <SidebarMenuButton key={i} className="true" isActive={pathname === button.link} asChild>
                        <Link href={button.link}>
                                {button.children}
                        </Link>
                    </SidebarMenuButton>
                )
            })}
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
        <SidebarGroup className="gap-2">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-bold text-foreground/75">MY CLASSES</h3>
                {loading && <Loader2 className="h-3 w-3 animate-spin" />}
            </div>
            
            {!loading && classes.length === 0 ? (
                <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No classes yet</p>
                    <Link href="/class" className="text-primary hover:underline block mt-1">
                        Join a class
                    </Link>
                </div>
            ) : (
                <>
                    {classes.slice(0, 8).map((classItem) => {
                        const isActive = pathname === `/class/${classItem.class_code}`
                        return (
                            <SidebarMenuButton 
                                key={classItem.class_id} 
                                isActive={isActive} 
                                asChild
                                className="flex items-center gap-2"
                            >
                                <Link href={`/class/${classItem.class_code}`} className="flex items-center gap-2 w-full">
                                    <div 
                                        className="w-2 h-2 rounded-full flex-shrink-0" 
                                        style={{ backgroundColor: classItem.class_settings?.themeColor || '#bc6a4a' }}
                                    />
                                    <span className="truncate flex-1">{classItem.class_name}</span>
                                    {(classItem.role === 'admin' || classItem.role === 'teacher') && (
                                        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                                            {classItem.role === 'admin' ? 'A' : 'T'}
                                        </Badge>
                                    )}
                                </Link>
                            </SidebarMenuButton>
                        )
                    })}
                    {classes.length > 8 && (
                        <SidebarMenuButton asChild className="text-xs text-muted-foreground">
                            <Link href="/class">
                                View all {classes.length} classes
                            </Link>
                        </SidebarMenuButton>
                    )}
                </>
            )}
        </SidebarGroup>
    )
}