"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useUser } from "@/lib/AuthContext";
import { useRouter } from "next/router";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  Crown,
  ShieldAlert,
  Sparkles,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipForward,
  MessageSquare,
  X,
} from "lucide-react";
import Link from "next/link";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
  allVideos?: Array<{ _id: string; videotitle: string; filepath: string }>;
  onOpenComments?: () => void;
}

type GestureZone = "left" | "center" | "right";
type GestureOverlay =
  | "seek-forward"
  | "seek-backward"
  | "play"
  | "pause"
  | "next"
  | "close"
  | "comments"
  | null;

export default function VideoPlayer({
  video,
  allVideos = [],
  onOpenComments,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tapCountRef = useRef(0);
  const lastTapZoneRef = useRef<GestureZone | null>(null);

  const { user } = useUser();
  const router = useRouter();

  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [gestureOverlay, setGestureOverlay] = useState<GestureOverlay>(null);
  const [gestureZone, setGestureZone] = useState<GestureZone>("center");
  const [seekAmount, setSeekAmount] = useState(0);
  const [ripples, setRipples] = useState<
    Array<{ id: number; x: number; y: number }>
  >([]);

  // ─── Plan-based watch limit ───────────────────────────────────────────────
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);

    const userPlan = user?.plan || "free";
    let limitInSeconds = 300;
    if (userPlan === "bronze") limitInSeconds = 420;
    else if (userPlan === "silver") limitInSeconds = 600;
    else if (userPlan === "gold") limitInSeconds = 999999;

    if (videoRef.current.currentTime >= limitInSeconds) {
      videoRef.current.pause();
      setIsPlaying(false);
      setIsUpgradeModalOpen(true);
    }
  };

  const getPlanLimitLabel = () => {
    const userPlan = user?.plan || "free";
    if (userPlan === "bronze") return "7 minutes";
    if (userPlan === "silver") return "10 minutes";
    return "5 minutes";
  };

  // ─── Controls auto-hide ───────────────────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  // ─── Playback helpers ─────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      vid.play();
      setIsPlaying(true);
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  }, []);

  const seekBy = useCallback((seconds: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.currentTime = Math.max(0, Math.min(vid.duration, vid.currentTime + seconds));
  }, []);

  const skipToNext = useCallback(() => {
    if (!allVideos || allVideos.length === 0) return;
    const currentIndex = allVideos.findIndex((v) => v._id === video._id);
    const nextIndex = (currentIndex + 1) % allVideos.length;
    router.push(`/watch/${allVideos[nextIndex]._id}`);
  }, [allVideos, video._id, router]);

  // ─── Gesture overlay flash ────────────────────────────────────────────────
  const flashOverlay = useCallback(
    (type: GestureOverlay, zone: GestureZone, amount = 0) => {
      setGestureOverlay(type);
      setGestureZone(zone);
      setSeekAmount(amount);
      setTimeout(() => setGestureOverlay(null), 800);
    },
    []
  );

  // ─── Ripple effect ────────────────────────────────────────────────────────
  const addRipple = useCallback((x: number, y: number) => {
    const id = Date.now();
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(
      () => setRipples((prev) => prev.filter((r) => r.id !== id)),
      600
    );
  }, []);

  // ─── Core tap handler ─────────────────────────────────────────────────────
  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ("touches" in e) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      const width = rect.width;

      // Determine zone
      const zone: GestureZone =
        relX < width * 0.33
          ? "left"
          : relX > width * 0.67
          ? "right"
          : "center";

      addRipple(relX, relY);
      resetControlsTimer();

      // If zone switches, reset tap count
      if (lastTapZoneRef.current !== zone) {
        tapCountRef.current = 0;
        lastTapZoneRef.current = zone;
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      }

      tapCountRef.current += 1;
      const count = tapCountRef.current;

      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

      tapTimerRef.current = setTimeout(() => {
        const finalCount = tapCountRef.current;
        tapCountRef.current = 0;
        lastTapZoneRef.current = null;

        if (finalCount === 1 && zone === "center") {
          // Single tap center → play/pause
          togglePlay();
          flashOverlay(isPlaying ? "pause" : "play", "center");
        } else if (finalCount === 2 && zone === "right") {
          // Double-tap right → +10s
          seekBy(10);
          flashOverlay("seek-forward", "right", 10);
        } else if (finalCount === 2 && zone === "left") {
          // Double-tap left → -10s
          seekBy(-10);
          flashOverlay("seek-backward", "left", -10);
        } else if (finalCount === 3 && zone === "center") {
          // Triple tap center → next video
          flashOverlay("next", "center");
          setTimeout(skipToNext, 600);
        } else if (finalCount === 3 && zone === "right") {
          // Triple tap right → close website
          flashOverlay("close", "right");
          setTimeout(() => window.close(), 700);
        } else if (finalCount === 3 && zone === "left") {
          // Triple tap left → open comments
          flashOverlay("comments", "left");
          setTimeout(() => onOpenComments?.(), 500);
        }
      }, 300);
    },
    [
      addRipple,
      resetControlsTimer,
      togglePlay,
      seekBy,
      skipToNext,
      onOpenComments,
      isPlaying,
      flashOverlay,
    ]
  );

  // ─── Volume / fullscreen / progress ──────────────────────────────────────
  const toggleMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(vid.muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setVolume(val);
      setIsMuted(val === 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ─── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onLoaded = () => setDuration(vid.duration);
    vid.addEventListener("loadedmetadata", onLoaded);
    return () => vid.removeEventListener("loadedmetadata", onLoaded);
  }, []);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, []);

  // ─── Overlay label helpers ────────────────────────────────────────────────
  const overlayContent: Record<
    Exclude<GestureOverlay, null>,
    { icon: React.ReactNode; label: string }
  > = {
    "seek-forward": {
      icon: <SkipForward className="w-8 h-8" />,
      label: "+10s",
    },
    "seek-backward": {
      icon: (
        <SkipForward className="w-8 h-8 scale-x-[-1]" />
      ),
      label: "-10s",
    },
    play: { icon: <Play className="w-8 h-8" />, label: "Play" },
    pause: { icon: <Pause className="w-8 h-8" />, label: "Pause" },
    next: { icon: <SkipForward className="w-8 h-8" />, label: "Next Video" },
    close: { icon: <X className="w-8 h-8" />, label: "Closing..." },
    comments: {
      icon: <MessageSquare className="w-8 h-8" />,
      label: "Comments",
    },
  };

  const zoneStyle: Record<GestureZone, string> = {
    left: "left-0 w-1/3",
    center: "left-1/3 w-1/3",
    right: "right-0 w-1/3",
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="relative aspect-video bg-black rounded-xl overflow-hidden select-none group"
      onMouseMove={resetControlsTimer}
      onClick={handleTap}
      onTouchEnd={handleTap}
      style={{ cursor: showControls ? "default" : "none" }}
    >
      {/* ── Video element ── */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        poster={`/placeholder.svg?height=480&width=854`}
      >
        <source
          src={`${
            process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"
          }/video/serve/${video?._id}`}
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>

      {/* ── Ripple effects ── */}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="pointer-events-none absolute rounded-full border-2 border-white/50 animate-ping"
          style={{
            left: r.x - 20,
            top: r.y - 20,
            width: 40,
            height: 40,
          }}
        />
      ))}

      {/* ── Gesture zone flash overlays ── */}
      {gestureOverlay && (
        <div
          className={`absolute top-0 h-full ${zoneStyle[gestureZone]} flex items-center justify-center pointer-events-none z-20 transition-opacity duration-200`}
          style={{ background: "rgba(0,0,0,0.35)" }}
        >
          <div className="flex flex-col items-center gap-1 text-white animate-bounce-once">
            {overlayContent[gestureOverlay].icon}
            <span className="text-xs font-bold tracking-wide drop-shadow">
              {overlayContent[gestureOverlay].label}
            </span>
          </div>
        </div>
      )}

      {/* ── Gesture hint zones (always rendered, invisible) ── */}
      <div className="absolute inset-0 flex pointer-events-none z-10">
        <div className="w-1/3 h-full" />
        <div className="w-1/3 h-full" />
        <div className="w-1/3 h-full" />
      </div>

      {/* ── Gesture guide tooltip (shown at start) ── */}
      <div
        className={`absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-opacity duration-500 ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex gap-3 bg-black/70 backdrop-blur-sm rounded-full px-4 py-1.5 text-white/70 text-[10px] font-medium tracking-wide whitespace-nowrap">
          <span>← 2× Seek -10s</span>
          <span>|</span>
          <span>1× Pause · 3× Next</span>
          <span>|</span>
          <span>2× Seek +10s →</span>
        </div>
      </div>

      {/* ── Custom Controls Bar ── */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 ${
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div className="px-3 pb-1">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 accent-red-500 cursor-pointer rounded-full"
            style={{
              background: `linear-gradient(to right, #ef4444 ${
                (currentTime / (duration || 1)) * 100
              }%, rgba(255,255,255,0.2) 0%)`,
            }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between px-4 pb-3 gap-3 bg-gradient-to-t from-black/80 to-transparent">
          {/* Left: play + volume */}
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="text-white hover:text-red-400 transition-colors"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={toggleMute}
              className="text-white hover:text-red-400 transition-colors"
              aria-label="Toggle mute"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 accent-white cursor-pointer"
            />

            <span className="text-white text-xs font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right: fullscreen */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-red-400 transition-colors"
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Big play button (center when paused) ── */}
      {!isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur flex items-center justify-center border border-white/20 shadow-lg">
            <Play className="w-7 h-7 text-white ml-1" />
          </div>
        </div>
      )}

      {/* ── Watch-Limit Upgrade Dialog ── */}
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
                You are currently on the{" "}
                <span className="font-semibold text-yellow-500 uppercase">
                  {user?.plan || "free"} plan
                </span>
                .
              </p>
              <p className="text-zinc-500 mt-1">
                Your current watch limit is capped at{" "}
                <span className="font-bold text-white">
                  {getPlanLimitLabel()}
                </span>{" "}
                per video.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2 text-xs">
              <p className="flex items-center justify-center gap-1.5 text-yellow-500 font-semibold">
                <Sparkles className="w-3.5 h-3.5 animate-spin-slow" /> Upgrade
                for Unlimited Access!
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
