import { SignUp } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCapIcon, CheckCircle } from "lucide-react";
import { Link } from "next-view-transitions";

export default function SignUpPage() {
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
            <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8">
                {/* Features Section */}
                <Card className="hidden lg:flex flex-col justify-center p-8 py-18 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20" style={{ viewTransitionName: 'fade-and-scale' }}>
                    <CardHeader>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                                <GraduationCapIcon className="h-6 w-6 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold">QuizZerd</h2>
                        </div>
                        <CardTitle className="text-xl mb-2">
                            Join thousands of students and educators
                        </CardTitle>
                        <CardDescription className="text-base">
                            Create, manage, and take exams with ease.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                                <h3 className="font-medium mb-1">Create & Share Exams</h3>
                                <p className="text-sm text-muted-foreground">
                                    Build exams with multiple question types and share them publicly or privately
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                                <h3 className="font-medium mb-1">Manage Classes</h3>
                                <p className="text-sm text-muted-foreground">
                                    Organize students, track progress, and manage assignments
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                                <h3 className="font-medium mb-1">Track Performance</h3>
                                <p className="text-sm text-muted-foreground">
                                    Monitor scores, view analytics, and identify areas for improvement
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                                <h3 className="font-medium mb-1">Collaborate</h3>
                                <p className="text-sm text-muted-foreground">
                                    Work together with other educators to create comprehensive assessments
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Sign Up Form */}
                <Card className="w-full" style={{ viewTransitionName: 'auth-card' }}>
                    <CardHeader className="text-center space-y-2">
                        <div className="flex justify-center">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <GraduationCapIcon className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold">Welcome User!</CardTitle>
                        <CardDescription>
                            Sign up to access your exams and classes
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center flex-col">
                        <SignUp 
                            appearance={{
                                elements: {
                                    rootBox: "mx-auto w-full",
                                    cardBox: "border-none shadow-none! w-full",
                                    card: "shadow-none p-4",
                                    headerTitle: "hidden",
                                    headerSubtitle: "hidden",
                                    footer: "hidden",
                                    formButtonPrimary: 
                                        "bg-primary hover:bg-primary/90 text-primary-foreground",
                                    formFieldInput: 
                                        "border-input",
                                    footerActionLink: 
                                        "text-primary hover:text-primary/80",
                                    identityPreviewEditButton:
                                        "text-primary hover:text-primary/80",
                                    formFieldLabel:
                                        "text-foreground",
                                    dividerLine:
                                        "bg-border",
                                    dividerText:
                                        "text-muted-foreground",
                                    socialButtonsBlockButton:
                                        "border-input hover:bg-accent",
                                    socialButtonsBlockButtonText:
                                        "text-foreground font-normal",
                                    alternativeMethodsBlockButton:
                                        "border-input hover:bg-accent",
                                    alternativeMethodsBlockButtonText:
                                        "text-foreground",
                                    formHeaderTitle:
                                        "text-lg font-semibold"
                                }
                            }}
                            signInUrl="/sign-in"
                            forceRedirectUrl="/home"
                        />
                        <small className="text-center">Already have an Account? <Link href="sign-in" className="font-bold text-primary underline">Sign In</Link></small>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}