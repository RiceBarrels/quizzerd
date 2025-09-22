"use client"

import { useTransitionRouter } from "next-view-transitions"
import { Button } from "../../components/ui/button"
import { ChevronLeftIcon, ChevronRightIcon, RotateCwIcon } from "lucide-react"

export default function BackNav(){
    const router = useTransitionRouter()
    return (
        <div className="flex w-full">
            <Button size="icon" variant="ghost" onClick={()=>router.back()}>
                <ChevronLeftIcon />
            </Button>
            <Button size="icon" variant="ghost" onClick={()=>router.refresh()}>
                <RotateCwIcon />
            </Button>
            <Button size="icon" variant="ghost" onClick={()=>router.forward()}>
                <ChevronRightIcon/>
            </Button>
        </div>
    )
}