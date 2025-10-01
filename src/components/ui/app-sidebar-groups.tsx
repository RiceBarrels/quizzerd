"use client"

import { Calendar1Icon, CheckLineIcon, HomeIcon, ListCheckIcon, ListTodoIcon} from "lucide-react"
import { SidebarGroup, SidebarMenuButton } from "./sidebar"
import { Link } from 'next-view-transitions'
import { usePathname } from "next/navigation"

export function GeneralGroup(){
    const pathname = usePathname()
    const buttons = [
        {
            link:"/home",
            children:<><HomeIcon/> Home</>
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
    const buttons = [
        {
            link:"/todos",
            children:<><ListCheckIcon/> To-dos</>
        },
        {
            link:"/calender",
            children:<><Calendar1Icon/> Calendar</>
        }
    ]
    return (
        
        <SidebarGroup className="gap-2">
            <h3 className="text-xs px-2 font-bold text-foreground/75">ENROLLED</h3>
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