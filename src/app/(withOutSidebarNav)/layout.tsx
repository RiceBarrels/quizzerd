import CheatingDetection from "@/components/ui/cheating-detection";
import { Toaster } from "@/components/ui/sonner";
import Toolbar from "@/components/ui/toolbar";
import { ReactNode } from "react";

export default function navLayout({children}:{
    children: ReactNode
}){
    return (
        <div className="w-screen h-screen notranslate overflow-hidden bg-sidebar">
            <div className="w-full h-screen flex flex-col p-2 overflow-hidden">
                <Toolbar sideBarButton={false} />
                <div className="flex-1 bg-background rounded-4xl border overflow-y-auto" style={{ viewTransitionName: 'main-content' }}>
                        {children}
                        <Toaster />
                </div>
            </div>
            <CheatingDetection />
        </div>
    )
}