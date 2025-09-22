import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs"
import { SidebarTrigger } from "./sidebar"
import { Button } from "./button"
import JoinButton from "./join-button"
import BackNav from "@/app/(nav)/back-nav"

export default function Toolbar(){
    return (
        <div className="w-full flex items-center p-2 pl-6 gap-4 bg-sidebar">
            <SidebarTrigger />

            <BackNav/>

            <div className="flex-1"/>

            <JoinButton/>
            {/* user */}
            <SignedOut>
              <SignInButton>
                <Button className="">
                  Sign In
                </Button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <UserButton />
            </SignedIn>
        </div>
    )
}