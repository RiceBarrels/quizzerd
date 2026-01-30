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
import { GeneralGroup, ClassesGroup } from "./app-sidebar-groups"
import { useClerk, useUser } from "@clerk/nextjs"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { cn } from "@/lib/utils"
import { Separator } from "./separator";
import { useSidebar } from "./sidebar";
import { motion, AnimatePresence } from "framer-motion";

export default function AppSidebar({...prop}){
    const { signOut } = useClerk();
    const { user } = useUser();
    const { open, state } = useSidebar();
    const isCollapsed = state === "collapsed";

    return (
        <>
        <Sidebar collapsible="icon" className={"m-1.5 bg-background mt-11 rounded-4xl rounded-r-2xl border shadow-none overflow-hidden translate-x-1 h-[calc(100vh-3rem)] z-40 transition-all duration-300 ease-in-out"} {...prop}>
            <SidebarHeader className={cn(
                "border-b",
                "px-6 py-5 group-data-[collapsible=icon]:px-1.75 group-data-[collapsible=icon]:py-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center bg-background"
            )}>
                <Link href="/" className="flex items-center gap-3 group">
                    <motion.div 
                        className={cn(
                            "flex items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm",
                            "h-10 w-10 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
                        )}
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 250, damping: 30 }}
                    >
                        <motion.div
                            animate={{
                                scale: isCollapsed ? 0.8 : 1,
                            }}
                            transition={{ type: "spring", stiffness: 250, damping: 30 }}
                        >
                            <Sparkles className={cn(
                                "h-5 w-5",
                                "group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:w-4"
                            )} />
                        </motion.div>
                    </motion.div>
                    <AnimatePresence mode="popLayout">
                        {!isCollapsed && (
                            <motion.div 
                                className="flex flex-col overflow-hidden"
                                initial={{ opacity: 0, x: -10, maxWidth: 0 }}
                                animate={{ opacity: 1, x: 0, maxWidth: 200 }}
                                exit={{ opacity: 0, x: -10, maxWidth: 0 }}
                                transition={{
                                    opacity: { duration: 0.2 },
                                    x: { type: "spring", stiffness: 250, damping: 30 },
                                    maxWidth: { type: "spring", stiffness: 180, damping: 28 }
                                }}
                                style={{ width: "auto" }}
                                layout
                            >
                                <h1 className="font-bold text-xl whitespace-nowrap">QuizZerd</h1>
                                <p className="text-[10px] text-muted-foreground whitespace-nowrap">Education Platform</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </Link>
            </SidebarHeader>

            <SidebarContent className={cn(
                "pt-2 pb-3",
                "group-data-[collapsible=icon]:pt-3 group-data-[collapsible=icon]:pb-2 bg-background"
            )}>
                <GeneralGroup />
                <ClassesGroup />
            </SidebarContent>

            <SidebarFooter className={cn(
                "border-t rounded-b-3xl",
                "p-4 space-y-3 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:space-y-2 bg-background"
            )}>
                {user && (
                    <SidebarMenu className="mt-2">
                        <SidebarMenuItem>
                            <motion.div 
                                className={cn(
                                    "flex items-center gap-3 rounded-2xl",
                                    "px-4 py-3 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:py-0 group-data-[collapsible=icon]:justify-center",
                                    "bg-sidebar-accent hover:bg-sidebar-accent",
                                )}
                                whileHover={{ scale: 1.02 }}
                                transition={{ type: "spring", stiffness: 250, damping: 30 }}
                            >
                                <motion.div
                                    animate={{
                                        scale: isCollapsed ? 0.8 : 1,
                                    }}
                                    transition={{ type: "spring", stiffness: 250, damping: 30 }}
                                >
                                    <Avatar className={cn(
                                        "shadow-sm",
                                        "h-10 w-10 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8"
                                    )}>
                                        <AvatarImage src={user.imageUrl} />
                                        <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
                                            {user.firstName?.[0]}{user.lastName?.[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                </motion.div>
                                <AnimatePresence mode="popLayout">
                                    {!isCollapsed && (
                                        <motion.div 
                                            className="flex-1 min-w-0 overflow-hidden"
                                            initial={{ opacity: 0, x: -10, maxWidth: 0 }}
                                            animate={{ opacity: 1, x: 0, maxWidth: 300 }}
                                            exit={{ opacity: 0, x: -10, maxWidth: 0 }}
                                            transition={{
                                                opacity: { duration: 0.2 },
                                                x: { type: "spring", stiffness: 250, damping: 30 },
                                                maxWidth: { type: "spring", stiffness: 180, damping: 28 }
                                            }}
                                            style={{ width: "auto" }}
                                            layout
                                        >
                                            <div className="font-semibold text-sm truncate text-sidebar-foreground whitespace-nowrap">
                                                {user.firstName} {user.lastName}
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate whitespace-nowrap">
                                                {user.primaryEmailAddress?.emailAddress}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        </SidebarMenuItem>

                        <SidebarMenuItem>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 250, damping: 30 }}
                            >
                                <SidebarMenuButton
                                    onClick={() => signOut({ redirectUrl: '/sign-in' })}
                                    className={cn(
                                        "text-destructive hover:text-destructive hover:bg-destructive/10 font-medium rounded-2xl",
                                        "h-10 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:justify-center"
                                    )}
                                    tooltip={isCollapsed ? "Sign Out" : undefined}
                                >
                                    <LogOut className="h-4 w-4" />
                                    <AnimatePresence mode="popLayout">
                                        {!isCollapsed && (
                                            <motion.span
                                                initial={{ opacity: 0, maxWidth: 0 }}
                                                animate={{ opacity: 1, maxWidth: 100 }}
                                                exit={{ opacity: 0, maxWidth: 0 }}
                                                transition={{
                                                    opacity: { duration: 0.2 },
                                                    maxWidth: { type: "spring", stiffness: 180, damping: 28 }
                                                }}
                                                className="overflow-hidden whitespace-nowrap"
                                                style={{ width: "auto" }}
                                                layout
                                            >
                                                Sign Out
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </SidebarMenuButton>
                            </motion.div>
                        </SidebarMenuItem>
                    </SidebarMenu>
                )}
            </SidebarFooter>
        </Sidebar>
        </>
    )
}