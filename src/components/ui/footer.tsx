"use server"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { HomeIcon, ListTodoIcon, Calendar1Icon } from "lucide-react"

export default async function Footer({ className }: { className?: string }) {
    const currentYear = new Date().getFullYear()
    return (
        <footer 
            className={cn(
                "border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60",
                "px-6 py-8 text-sm text-muted-foreground",
                className
            )}
            role="contentinfo"
        >
            <div className="container mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    {/* Brand Section */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold text-foreground">QuizZerd</h2>
                        <p className="text-sm leading-relaxed">
                            Your all-in-one education platform for creating, managing, and taking exams with advanced monitoring and assessment tools.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <nav aria-label="Footer navigation">
                        <h3 className="text-base font-semibold text-foreground mb-4">Quick Links</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link 
                                    href="/" 
                                    className="flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer"
                                >
                                    <HomeIcon className="h-4 w-4" />
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    href="/exam" 
                                    className="flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer"
                                >
                                    <ListTodoIcon className="h-4 w-4" />
                                    Exams
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    href="/calender" 
                                    className="flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer"
                                >
                                    <Calendar1Icon className="h-4 w-4" />
                                    Calendar
                                </Link>
                            </li>
                        </ul>
                    </nav>

                    {/* Resources */}
                    <nav aria-label="Footer resources">
                        <h3 className="text-base font-semibold text-foreground mb-4">Resources</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link 
                                    href="/about" 
                                    className="hover:text-foreground transition-colors cursor-pointer"
                                >
                                    About Us
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    href="/help" 
                                    className="hover:text-foreground transition-colors cursor-pointer"
                                >
                                    Help Center
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    href="/features" 
                                    className="hover:text-foreground transition-colors cursor-pointer"
                                >
                                    Features
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    href="/contact" 
                                    className="hover:text-foreground transition-colors cursor-pointer"
                                >
                                    Contact
                                </Link>
                            </li>
                        </ul>
                    </nav>

                    {/* Legal */}
                    <nav aria-label="Footer legal">
                        <h3 className="text-base font-semibold text-foreground mb-4">Legal</h3>
                        <ul className="space-y-3">
                            <li>
                                <Link 
                                    href="/privacy" 
                                    className="hover:text-foreground transition-colors cursor-pointer"
                                >
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    href="/terms" 
                                    className="hover:text-foreground transition-colors cursor-pointer"
                                >
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    href="/cookie-policy" 
                                    className="hover:text-foreground transition-colors cursor-pointer"
                                >
                                    Cookie Policy
                                </Link>
                            </li>
                            <li>
                                <Link 
                                    href="/site-map" 
                                    className="hover:text-foreground transition-colors cursor-pointer"
                                >
                                    Sitemap
                                </Link>
                            </li>
                        </ul>
                    </nav>
                </div>

                {/* Bottom Bar */}
                <div className="border-t pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-center md:text-left">
                        © {currentYear} QuizZerd. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6 text-xs">
                        <span>Education Platform</span>
                        <span>•</span>
                        <span>Online Exam System</span>
                        <span>•</span>
                        <span>Assessment Tools</span>
                    </div>
                </div>
            </div>
        </footer>
    )
}
