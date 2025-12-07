import AppSidebar from "@/components/ui/app-sidebar";
import CheatingDetection from "@/components/ui/cheating-detection";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import Toolbar from "@/components/ui/toolbar";
import Footer from "@/components/ui/footer";

export default function navLayout({children}: {children: React.ReactNode}){
    return (
        <div className="w-screen h-screen overflow-hidden bg-sidebar">
            <SidebarProvider>
                <AppSidebar />
                <div className="w-full h-screen flex flex-col p-2 overflow-hidden ml-2">
                    <Toolbar />
                    <div id="main-content" className="flex-1 bg-background rounded-4xl border overflow-y-auto flex flex-col">
                        <div style={{ viewTransitionName: 'main-content' }} className="flex-1">
                            {children}
                            <Toaster />
                        </div>
                        <Footer className="rounded-b-4xl border-t-0" />
                    </div>
                </div>
            </SidebarProvider>
            <CheatingDetection />
        </div>
    )
}