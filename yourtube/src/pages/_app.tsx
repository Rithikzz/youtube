import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";
import SignInDialog from "@/components/SignInDialog";

export default function App({ Component, pageProps }: AppProps) {
  // A missing Vercel environment variable used to crash the entire application
  // during hydration because GoogleOAuthProvider rejects an empty client ID.
  // Keep the shell available and make the sign-in control fail gracefully until
  // a real Google client ID is configured.
  const googleClientId =
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    "missing-google-client-id.apps.googleusercontent.com";

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <UserProvider>
        <div className="min-h-screen bg-white text-black">
          <title>Your-Tube Clone</title>
          <Header />
          <Toaster />
          {/* Global Sign-In dialog — triggered from anywhere via context */}
          <SignInDialog />
          <div className="flex pb-16 md:pb-0 w-full">
            <Sidebar />
            <div className="flex-1 min-w-0">
              <Component {...pageProps} />
            </div>
          </div>
        </div>
      </UserProvider>
    </GoogleOAuthProvider>
  );
}
