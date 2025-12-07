import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import Toolbar from "@/components/ui/toolbar";
import Footer from "@/components/ui/footer";
import { ReactNode } from "react";

export default function navLayout({children}:{
    children: ReactNode
}){
    return (
        <div className="w-screen h-screen overflow-hidden bg-sidebar">
            <SidebarProvider>
                <div className="w-full h-screen flex flex-col p-2 overflow-hidden">
                    <Toolbar />
                    <div id="main-content" className="flex-1 bg-background rounded-4xl border overflow-y-auto flex flex-col" style={{ viewTransitionName: 'main-content' }}>
                        <div className="flex-1">
                            {children}
                            <Toaster />
                        </div>
                        <Footer className="rounded-b-4xl border-t-0" />
                    </div>
                </div>
            </SidebarProvider>
        </div>
    )
}