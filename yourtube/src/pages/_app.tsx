import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { UserProvider } from "../lib/AuthContext";
import { GoogleOAuthProvider } from "@react-oauth/google";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
      <UserProvider>
        <div className="min-h-screen bg-white text-black">
          <title>Your-Tube Clone</title>
          <Header />
          <Toaster />
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
