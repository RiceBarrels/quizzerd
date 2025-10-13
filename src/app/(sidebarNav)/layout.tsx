import AppSidebar from "@/components/ui/app-sidebar";
import CheatingDetection from "@/components/ui/cheating-detection";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import Toolbar from "@/components/ui/toolbar";

export default function navLayout({children}: {children: React.ReactNode}){
    return (
        <div className="w-screen h-screen notranslate overflow-hidden bg-sidebar">
            <SidebarProvider>
                <AppSidebar />
                <div className="w-full h-screen flex flex-col p-2 overflow-hidden">
                    <Toolbar />
                    <div id="main-content" className="flex-1 bg-background rounded-4xl border overflow-y-auto">
                        <div style={{ viewTransitionName: 'main-content' }}>
                            {children}
                            <Toaster />
                        </div>
                    </div>
                </div>
            </SidebarProvider>
            <CheatingDetection />
        </div>
    )
}