import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
  Crown
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";
import Link from "next/link";

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user, login } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [subscribedChannels, setSubscribedChannels] = useState<string[]>([]);

  useEffect(() => {
    const subs = JSON.parse(localStorage.getItem("yourtube_subscriptions") || "[]");
    setSubscribedChannels(subs);
  }, [video]);

  const isSubscribed = subscribedChannels.includes(video.videochanel);

  const handleSubscribe = () => {
    let updated;
    if (isSubscribed) {
      updated = subscribedChannels.filter((c) => c !== video.videochanel);
    } else {
      updated = [...subscribedChannels, video.videochanel];
    }
    setSubscribedChannels(updated);
    localStorage.setItem("yourtube_subscriptions", JSON.stringify(updated));
  };

  // const user: any = {
  //   id: "1",
  //   name: "John Doe",
  //   email: "john@example.com",
  //   image: "https://github.com/shadcn.png?height=32&width=32",
  // };
  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }, [video]);

  useEffect(() => {
    const handleviews = async () => {
      if (user) {
        try {
          return await axiosInstance.post(`/history/${video._id}`, {
            userId: user?._id,
          });
        } catch (error) {
          return console.log(error);
        }
      } else {
        return await axiosInstance.post(`/history/views/${video?._id}`);
      }
    };
    handleviews();
  }, [user]);
  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.liked) {
        if (isLiked) {
          setlikes((prev: any) => prev - 1);
          setIsLiked(false);
        } else {
          setlikes((prev: any) => prev + 1);
          setIsLiked(true);
          if (isDisliked) {
            setDislikes((prev: any) => prev - 1);
            setIsDisliked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleWatchLater = async () => {
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.watchlater) {
        setIsWatchLater(!isWatchLater);
      } else {
        setIsWatchLater(false);
      }
    } catch (error) {
      console.log(error);
    }
  };
  const handleDislike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (!res.data.liked) {
        if (isDisliked) {
          setDislikes((prev: any) => prev - 1);
          setIsDisliked(false);
        } else {
          setDislikes((prev: any) => prev + 1);
          setIsDisliked(true);
          if (isLiked) {
            setlikes((prev: any) => prev - 1);
            setIsLiked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDownloadBtn = async () => {
    if (!user) return alert("Please login to download.");
    try {
      const res = await axiosInstance.post("/download/request", {
        userId: user._id,
        videoId: video._id,
      });

      if (res.data.user) {
        login(res.data.user);
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      const downloadUrl = `${backendUrl}/download/file/${video._id}?userId=${user._id}`;

      window.open(downloadUrl, "_blank");

      toast.success("Download started!");
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error("Daily download limit reached. Upgrade to Premium for unlimited downloads.");
      } else if (error.response?.status === 404) {
        toast.error("Video file not found on server.");
      } else {
        console.log(error);
        toast.error("Download failed. Please try again.");
      }
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full lg:w-auto gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback>{video.videochanel[0]}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium truncate max-w-[120px] sm:max-w-xs">{video.videochanel}</h3>
              <p className="text-xs sm:text-sm text-gray-600">1.2M subscribers</p>
            </div>
          </div>
          <Button
            onClick={handleSubscribe}
            className={`rounded-full font-semibold transition ${
              isSubscribed
                ? "bg-zinc-200 text-zinc-800 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200"
                : "bg-red-600 hover:bg-red-700 text-white"
            }`}
          >
            {isSubscribed ? "Subscribed" : "Subscribe"}
          </Button>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex items-center bg-gray-100 rounded-full shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 ${
                  isLiked ? "fill-black text-black" : ""
                }`}
              />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-6 bg-gray-300" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 ${
                  isDisliked ? "fill-black text-black" : ""
                }`}
              />
              {dislikes.toLocaleString()}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-gray-100 rounded-full shrink-0 ${
              isWatchLater ? "text-primary" : ""
            }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 rounded-full shrink-0"
          >
            <Share className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 rounded-full shrink-0"
            onClick={handleDownloadBtn}
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Download
          </Button>
          {!user?.isPremium && (
            <Link href="/upgrade" className="shrink-0">
              <Button
                variant="default"
                size="sm"
                className="bg-yellow-500 hover:bg-yellow-600 text-black rounded-full font-semibold"
              >
                <Crown className="w-4 h-4 mr-2" />
                Premium
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="bg-gray-100 rounded-full shrink-0 min-w-[36px]"
          >
            <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>
      </div>
      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2">
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
        </div>
        <div className={`text-sm ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>
            Sample video description. This would contain the actual video
            description from the database.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>
    </div>
  );
};

export default VideoInfo;
