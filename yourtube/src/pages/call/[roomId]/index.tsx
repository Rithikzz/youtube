import VideoCall from "@/components/VideoCall";
import { useRouter } from "next/router";
import Head from "next/head";

export default function CallRoomPage() {
  const router = useRouter();
  const { roomId } = router.query;

  if (!roomId || typeof roomId !== "string") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
        <p className="animate-pulse text-gray-400">Loading room...</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>YourTube Call · {roomId}</title>
        <meta name="description" content="Video call on YourTube" />
      </Head>
      <VideoCall roomId={roomId} />
    </>
  );
}
