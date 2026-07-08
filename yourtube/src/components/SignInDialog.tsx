"use client";

import React, { useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Loader2, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useUser } from "@/lib/AuthContext";

declare global {
  interface Window {
    phoneEmailReceiver?: (userObj: { user_json_url: string }) => void;
  }
}

const SignInDialog = () => {
  const { isSignInDialogOpen, setIsSignInDialogOpen, onGoogleSuccess, onPhoneEmailSuccess, isSigningIn, setIsSigningIn } = useUser();

  // Register the global callback for phone.email widget
  useEffect(() => {
    window.phoneEmailReceiver = (userObj: { user_json_url: string }) => {
      const user_json_url = userObj.user_json_url;
      onPhoneEmailSuccess(user_json_url);
    };
    return () => {
      delete window.phoneEmailReceiver;
    };
  }, [onPhoneEmailSuccess]);

  // Load the phone.email widget script when dialog opens
  useEffect(() => {
    if (!isSignInDialogOpen) return;

    // Create the script element and append it to document.body
    // This ensures it runs after the dialog DOM is painted
    const script = document.createElement("script");
    script.src = "https://www.phone.email/verify_email_v1.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [isSignInDialogOpen]);

  const googleLogin = useGoogleLogin({
    onSuccess: onGoogleSuccess,
    onError: () => setIsSigningIn(false),
    onNonOAuthError: () => setIsSigningIn(false),
  });

  const handleGoogleClick = () => {
    setIsSigningIn(true);
    googleLogin();
  };

  return (
    <Dialog open={isSignInDialogOpen} onOpenChange={setIsSignInDialogOpen}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl shadow-black/60">
        {/* Header gradient banner */}
        <div className="relative bg-gradient-to-br from-red-600/20 via-zinc-900 to-zinc-950 px-6 pt-8 pb-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-600/10 to-transparent" />
          <div className="relative flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 bg-red-600/10 border border-red-500/30 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/10">
              <div className="bg-red-600 p-1.5 rounded-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </div>
            </div>
            <div>
              <DialogTitle className="text-white text-xl font-bold tracking-tight flex items-center gap-2 justify-center">
                Sign in to YourTube
                <span className="text-[10px] font-bold text-red-400 bg-red-400/10 border border-red-400/20 px-1.5 py-0.5 rounded tracking-wider">
                  2.0
                </span>
              </DialogTitle>
              <p className="text-zinc-400 text-xs mt-1">Choose how you want to continue</p>
            </div>
          </div>
        </div>

        {/* Login options */}
        <div className="px-6 pb-6 space-y-3">
          {/* Google OAuth button */}
          <Button
            className="w-full h-11 bg-white hover:bg-gray-50 text-gray-800 font-semibold text-sm border border-gray-200 shadow-sm flex items-center gap-3 justify-center"
            onClick={handleGoogleClick}
            disabled={isSigningIn}
          >
            {isSigningIn ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                <span className="text-gray-500">Signing in...</span>
              </>
            ) : (
              <>
                {/* Official Google G colors */}
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-zinc-600 text-xs font-medium">or</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          {/* phone.email OTP section */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div>
                <p className="text-white text-xs font-semibold">Email OTP</p>
                <p className="text-zinc-500 text-[11px]">Verify via one-time passcode</p>
              </div>
              <div className="ml-auto">
                <span className="text-[9px] font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded tracking-wider uppercase flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  Secure
                </span>
              </div>
            </div>

            {/* phone.email widget container */}
            {/* Setting dangerouslySetInnerHTML={{ __html: "" }} tells React to bypass reconciling the children of this div, protecting the button injected by the script. */}
            <div
              className="pe_verify_email flex items-center justify-center min-h-[44px]"
              data-client-id={process.env.NEXT_PUBLIC_PHONE_EMAIL_CLIENT_ID || "15928372574955456318"}
              dangerouslySetInnerHTML={{ __html: "" }}
            />
          </div>

          {/* Trust badge */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <Sparkles className="w-3 h-3 text-zinc-600" />
            <p className="text-zinc-600 text-[11px]">
              Your data is never shared with third parties
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SignInDialog;
