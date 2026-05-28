"use client";

import { useRef, useState, useEffect } from "react";
import { useUser } from "@/lib/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Crown, ShieldAlert, Sparkles, LogIn } from "lucide-react";
import Link from "next/link";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
}

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { user } = useUser();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Monitor video playback time
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    
    // Determine play limit in seconds based on current plan
    const userPlan = user?.plan || "free";
    let limitInSeconds = 300; // Free plan (5 mins) default

    if (userPlan === "bronze") {
      limitInSeconds = 420; // 7 mins
    } else if (userPlan === "silver") {
      limitInSeconds = 600; // 10 mins
    } else if (userPlan === "gold") {
      limitInSeconds = 999999; // Unlimited watch time
    }

    // Exceeded limit check
    if (videoRef.current.currentTime >= limitInSeconds) {
      videoRef.current.pause();
      setIsUpgradeModalOpen(true);
    }
  };

  const getPlanLimitLabel = () => {
    const userPlan = user?.plan || "free";
    if (userPlan === "bronze") return "7 minutes";
    if (userPlan === "silver") return "10 minutes";
    return "5 minutes";
  };

  return (
    <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        onTimeUpdate={handleTimeUpdate}
        poster={`/placeholder.svg?height=480&width=854`}
      >
        <source
          src={`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/${video?.filepath}`}
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>

      {/* Watch-Limit Exceeded Premium Dialog */}
      <Dialog open={isUpgradeModalOpen} onOpenChange={setIsUpgradeModalOpen}>
        <DialogContent className="sm:max-w-md bg-zinc-950 text-white border-yellow-500/20">
          <DialogHeader className="text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center mb-2 border border-yellow-500/20 animate-pulse">
              <ShieldAlert className="w-6 h-6 text-yellow-500" />
            </div>
            <DialogTitle className="text-lg font-bold tracking-tight text-white">
              Playback Time Limit Reached
            </DialogTitle>
            <p className="text-xs text-zinc-400 mt-1">
              Upgrade your plan to continue watching this video.
            </p>
          </DialogHeader>

          <div className="py-4 text-center space-y-3">
            <div className="p-3 bg-zinc-900/60 rounded-lg border border-zinc-800 text-xs leading-normal">
              <p className="text-zinc-300">
                You are currently on the <span className="font-semibold text-yellow-500 uppercase">{user?.plan || "free"} plan</span>.
              </p>
              <p className="text-zinc-500 mt-1">
                Your current watch limit is capped at <span className="font-bold text-white">{getPlanLimitLabel()}</span> per video.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2 text-xs">
              <p className="flex items-center justify-center gap-1.5 text-yellow-500 font-semibold">
                <Sparkles className="w-3.5 h-3.5 animate-spin-slow" /> Upgrade for Unlimited Access!
              </p>
            </div>
          </div>

          <DialogFooter className="flex sm:flex-row gap-2 sm:justify-between items-center">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsUpgradeModalOpen(false)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Link href="/upgrade" className="w-full sm:w-auto">
              <Button
                type="button"
                onClick={() => setIsUpgradeModalOpen(false)}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-xs border-none shadow-md shadow-yellow-500/10 w-full"
              >
                <Crown className="w-4 h-4 mr-2" /> Upgrade Plan
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
