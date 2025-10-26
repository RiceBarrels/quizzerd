"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenu,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { LogOut, Sparkles } from "lucide-react"
import Link from "next/link"
import { ClassesGroup, GeneralGroup } from "./app-sidebar-groups"
import { useClerk, useUser } from "@clerk/nextjs"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { cn } from "@/lib/utils"

export default function AppSidebar({...prop}){
    const { signOut } = useClerk();
    const { user } = useUser();
    
    return (
        <Sidebar className="m-2 rounded-3xl border shadow-lg overflow-hidden" {...prop}>
            <SidebarHeader className="border-b px-6 py-5 rounded-t-3xl">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-xl">QuizZered</h1>
                        <p className="text-[10px] text-muted-foreground">Education Platform</p>
                    </div>
                </Link>
            </SidebarHeader>

            <SidebarContent className="pt-5 pb-3 px-2">
                <GeneralGroup />
                <SidebarSeparator className="my-3" />
                <ClassesGroup />
            </SidebarContent>

            <SidebarFooter className="border-t p-4 space-y-3 rounded-b-3xl">
                {user && (
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <div className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-2xl",
                                "bg-sidebar-accent hover:bg-sidebar-accent",
                                "transition-colors duration-200"
                            )}>
                                <Avatar className="h-10 w-10 shadow-sm">
                                    <AvatarImage src={user.imageUrl} />
                                    <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
                                        {user.firstName?.[0]}{user.lastName?.[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-sm truncate text-sidebar-foreground">
                                        {user.firstName} {user.lastName}
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                        {user.primaryEmailAddress?.emailAddress}
                                    </div>
                                </div>
                            </div>
                        </SidebarMenuItem>

                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => signOut({ redirectUrl: '/sign-in' })}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 font-medium h-10 rounded-2xl"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign Out
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                )}
            </SidebarFooter>
        </Sidebar>
    )
}