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
} from "@/components/ui/sidebar"
import { Calendar1Icon, HomeIcon, LogOut, User } from "lucide-react"
import Link from "next/link"
import { ClassesGroup, GeneralGroup } from "./app-sidebar-groups"
import { useClerk, useUser } from "@clerk/nextjs"
import { Button } from "./button"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"

export default function AppSidebar({...prop}){
    const { signOut } = useClerk();
    const { user } = useUser();
    
    return (
        <Sidebar className="border-sidebar ease-[cubic-bezier(0.85,0,0.15,1)]" {...prop}>
            <SidebarHeader className="h-13 border-b border-r rounded-br-4xl pl-6 bg-background">
                <h1 className="font-bold text-2xl">QuizZered</h1>
            </SidebarHeader>
            <SidebarContent className="pt-6">
                <GeneralGroup />
                <ClassesGroup />
            </SidebarContent>
            <SidebarFooter className="border-t p-4">
                {user && (
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <div className="flex items-center gap-3 px-2 py-1.5">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.imageUrl} />
                                    <AvatarFallback>
                                        {user.firstName?.[0]}{user.lastName?.[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-sm">
                                    <div className="font-medium">
                                        {user.firstName} {user.lastName}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {user.primaryEmailAddress?.emailAddress}
                                    </div>
                                </div>
                            </div>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                onClick={() => signOut({ redirectUrl: '/sign-in' })}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-4xl"
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