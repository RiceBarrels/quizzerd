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

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Label } from "./label"
import { Input } from "./input"

export default function JoinButton({children=(<Button variant="outline"> <PlusIcon /> Join</Button>), defaultValue="joinClass"}){
    const [classCode, setClassCode] = useState("")
    const [examCode, setExamCode] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")
    const [open, setOpen] = useState(false)
    const [activeTab, setActiveTab] = useState(defaultValue)
    const router = useRouter()
    const { user } = useUser()

    const handleJoin = async () => {
        if (!user) {
            setError("Please sign in to join a class")
            return
        }

        setIsLoading(true)
        setError("")

        try {
            if (activeTab === "joinClass") {
                if (!classCode.trim()) {
                    setError("Please enter a class code")
                    setIsLoading(false)
                    return
                }

                const response = await fetch('/api/classes/join', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        classCode: classCode.trim(),
                        userId: user.id,
                        role: 'student'
                    }),
                })

                const data = await response.json()

                if (!response.ok) {
                    setError(data.error || 'Failed to join class')
                    setIsLoading(false)
                    return
                }

                // Only close dialog and reset form on success
                setOpen(false)
                setClassCode("")
                router.refresh()
            } else {
                // Handle exam joining logic here
                if (!examCode.trim()) {
                    setError("Please enter a exam code")
                    setIsLoading(false)
                    return
                }
                // Exam join API call would go here
            }
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

                <Tabs defaultValue={defaultValue} value={activeTab} onValueChange={setActiveTab}>
                    <div className="flex gap-4 items-center">
                        <h3 className="font-bold pb-0.5 text-lg">Join a</h3>
                        <TabsList>
                            <TabsTrigger value="joinClass">Class</TabsTrigger>
                            <span className="px-2 text-sm">or</span>
                            <TabsTrigger value="joinExam">Exam</TabsTrigger>
                        </TabsList>
                        ...
                    </div>

                    <TabsContent value="joinClass" className="p-2 flex flex-col">
                        <Label htmlFor="classCode">Class code<span className="text-primary">*</span></Label>
                        <Label htmlFor="classCode" className="text-xs mt-1 mb-2 mx-1 font-normal">If you don't have a class code, please ask your teacher...</Label>
                        <Input 
                            id="classCode" 
                            placeholder="Class code..." 
                            value={classCode}
                            onChange={(e) => setClassCode(e.target.value)}
                            disabled={isLoading}
                        />
                        {error && activeTab === "joinClass" && (
                            <p className="text-red-500 text-sm mt-2">{error}</p>
                        )}
                    </TabsContent>

                    <TabsContent value="joinExam" className="p-2 flex flex-col">
                        <Label htmlFor="examCode">Exam code<span className="text-primary">*</span></Label>
                        <Label htmlFor="examCode" className="text-xs mt-1 mb-2 mx-1 font-normal">If you don't have a exam code, please ask your teacher...</Label>
                        <Input 
                            id="examCode" 
                            placeholder="Exam code..." 
                            value={examCode}
                            onChange={(e) => setExamCode(e.target.value)}
                            disabled={isLoading}
                        />
                        {error && activeTab === "joinExam" && (
                            <p className="text-red-500 text-sm mt-2">{error}</p>
                        )}
                    </TabsContent>
                </Tabs>

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