"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import CreateClassButton from "@/components/ui/create-class-button";
import JoinButton from "@/components/ui/join-button";
import { GraduationCapIcon, HardDriveUploadIcon, PaperclipIcon, PlusIcon, ScrollTextIcon, SearchIcon, SquarePlusIcon, Users, Clock, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Image from "next/image";
import { FcGoogle } from "react-icons/fc";
import { Input } from "@/components/ui/input";
import { Link, useTransitionRouter } from "next-view-transitions";

export default function Home() {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const router = useTransitionRouter();
    const limit = 6;

    useEffect(() => {
        fetchClasses();
    }, [page, search]);

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                ...(search && { search })
            });

            const response = await fetch(`/api/classes/get?${params}`);
            const data = await response.json();

            if (data.success) {
                setClasses(data.data);
                setPagination(data.pagination);
            }
        } catch (error) {
            console.error("Failed to fetch classes:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const formatTime = (timeString) => {
        if (!timeString) return null;
        const time = timeString.split(':');
        const hours = parseInt(time[0]);
        const minutes = time[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes} ${ampm}`;
    };
    
    return (
        <>
            <div className="p-2 m-2 bg-sidebar rounded-t-3xl rounded-b-xl flex flex-col gap-1 border">
                <h2 className="font-bold text-lg flex gap-2 p-2">
                    <PaperclipIcon />
                    Create a new Exam...

                    <div className="flex-1"/>

                    <JoinButton defaultValue="joinExam"/>
                </h2>
                <div className="flex bg-background rounded-t-3xl rounded-b-xl p-4 px-8 gap-4">
                    <Button onClick={()=>router.push('exam')} variant="outline" className="h-32 w-24 flex flex-col gap-2">

                        <div className="text-xs h-6 -space-x-2 flex items-center justify-center">
                            <PlusIcon />
                        </div>

                        <div className="flex gap-2 justify-center items-center">
                            <span className="font-bold text-xs">Blank</span>
                        </div>

                    </Button>
                    
                    <Button variant="outline" className="h-32 w-24 flex flex-col">
                        <div className="text-xs h-6 -space-x-2 flex items-center justify-center">
                            <SearchIcon />

                        </div>
                        <div className="flex gap-2 justify-center items-center">
                            <span className="font-bold text-xs">Search</span>
                        </div>
                    </Button>
                    
                    <Button variant="outline" className="h-32 w-24 flex flex-col">
                        <div className="text-xs h-6 -space-x-2 flex items-center justify-center">

                            <div className="bg-accent p-1 rounded-2xl border-2 border-background size-7 flex items-center justify-center">
                                <FcGoogle className="size-4"/>
                            </div>

                            <div className="bg-accent p-1 rounded-2xl border-2 border-background size-7 flex items-center justify-center">
                                <Image alt='' src="./microsoft-form.svg" width={32} height={32} className="size-3"/>
                            </div>

                        </div>
                        <div className="flex gap-2 justify-center items-center">
                            <HardDriveUploadIcon />
                            <span className="font-bold text-xs">Import</span>
                        </div>
                    </Button>
                </div>
            </div>
            
            <div className="p-2 m-2 bg-sidebar rounded-b-3xl rounded-t-xl flex flex-col gap-1 border">
                <div className="flex gap-2 p-2 items-center">
                    <GraduationCapIcon />
                    <h2 className="font-bold text-lg">My Classes</h2>
                    
                    <div className="flex-1 max-w-md">
                        <Input
                            type="search"
                            placeholder="Search classes by name or code..."
                            value={search}
                            onChange={handleSearch}
                            className="h-9"
                        />
                    </div>

                    <div className="flex-1"/>
                    <CreateClassButton/>
                    <JoinButton><Button> <PlusIcon /> Join</Button></JoinButton>
                </div>
                
                <div className="bg-background rounded-b-3xl rounded-t-xl p-8">
                    {loading ? (
                        <div className="flex items-center justify-center h-52">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : classes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-52 text-muted-foreground">
                            <GraduationCapIcon className="h-16 w-16 mb-4" />
                            <p className="text-lg font-medium">No classes found</p>
                            <p className="text-sm">Create or join a class to get started</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {classes.map((classItem) => (
                                    <Link key={classItem.class_id}  href={`class/${classItem.class_code}`}>
                                        <Card 
                                            variant="outline" 
                                            className={`h-52 flex flex-col gap-2 p-0 overflow-clip bg-sidebar cursor-pointer duration-150`}
                                        >
                                            <CardHeader 
                                                className="rounded-b-2xl shadow m-0 p-1 gap-1"
                                                style={{ backgroundColor: classItem.class_settings?.themeColor || '#bc6a4a' }}
                                            >
                                                <CardTitle className="text-sidebar-foreground text-shadow-2xs w-full gap-2 bg-sidebar p-3 rounded-t-2xl rounded-b-lg m-0 font-black">
                                                    {classItem.class_name}
                                                </CardTitle>
                                                <CardDescription className="text-sidebar-foreground text-shadow-2xs m-0 bg-sidebar p-2 rounded-t-lg rounded-b-2xl text-xs space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        {(classItem.role === "admin" || classItem.role === "teacher") &&
                                                            <Badge variant="outline" className="text-xs">
                                                                Class Code: {classItem.class_code}
                                                            </Badge>
                                                        }
                                                        <Badge variant="secondary" className="text-xs">
                                                            {classItem.role}
                                                        </Badge>
                                                    </div>
                                                    {classItem.period_start && (
                                                        <div className="flex items-center gap-1 text-muted-foreground">
                                                            <Clock className="h-3 w-3" />
                                                            <span>{formatTime(classItem.period_start)} - {formatTime(classItem.period_end)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <Users className="h-3 w-3" />
                                                        <span>{classItem.member_count} members</span>
                                                    </div>
                                                </CardDescription>
                                            </CardHeader>
                                        </Card>
                                    </Link>
                                ))}
                            </div>

                            {pagination && pagination.totalPages > 1 && (
                                <div className="flex items-center justify-center gap-4 mt-6">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    
                                    <span className="text-sm text-muted-foreground">
                                        Page {page} of {pagination.totalPages}
                                    </span>
                                    
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                                        disabled={page === pagination.totalPages}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    )
}
