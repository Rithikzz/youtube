import React, { useEffect, useState } from "react";
import Videocard from "@/components/videocard";
import axiosInstance from "@/lib/axiosinstance";
import { PlaySquare, Compass } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SubscriptionsPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [subscribedChannels, setSubscribedChannels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load subscribed channels from localStorage
    const subs = JSON.parse(localStorage.getItem("yourtube_subscriptions") || "[]");
    setSubscribedChannels(subs);

    const fetchVideos = async () => {
      try {
        const res = await axiosInstance.get("/video/getall");
        setVideos(Array.isArray(res.data) ? res.data : []);
      } catch (error) {
        console.error("Error fetching videos:", error);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  const filteredVideos = videos.filter((video) =>
    subscribedChannels.includes(video.videochanel)
  );

  return (
    <main className="flex-1 p-6 space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <PlaySquare className="w-6 h-6 text-red-600" />
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Subscriptions
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <p className="text-sm text-gray-500 animate-pulse">Loading subscriptions...</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <PlaySquare className="w-16 h-16 text-zinc-300 dark:text-zinc-700" />
          <div className="space-y-1">
            <h3 className="font-semibold text-lg text-zinc-800 dark:text-zinc-200">
              Don't miss new videos
            </h3>
            <p className="text-sm text-zinc-500 max-w-sm">
              Subscribe to your favorite channels to see their latest uploads right here.
            </p>
          </div>
          <Link href="/">
            <Button className="mt-2 bg-red-600 hover:bg-red-700 text-white font-medium flex items-center gap-2">
              <Compass className="w-4 h-4" /> Go to Home Feed
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVideos.map((video: any) => (
            <Videocard key={video._id} video={video} />
          ))}
        </div>
      )}
    </main>
  );
}
