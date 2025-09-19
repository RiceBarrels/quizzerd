"use client"
import { useEffect, useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from './button';

export default function CheatingDetection(){

    const [isKnowingConsole, setIsKnowingConsole] = useState(false)
    const [showCheatingDialog, setShowCheatingDialog] = useState(false)

    useEffect(() => {
        const intervalId = setInterval(() => {
            if(!isKnowingConsole){
                const t1 = new Date();
                debugger;
                const t2 = new Date();
                if (t2 - t1 > 100) {
                    setIsKnowingConsole(true);
                    setShowCheatingDialog(true);
                }
            }
            console.log("check")
        }, 1000); // Check every second

        return () => clearInterval(intervalId);
    }, [isKnowingConsole]);
    
    return (
        <>
            <AlertDialog open={showCheatingDialog} onOpenChange={setShowCheatingDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Developer Tools Detected</AlertDialogTitle>
                        <AlertDialogDescription>
                            We've detected that you have opened the developer tools. 
                            This action will be logged for security purposes during an actual exam. <br/><br/>
                            <span className='text-red-700'>This is a warning that you can not open developer tools in an actual Exam! <br/> <span className='font-bold'>(Your score can be DISQUALIFYED by your teacher!)</span></span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant="outline" onClick={() => {setIsKnowingConsole(false);setTimeout(()=>setShowCheatingDialog(true),100)}}>
                            I don't Understood...
                        </AlertDialogCancel>
                        <AlertDialogAction>
                            Understood
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}