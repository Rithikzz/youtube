import Comments from "@/components/Comments";
import RelatedVideos from "@/components/RelatedVideos";
import VideoInfo from "@/components/VideoInfo";
import Videopplayer from "@/components/Videopplayer";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";

const WatchPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const [videos, setvideo] = useState<any>(null);
  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [loading, setloading] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const commentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchvideo = async () => {
      if (!id || typeof id !== "string") return;
      try {
        const res = await axiosInstance.get("/video/getall");
        const video = res.data?.filter((vid: any) => vid._id === id);
        setvideo(video[0]);
        setAllVideos(res.data || []);
      } catch (error) {
        console.log(error);
      } finally {
        setloading(false);
      }
    };
    fetchvideo();
  }, [id]);

  const handleOpenComments = () => {
    setCommentsOpen(true);
    setTimeout(() => {
      commentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500 text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!videos) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500 text-sm">Video not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto p-0 md:p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 md:gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-4">
            <Videopplayer
              video={videos}
              allVideos={allVideos}
              onOpenComments={handleOpenComments}
            />
            <div className="px-4 md:px-0">
              <VideoInfo video={videos} />
            </div>

            {/* Comments — always mounted, scrolled into view on gesture */}
            <div ref={commentsRef} className="px-4 md:px-0">
              <Comments videoId={id} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 px-4 md:px-0 pb-16 md:pb-0">
            <RelatedVideos videos={allVideos.filter((v: any) => v._id !== id)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchPage;
