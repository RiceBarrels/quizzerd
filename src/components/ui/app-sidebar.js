import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { Calendar1Icon, HomeIcon } from "lucide-react"
import Link from "next/link"
import { ClassesGroup, GeneralGroup } from "./app-sidebar-groups"

export default function AppSidebar(){
    return (

        <Sidebar className="border-sidebar ease-[cubic-bezier(0.85,0,0.15,1)]">
            <SidebarHeader className="h-13 border-b border-r rounded-br-4xl pl-6 bg-background">
                <h1 className="font-bold text-2xl">QuizZered</h1>
            </SidebarHeader>
            <SidebarContent className="pt-6">
                <GeneralGroup />
                <ClassesGroup />
            </SidebarContent>
            <SidebarFooter />
        </Sidebar>
    )
}