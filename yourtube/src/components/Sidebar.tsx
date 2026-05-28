import {
  Home,
  Compass,
  PlaySquare,
  Clock,
  ThumbsUp,
  History,
  User,
  Download,
  Crown
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "./ui/button";
import Channeldialogue from "./channeldialogue";
import PaymentDialogue from "./PaymentDialogue";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";

const Sidebar = () => {
  const { user, login } = useUser();

  const [isdialogeopen, setisdialogeopen] = useState(false);


  return (
    <aside className="w-64 bg-white  border-r min-h-screen p-2">
      <nav className="space-y-1">
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start">
            <Home className="w-5 h-5 mr-3" />
            Home
          </Button>
        </Link>
        <Link href="/explore">
          <Button variant="ghost" className="w-full justify-start">
            <Compass className="w-5 h-5 mr-3" />
            Explore
          </Button>
        </Link>
        <Link href="/subscriptions">
          <Button variant="ghost" className="w-full justify-start">
            <PlaySquare className="w-5 h-5 mr-3" />
            Subscriptions
          </Button>
        </Link>

        {user && (
          <>
            <div className="border-t pt-2 mt-2">
              <Link href="/history">
                <Button variant="ghost" className="w-full justify-start">
                  <History className="w-5 h-5 mr-3" />
                  History
                </Button>
              </Link>
              <Link href="/downloads">
                <Button variant="ghost" className="w-full justify-start">
                  <Download className="w-5 h-5 mr-3" />
                  Downloads
                </Button>
              </Link>
              <Link href="/liked">
                <Button variant="ghost" className="w-full justify-start">
                  <ThumbsUp className="w-5 h-5 mr-3" />
                  Liked videos
                </Button>
              </Link>
              <Link href="/watch-later">
                <Button variant="ghost" className="w-full justify-start">
                  <Clock className="w-5 h-5 mr-3" />
                  Watch later
                </Button>
              </Link>
              {user?.channelname ? (
                <Link href={`/channel/${user.id}`}>
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="w-5 h-5 mr-3" />
                    Your channel
                  </Button>
                </Link>
              ) : (
                <div className="px-2 py-1.5">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => setisdialogeopen(true)}
                  >
                    Create Channel
                  </Button>
                </div>
              )}
              {!user?.isPremium && (
                <div className="px-2 py-1.5 mt-2">
                  <Link href="/upgrade">
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-black flex items-center justify-center font-semibold"
                    >
                      <Crown className="w-4 h-4 mr-2" />
                      Premium
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </nav>
      <Channeldialogue
        isopen={isdialogeopen}
        onclose={() => setisdialogeopen(false)}
        mode="create"
      />
    </aside>
  );
};

export default Sidebar;
