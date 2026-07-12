import Head from "next/head";
import { useRouter } from "next/router";
import { useState } from "react";
import { Video, Link2, Users, Monitor, Circle } from "lucide-react";

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function CallLobby() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  const startNewCall = () => {
    const roomId = generateRoomId();
    router.push(`/call/${roomId}`);
  };

  const joinCall = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    router.push(`/call/${code}`);
  };

  return (
    <>
      <Head>
        <title>YourTube · Video Call</title>
      </Head>
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg shadow-red-600/30">
              Y
            </div>
            <h1 className="text-2xl font-bold">YourTube Calls</h1>
            <p className="text-gray-400 text-sm mt-2">
              Video calls with screen sharing &amp; recording
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <Video className="w-5 h-5" />, label: "HD Video" },
              { icon: <Monitor className="w-5 h-5" />, label: "Screen Share" },
              { icon: <Circle className="w-5 h-5" />, label: "Recording" },
            ].map((f) => (
              <div
                key={f.label}
                className="bg-gray-900 rounded-xl p-3 flex flex-col items-center gap-2 text-xs text-gray-400 border border-gray-800"
              >
                <div className="text-blue-400">{f.icon}</div>
                {f.label}
              </div>
            ))}
          </div>

          {/* Start new call */}
          <button
            onClick={startNewCall}
            id="start-new-call"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-red-600/20 text-base"
          >
            <Video className="w-5 h-5" />
            Start a new call
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 text-gray-600 text-sm">
            <div className="flex-1 h-px bg-gray-800" />
            or join with a code
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          {/* Join by code */}
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && joinCall()}
              placeholder="Enter room code (e.g. AB12CD)"
              maxLength={8}
              id="room-code-input"
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-blue-500 placeholder-gray-600 tracking-widest uppercase"
            />
            <button
              onClick={joinCall}
              id="join-call-btn"
              disabled={!joinCode.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed px-5 rounded-xl transition-colors flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Join
            </button>
          </div>

          <p className="text-center text-xs text-gray-600">
            Share the room code or link with friends to invite them
          </p>
        </div>
      </div>
    </>
  );
}
