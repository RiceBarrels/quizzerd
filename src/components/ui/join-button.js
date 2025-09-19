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

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Label } from "./label"
import { Input } from "./input"

export default function JoinButton({children=(<Button variant="outline"> <PlusIcon /> Join</Button>), defaultValue="joinClass"}){
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                {children}
            </AlertDialogTrigger>

            <AlertDialogContent>
                <AlertDialogTitle className="sr-only">
                    please select an option
                </AlertDialogTitle>

                <Tabs defaultValue={defaultValue}>
                    <div className="flex gap-4 items-center">
                        <h3 className="font-bold pb-0.5 text-lg">Join a</h3>
                        <TabsList>
                            <TabsTrigger value="joinClass">Class</TabsTrigger>
                            <span className="px-2 text-sm">or</span>
                            <TabsTrigger value="joinQuiz">Quiz</TabsTrigger>
                        </TabsList>
                        ...
                    </div>

                    <TabsContent value="joinClass" className="p-2 flex flex-col">
                        <Label htmlFor="classCode">Class code<span className="text-primary">*</span></Label>
                        <Label htmlFor="classCode" className="text-xs mt-1 mb-2 mx-1 font-normal">If you don't have a class code, please ask your teacher...</Label>
                        <Input id="classCode" placeholder="Class code..." />
                    </TabsContent>

                    <TabsContent value="joinQuiz" className="p-2 flex flex-col">
                        <Label htmlFor="quizCode">Quiz code<span className="text-primary">*</span></Label>
                        <Label htmlFor="quizCode" className="text-xs mt-1 mb-2 mx-1 font-normal">If you don't have a quiz code, please ask your teacher...</Label>
                        <Input id="quizCode" placeholder="Quiz code..." />
                    </TabsContent>
                </Tabs>

                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction><ArrowRight/> Continue </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>

        </AlertDialog>
    )
}