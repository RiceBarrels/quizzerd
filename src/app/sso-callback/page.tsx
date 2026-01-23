'use client';

import { useEffect } from 'react';
import { useSignIn, useSignUp } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SSOCallback() {
    const { signIn, setActive: setSignInActive } = useSignIn();
    const { signUp, setActive: setSignUpActive } = useSignUp();
    const router = useRouter();

    useEffect(() => {
        async function handleCallback() {
            if (!signIn && !signUp) return;

            try {
                // Check if this is a sign-in or sign-up flow
                if (signIn?.status === 'complete' && signIn.createdSessionId) {
                    await setSignInActive?.({ session: signIn.createdSessionId });
                    router.push('/exam');
                    return;
                }

                if (signUp?.status === 'complete' && signUp.createdSessionId) {
                    await setSignUpActive?.({ session: signUp.createdSessionId });
                    router.push('/exam');
                    return;
                }

                // Handle external account verification
                if (signIn?.firstFactorVerification?.status === 'transferable') {
                    // User exists, complete sign-in
                    const result = await signIn.create({ transfer: true });
                    if (result.status === 'complete' && result.createdSessionId) {
                        await setSignInActive?.({ session: result.createdSessionId });
                        router.push('/exam');
                    }
                    return;
                }

                if (signUp?.verifications?.externalAccount?.status === 'transferable') {
                    // New user from OAuth, complete sign-up
                    const result = await signUp.create({ transfer: true });
                    if (result.status === 'complete' && result.createdSessionId) {
                        await setSignUpActive?.({ session: result.createdSessionId });
                        router.push('/exam');
                    }
                    return;
                }

                // Default redirect if nothing matches
                router.push('/sign-in');
            } catch (err) {
                console.error('SSO callback error:', err);
                router.push('/sign-in');
            }
        }

        handleCallback();
    }, [signIn, signUp, setSignInActive, setSignUpActive, router]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">Completing sign in...</p>
            </div>
        </div>
    );
}
