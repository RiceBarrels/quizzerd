import AppSidebar from "@/components/ui/app-sidebar";
import CheatingDetection from "@/components/ui/cheating-detection";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import Toolbar from "@/components/ui/toolbar";
import Footer from "@/components/ui/footer";
import { FooterWrapper } from "@/components/ui/footer-wrapper";
import { ElectronAuthGuard } from "@/components/electron/ElectronAuthGuard";
import { MainContentWrapper } from "@/components/ui/main-content-wrapper";

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
                        <MainContentWrapper>
                            <div style={{ viewTransitionName: 'main-content' }} className="flex-1">
                                {children}
                            </div>
                            <FooterWrapper>
                                <Footer className="rounded-b-4xl border-t-0" />
                            </FooterWrapper>
                            <Toaster />
                        </MainContentWrapper>
                    </div>
                    <CheatingDetection />
                </div>
            </SidebarProvider>
        </ElectronAuthGuard>
    )
}