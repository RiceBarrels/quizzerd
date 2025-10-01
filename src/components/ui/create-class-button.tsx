"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowRight, SquarePlusIcon, Hash } from "lucide-react"
import { Button } from "./button"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Label } from "./label"
import { Input } from "./input"
import { Textarea } from "./textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function CreateClassButton({children=(<Button variant="outline"> <SquarePlusIcon /> Create</Button>), defaultValue="createClass"}){
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        className: "",
        classCode: "",
        description: "",
        periodStart: "",
        periodEnd: "",
        themeColor: "#bc6a4a",
        themeFont: "default"
    })
    const [activeTab, setActiveTab] = useState(defaultValue)

    const handleCreateClass = async () => {
        if (activeTab === "createClass") {
            if (!formData.className) {
                alert("Please enter a class name")
                return
            }

            setLoading(true)
            try {
                const response = await fetch("/api/classes/create", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        className: formData.className,
                        description: formData.description,
                        periodStart: formData.periodStart || null,
                        periodEnd: formData.periodEnd || null,
                        classSettings: {
                            themeColor: formData.themeColor,
                            themeFont: formData.themeFont
                        }
                    })
                })

                const data = await response.json()
                
                if (response.ok) {
                    setOpen(false)
                    setFormData({
                        className: "",
                        classCode: "",
                        description: "",
                        periodStart: "",
                        periodEnd: "",
                        themeColor: "#bc6a4a",
                        themeFont: "default"
                    })
                    window.location.reload()
                } else {
                    alert(data.error || "Failed to create class")
                }
            } catch (error) {
                console.error("Error creating class:", error)
                alert("Failed to create class. Please try again.")
            } finally {
                setLoading(false)
            }
        } else if (activeTab === "joinClass") {
            if (!formData.classCode) {
                alert("Please enter a class code")
                return
            }
            console.log("Joining class with code:", formData.classCode)
            setOpen(false)
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                {children}
            </AlertDialogTrigger>

            <AlertDialogContent className="max-w-2xl">
                <AlertDialogHeader>
                    <AlertDialogTitle>Class Management</AlertDialogTitle>
                    <AlertDialogDescription>
                        Create a new class or join an existing one
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="createClass">Create Class</TabsTrigger>
                        <TabsTrigger value="joinClass">Join Class</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="createClass" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="className">Class Name *</Label>
                            <Input
                                id="className"
                                placeholder="e.g., Math 101, Physics Advanced"
                                value={formData.className}
                                onChange={(e) => setFormData({...formData, className: e.target.value})}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Enter a brief description of the class (optional)"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="periodStart">Class Start Time</Label>
                                <Input
                                    id="periodStart"
                                    type="time"
                                    value={formData.periodStart}
                                    onChange={(e) => setFormData({...formData, periodStart: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="periodEnd">Class End Time</Label>
                                <Input
                                    id="periodEnd"
                                    type="time"
                                    value={formData.periodEnd}
                                    onChange={(e) => setFormData({...formData, periodEnd: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="themeColor">Theme Color</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="themeColor"
                                        type="color"
                                        className="w-16 h-10"
                                        value={formData.themeColor}
                                        onChange={(e) => setFormData({...formData, themeColor: e.target.value})}
                                    />
                                    <Input
                                        type="text"
                                        value={formData.themeColor}
                                        onChange={(e) => setFormData({...formData, themeColor: e.target.value})}
                                        placeholder="#bc6a4a"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="themeFont">Theme Font</Label>
                                <Select 
                                    value={formData.themeFont}
                                    onValueChange={(value) => setFormData({...formData, themeFont: value})}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a font" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="default">Default</SelectItem>
                                        <SelectItem value="serif">Serif</SelectItem>
                                        <SelectItem value="sans-serif">Sans Serif</SelectItem>
                                        <SelectItem value="monospace">Monospace</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="joinClass" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="classCode">Class Code *</Label>
                            <div className="relative">
                                <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="classCode"
                                    placeholder="Enter 6-character class code"
                                    className="pl-10 uppercase"
                                    maxLength={6}
                                    value={formData.classCode}
                                    onChange={(e) => setFormData({...formData, classCode: e.target.value.toUpperCase()})}
                                />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Ask your teacher or administrator for the class code
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>

                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => setOpen(false)}>Cancel</AlertDialogCancel>
                    <Button onClick={handleCreateClass} disabled={loading}>
                        {loading ? (
                            "Processing..."
                        ) : (
                            <>
                                <ArrowRight className="mr-2 h-4 w-4" />
                                {activeTab === "createClass" ? "Create Class" : "Join Class"}
                            </>
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}