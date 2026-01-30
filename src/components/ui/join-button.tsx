"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowRight, PlusIcon } from "lucide-react"
import { Button } from "./button"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"

import { Label } from "./label"
import { Input } from "./input"

export default function JoinButton({children=(<Button variant="ghost"> <PlusIcon /> Join</Button>), defaultValue="joinExam"}){
    const [examCode, setExamCode] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [open, setOpen] = useState(false)
    const router = useRouter()
    const { user } = useUser()

    const handleJoin = async () => {
        if (!user) {
            setError("Please sign in to join an exam")
            return
        }

        setIsLoading(true)
        setError("")

        try {
            if (!examCode.trim()) {
                setError("Please enter an exam code")
                setIsLoading(false)
                return
            }
            // Navigate to exam with the code
            router.push(`/exam/${examCode.trim()}`)
            setOpen(false)
            setExamCode("")
        } catch (err) {
            setError('An error occurred. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }
    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                {children}
            </AlertDialogTrigger>

            <AlertDialogContent>
                <AlertDialogTitle className="sr-only">
                    please select an option
                </AlertDialogTitle>

                <div className="space-y-4">
                    <h3 className="font-bold pb-0.5 text-lg">Join an Exam</h3>
                    <div className="p-2 flex flex-col">
                        <Label htmlFor="examCode">Exam code<span className="text-primary">*</span></Label>
                        <Label htmlFor="examCode" className="text-xs mt-1 mb-2 mx-1 font-normal">If you don&apos;t have an exam code, please ask your teacher...</Label>
                        <Input
                            id="examCode"
                            placeholder="Exam code..."
                            value={examCode}
                            onChange={(e) => setExamCode(e.target.value)}
                            disabled={isLoading}
                        />
                        {error && (
                            <p className="text-red-500 text-sm mt-2">{error}</p>
                        )}
                    </div>
                </div>

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                    <Button onClick={handleJoin} disabled={isLoading}>
                        <ArrowRight/> {isLoading ? "Joining..." : "Continue"}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>

        </AlertDialog>
    )
}