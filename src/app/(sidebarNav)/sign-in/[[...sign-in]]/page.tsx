'use client';

import { SignIn, useSignIn } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, GraduationCapIcon } from "lucide-react";
import { Link } from "next-view-transitions";
import { Button } from "@/components/ui/button";
import { useIsNative, getElectronAPI } from "@/hooks/use-is-native";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function SignInPage() {
    const { isNative, isLoading: isNativeLoading } = useIsNative();
    const { signIn, isLoaded } = useSignIn();
    const [oauthLoading, setOauthLoading] = useState<string | null>(null);

    const handleOAuthInBrowser = async (provider: 'oauth_google' | 'oauth_apple' | 'oauth_microsoft') => {
        if (!isLoaded || !signIn) return;

        setOauthLoading(provider);

        try {
            // Create OAuth URL
            const result = await signIn.create({
                strategy: provider,
                redirectUrl: `${window.location.origin}/sso-callback`,
                actionCompleteRedirectUrl: `${window.location.origin}/exam`
            });

            // Get the external verification URL
            const externalUrl = result.firstFactorVerification?.externalVerificationRedirectURL;

            if (externalUrl) {
                const electronAPI = getElectronAPI();
                if (electronAPI?.openExternal) {
                    // Open in system browser (Electron)
                    await electronAPI.openExternal(externalUrl.toString());
                } else {
                    // Fallback: redirect in current window
                    window.location.href = externalUrl.toString();
                }
            }
        } catch (err) {
            console.error('OAuth error:', err);
            // Fallback to normal Clerk OAuth on error
            try {
                await signIn.authenticateWithRedirect({
                    strategy: provider,
                    redirectUrl: '/sso-callback',
                    redirectUrlComplete: '/exam'
                });
            } catch (redirectErr) {
                console.error('OAuth redirect fallback error:', redirectErr);
            }
        } finally {
            setOauthLoading(null);
        }
    };
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
                                <h3 className="font-medium mb-1">Google Classroom Integration</h3>
                                <p className="text-sm text-muted-foreground">
                                    Publish exams directly to Google Classroom for easy access
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

                <Card className="w-full" style={{ viewTransitionName: 'auth-card' }}>
                    <CardHeader className="text-center space-y-2">
                        <div className="flex justify-center">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <GraduationCapIcon className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
                        <CardDescription>
                            Sign in to access your exams
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center flex-col">
                        {/* Show custom OAuth buttons when in Electron */}
                        {isNative && !isNativeLoading && (
                            <div className="space-y-3 mb-4">
                                <Button
                                    variant="outline"
                                    className="w-full h-10 gap-3"
                                    onClick={() => handleOAuthInBrowser('oauth_google')}
                                    disabled={oauthLoading === 'oauth_google'}
                                >
                                    {oauthLoading === 'oauth_google' ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <svg className="h-4 w-4" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                        </svg>
                                    )}
                                    Continue with Google
                                </Button>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-background px-2 text-muted-foreground">
                                            Or continue with email
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <SignIn
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
                                    // Hide social buttons in Electron (we show our own)
                                    socialButtonsBlockButton: isNative
                                        ? "hidden"
                                        : "border-input hover:bg-accent",
                                    socialButtonsBlockButtonText:
                                        "text-foreground font-normal",
                                    socialButtonsProviderIcon: isNative ? "hidden" : "",
                                    socialButtonsBlockButtonArrow: isNative ? "hidden" : "",
                                    dividerRow: isNative ? "hidden" : "",
                                    alternativeMethodsBlockButton:
                                        "border-input hover:bg-accent",
                                    alternativeMethodsBlockButtonText:
                                        "text-foreground",
                                    formHeaderTitle:
                                        "text-lg font-semibold"
                                }
                            }}
                            signUpUrl="/sign-up"
                            forceRedirectUrl="/exam"
                        />
                        <small className="text-center">Doesn&apos;t have an Account? <Link href="sign-up" className="font-bold text-primary underline">Sign Up</Link></small>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}