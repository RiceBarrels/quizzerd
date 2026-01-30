import AppSidebar from "@/components/ui/app-sidebar";
import CheatingDetection from "@/components/ui/cheating-detection";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import Toolbar from "@/components/ui/toolbar";
import Footer from "@/components/ui/footer";
import { FooterWrapper } from "@/components/ui/footer-wrapper";
import { ElectronAuthGuard } from "@/components/electron/ElectronAuthGuard";

export default function navLayout({children}: {children: React.ReactNode}){
    return (
        <ElectronAuthGuard>
            <SidebarProvider>
                <div className="w-screen h-screen overflow-hidden bg-sidebar flex flex-col">
                    {/* Toolbar at top - full width */}
                    <Toolbar />

                    {/* Sidebar + Content below */}
                    <div className="flex-1 flex overflow-hidden">
                        <AppSidebar />
                        <div className="flex-1 flex flex-col p-1 pl-3.5 overflow-hidden">
                            <div id="main-content" className="flex-1 bg-background rounded-4xl rounded-l-2xl border overflow-y-auto overflow-x-hidden flex flex-col">
                                <div style={{ viewTransitionName: 'main-content' }} className="flex-1">
                                    {children}
                                </div>
                                <FooterWrapper>
                                    <Footer className="rounded-b-4xl border-t-0" />
                                </FooterWrapper>
                                <Toaster />
                            </div>
                        </div>
                    </div>
                    <CheatingDetection />
                </div>
            </SidebarProvider>
        </ElectronAuthGuard>
    )
}