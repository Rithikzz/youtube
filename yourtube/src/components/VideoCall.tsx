"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Circle,
  StopCircle,
  Phone,
  PhoneOff,
  Copy,
  Check,
  MessageSquare,
  X,
  Send,
  Users,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/lib/AuthContext";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

interface ChatMessage {
  from: string;
  message: string;
  time: string;
  self?: boolean;
}

interface PeerData {
  socketId: string;
  userName: string;
  pc: RTCPeerConnection;
  stream?: MediaStream;
  videoRef?: React.RefObject<HTMLVideoElement>;
}

interface VideoCallProps {
  roomId: string;
}

export default function VideoCall({ roomId }: VideoCallProps) {
  const { user } = useUser();

  // Refs
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerData>>(new Map());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // State
  const [joined, setJoined] = useState(false);
  const [peers, setPeers] = useState<PeerData[]>([]);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");

  const callLink = typeof window !== "undefined" ? window.location.href : "";

  // ─── Sync peers state from ref ────────────────────────────────────────────
  const syncPeers = useCallback(() => {
    setPeers([...peersRef.current.values()]);
  }, []);

  // ─── Create RTCPeerConnection for a remote peer ───────────────────────────
  const createPeerConnection = useCallback(
    (remoteSocketId: string, userName: string): RTCPeerConnection => {
      const pc = new RTCPeerConnection(ICE_SERVERS);
      const videoRef = React.createRef<HTMLVideoElement>();

      // Add local tracks
      localStreamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });

      // ICE candidates
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) {
          socketRef.current?.emit("ice-candidate", {
            to: remoteSocketId,
            candidate,
          });
        }
      };

      // Remote stream
      pc.ontrack = (event) => {
        const peer = peersRef.current.get(remoteSocketId);
        if (peer) {
          peer.stream = event.streams[0];
          if (peer.videoRef?.current) {
            peer.videoRef.current.srcObject = event.streams[0];
          }
          peersRef.current.set(remoteSocketId, { ...peer });
          syncPeers();
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setConnectionStatus("connected");
        }
      };

      peersRef.current.set(remoteSocketId, {
        socketId: remoteSocketId,
        userName,
        pc,
        videoRef: videoRef as React.RefObject<HTMLVideoElement>,
      });
      syncPeers();
      return pc;
    },
    [syncPeers]
  );

  // ─── Get user media ───────────────────────────────────────────────────────
  const getLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      toast.error("Could not access camera/microphone");
      throw err;
    }
  }, []);

  // ─── Join the room ────────────────────────────────────────────────────────
  const joinRoom = useCallback(async () => {
    await getLocalMedia();

    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionStatus("connected");
      socket.emit("join-room", {
        roomId,
        userName: user?.name || "Guest",
      });
      setJoined(true);
    });

    socket.on("disconnect", () => setConnectionStatus("disconnected"));

    // Existing peers in room — initiate offer to each
    socket.on("room-peers", async (peerIds: string[]) => {
      for (const peerId of peerIds) {
        const pc = createPeerConnection(peerId, "Peer");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", { to: peerId, offer });
      }
    });

    // New user joined — they will send offer to us
    socket.on(
      "user-joined",
      ({ socketId, userName }: { socketId: string; userName: string }) => {
        toast(`${userName} joined the call`, { icon: "👋" });
        createPeerConnection(socketId, userName);
      }
    );

    // Receive offer → answer
    socket.on(
      "offer",
      async ({
        from,
        offer,
      }: {
        from: string;
        offer: RTCSessionDescriptionInit;
      }) => {
        let peer = peersRef.current.get(from);
        if (!peer) {
          const pc = createPeerConnection(from, "Peer");
          peer = peersRef.current.get(from)!;
        }
        await peer.pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(answer);
        socket.emit("answer", { to: from, answer });
      }
    );

    // Receive answer
    socket.on(
      "answer",
      async ({
        from,
        answer,
      }: {
        from: string;
        answer: RTCSessionDescriptionInit;
      }) => {
        const peer = peersRef.current.get(from);
        if (peer) {
          await peer.pc.setRemoteDescription(
            new RTCSessionDescription(answer)
          );
        }
      }
    );

    // ICE candidate
    socket.on(
      "ice-candidate",
      async ({
        from,
        candidate,
      }: {
        from: string;
        candidate: RTCIceCandidateInit;
      }) => {
        const peer = peersRef.current.get(from);
        if (peer) {
          await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }
    );

    // Peer left
    socket.on("user-left", ({ socketId }: { socketId: string }) => {
      const peer = peersRef.current.get(socketId);
      if (peer) {
        peer.pc.close();
        peersRef.current.delete(socketId);
        syncPeers();
        toast("A participant left the call", { icon: "👋" });
      }
    });

    // In-call chat
    socket.on("call-message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Screen share events from peers
    socket.on(
      "peer-screen-share-started",
      ({ socketId }: { socketId: string }) => {
        toast("Peer started screen sharing", { icon: "🖥️" });
      }
    );
  }, [roomId, user, getLocalMedia, createPeerConnection, syncPeers]);

  // ─── Leave call ───────────────────────────────────────────────────────────
  const leaveCall = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    peersRef.current.forEach((peer) => peer.pc.close());
    peersRef.current.clear();
    socketRef.current?.disconnect();
    setJoined(false);
    setPeers([]);
    setIsScreenSharing(false);
    setIsRecording(false);
    if (typeof window !== "undefined") window.history.back();
  }, []);

  // ─── Toggle Camera ────────────────────────────────────────────────────────
  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsCamOn(track.enabled);
    }
  };

  // ─── Toggle Mic ───────────────────────────────────────────────────────────
  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMicOn(track.enabled);
    }
  };

  // ─── Screen Share ─────────────────────────────────────────────────────────
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      // Stop screen share — revert to camera
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      const camTrack = localStreamRef.current?.getVideoTracks()[0];
      if (camTrack) {
        peersRef.current.forEach(({ pc }) => {
          const sender = pc
            .getSenders()
            .find((s) => s.track?.kind === "video");
          sender?.replaceTrack(camTrack);
        });
        if (localVideoRef.current)
          localVideoRef.current.srcObject = localStreamRef.current;
      }
      socketRef.current?.emit("screen-share-stopped");
      setIsScreenSharing(false);
      toast("Screen sharing stopped");
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track in all peer connections
        peersRef.current.forEach(({ pc }) => {
          const sender = pc
            .getSenders()
            .find((s) => s.track?.kind === "video");
          sender?.replaceTrack(screenTrack);
        });

        // Show screen in local preview
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // Auto-stop when user clicks browser's "Stop sharing"
        screenTrack.onended = () => {
          toggleScreenShare();
        };

        socketRef.current?.emit("screen-share-started");
        setIsScreenSharing(true);
        toast.success("Screen sharing started");
      } catch (err: any) {
        if (err.name !== "NotAllowedError") {
          toast.error("Screen sharing failed");
        }
      }
    }
  };

  // ─── Recording ────────────────────────────────────────────────────────────
  const startRecording = () => {
    if (!localStreamRef.current) return;

    // Combine local + all remote streams
    const combinedStream = new MediaStream();
    localStreamRef.current
      .getTracks()
      .forEach((t) => combinedStream.addTrack(t));
    peersRef.current.forEach(({ stream }) => {
      stream?.getTracks().forEach((t) => combinedStream.addTrack(t));
    });

    recordedChunksRef.current = [];
    const recorder = new MediaRecorder(combinedStream, {
      mimeType: "video/webm;codecs=vp9,opus",
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `yourtube-call-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-")}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Recording saved to your device!");
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordingTime(0);
    toast("Recording started 🔴");
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  // Recording timer
  useEffect(() => {
    if (!isRecording) return;
    const t = setInterval(() => setRecordingTime((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [isRecording]);

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ─── Copy link ────────────────────────────────────────────────────────────
  const copyLink = () => {
    navigator.clipboard.writeText(callLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Call link copied!");
  };

  // ─── Send chat ────────────────────────────────────────────────────────────
  const sendMessage = () => {
    if (!chatInput.trim()) return;
    const msg: ChatMessage = {
      from: user?.name || "You",
      message: chatInput,
      time: new Date().toLocaleTimeString(),
      self: true,
    };
    setMessages((prev) => [...prev, msg]);
    socketRef.current?.emit("call-message", { roomId, message: chatInput });
    setChatInput("");
  };

  // ─── Auto-join on mount ───────────────────────────────────────────────────
  useEffect(() => {
    joinRoom();
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      socketRef.current?.disconnect();
    };
  }, []);

  // ─── Attach remote streams when peers update ──────────────────────────────
  useEffect(() => {
    peers.forEach((peer) => {
      if (peer.videoRef?.current && peer.stream) {
        peer.videoRef.current.srcObject = peer.stream;
      }
    });
  }, [peers]);

  // ─── Render ───────────────────────────────────────────────────────────────
  const totalParticipants = peers.length + 1;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center font-bold text-sm">
            Y
          </div>
          <span className="font-semibold text-sm">YourTube Call</span>
          <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full font-mono">
            {roomId}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className="flex items-center gap-1.5 text-xs">
            <Wifi
              className={`w-3.5 h-3.5 ${
                connectionStatus === "connected"
                  ? "text-green-400"
                  : "text-yellow-400 animate-pulse"
              }`}
            />
            <span
              className={
                connectionStatus === "connected"
                  ? "text-green-400"
                  : "text-yellow-400"
              }
            >
              {connectionStatus === "connected" ? "Connected" : "Connecting..."}
            </span>
          </div>

          {/* Participants count */}
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Users className="w-3.5 h-3.5" />
            <span>{totalParticipants}</span>
          </div>

          {/* Copy link */}
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Copied!" : "Share link"}
          </button>

          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-1.5 text-xs text-red-400 animate-pulse">
              <Circle className="w-2.5 h-2.5 fill-red-500 text-red-500" />
              REC {fmtTime(recordingTime)}
            </div>
          )}

          {/* Screen share indicator */}
          {isScreenSharing && (
            <div className="flex items-center gap-1.5 text-xs text-blue-400">
              <Monitor className="w-3.5 h-3.5" />
              Sharing screen
            </div>
          )}
        </div>
      </div>

      {/* ── Video Grid ── */}
      <div className="flex-1 p-4 overflow-auto">
        <div
          className={`grid gap-3 h-full ${
            totalParticipants === 1
              ? "grid-cols-1"
              : totalParticipants === 2
              ? "grid-cols-2"
              : totalParticipants <= 4
              ? "grid-cols-2"
              : "grid-cols-3"
          }`}
        >
          {/* Local video */}
          <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video group">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {!isCamOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl font-bold">
                  {(user?.name || "Y")[0].toUpperCase()}
                </div>
              </div>
            )}
            <div className="absolute bottom-3 left-3 text-xs bg-black/60 backdrop-blur px-2 py-1 rounded-lg">
              You {isScreenSharing && "• 🖥️ Sharing"}
            </div>
            {!isMicOn && (
              <div className="absolute top-3 right-3 bg-red-600/90 rounded-full p-1">
                <MicOff className="w-3 h-3" />
              </div>
            )}
          </div>

          {/* Remote peers */}
          {peers.map((peer) => (
            <div
              key={peer.socketId}
              className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video"
            >
              <video
                ref={peer.videoRef as React.RefObject<HTMLVideoElement>}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-3 left-3 text-xs bg-black/60 backdrop-blur px-2 py-1 rounded-lg">
                {peer.userName}
              </div>
            </div>
          ))}

          {/* Waiting placeholder when alone */}
          {peers.length === 0 && (
            <div className="flex flex-col items-center justify-center bg-gray-900/50 rounded-2xl aspect-video border-2 border-dashed border-gray-700">
              <Users className="w-10 h-10 text-gray-600 mb-3" />
              <p className="text-gray-500 text-sm font-medium">
                Waiting for others to join...
              </p>
              <p className="text-gray-600 text-xs mt-1">
                Share the link to invite friends
              </p>
              <button
                onClick={copyLink}
                className="mt-4 flex items-center gap-2 text-xs bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy invite link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Controls ── */}
      <div className="bg-gray-900 border-t border-gray-800 px-6 py-4">
        <div className="flex items-center justify-center gap-4">
          {/* Mic */}
          <button
            onClick={toggleMic}
            title={isMicOn ? "Mute mic" : "Unmute mic"}
            className={`p-3.5 rounded-full transition-all ${
              isMicOn
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Camera */}
          <button
            onClick={toggleCam}
            title={isCamOn ? "Turn off camera" : "Turn on camera"}
            className={`p-3.5 rounded-full transition-all ${
              isCamOn
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isCamOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            title={isScreenSharing ? "Stop sharing" : "Share screen"}
            className={`p-3.5 rounded-full transition-all ${
              isScreenSharing
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            {isScreenSharing ? (
              <MonitorOff className="w-5 h-5" />
            ) : (
              <Monitor className="w-5 h-5" />
            )}
          </button>

          {/* Record */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            title={isRecording ? "Stop recording" : "Start recording"}
            className={`p-3.5 rounded-full transition-all ${
              isRecording
                ? "bg-red-600 hover:bg-red-700 animate-pulse"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            {isRecording ? (
              <StopCircle className="w-5 h-5" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>

          {/* Chat */}
          <button
            onClick={() => setChatOpen((o) => !o)}
            title="In-call chat"
            className={`p-3.5 rounded-full transition-all relative ${
              chatOpen
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            {messages.length > 0 && !chatOpen && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">
                {messages.length}
              </span>
            )}
          </button>

          {/* End Call */}
          <button
            onClick={leaveCall}
            title="End call"
            className="p-3.5 rounded-full bg-red-600 hover:bg-red-700 transition-all px-6"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>

        {/* Control labels */}
        <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-gray-500">
          <span className="w-12 text-center">{isMicOn ? "Mute" : "Unmute"}</span>
          <span className="w-12 text-center">{isCamOn ? "Stop cam" : "Start cam"}</span>
          <span className="w-16 text-center">{isScreenSharing ? "Stop share" : "Share screen"}</span>
          <span className="w-12 text-center">{isRecording ? "Stop rec" : "Record"}</span>
          <span className="w-12 text-center">Chat</span>
          <span className="w-12 text-center">Leave</span>
        </div>
      </div>

      {/* ── In-call Chat Drawer ── */}
      {chatOpen && (
        <div className="fixed right-0 top-0 bottom-0 w-80 bg-gray-900 border-l border-gray-800 flex flex-col z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <h3 className="font-semibold text-sm">In-call chat</h3>
            <button
              onClick={() => setChatOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-gray-500 text-xs text-center mt-8">
                No messages yet. Say hi! 👋
              </p>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.self ? "items-end" : "items-start"}`}
              >
                <span className="text-[10px] text-gray-500 mb-1">
                  {msg.from} · {msg.time}
                </span>
                <div
                  className={`px-3 py-2 rounded-xl text-sm max-w-[85%] ${
                    msg.self
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-gray-800 text-gray-100 rounded-bl-sm"
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-gray-800 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm outline-none border border-gray-700 focus:border-blue-500"
            />
            <button
              onClick={sendMessage}
              className="bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-2 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
