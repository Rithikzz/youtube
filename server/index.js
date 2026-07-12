import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";

import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import paymentroutes from "./routes/payment.js";
import downloadroutes from "./routes/download.js";
import otproutes from "./routes/otp.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
  "http://localhost:3000",
  "http://10.13.25.46:3000",
  "https://youtube-dun-delta.vercel.app",
  "https://youtube-rithik-s-projects5.vercel.app",
  "https://youtube-sankarrithik5-6276-rithik-s-projects5.vercel.app",
];

app.use(cors({ origin: allowedOrigins, credentials: true }));

// ─── Socket.io Signaling Server ───────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
});
app.set("io", io);

// rooms: Map<roomId, Set<socketId>>
const rooms = new Map();

io.on("connection", (socket) => {
  console.log(`[SOCKET] Connected: ${socket.id}`);

  // Join a video comments room
  socket.on("join-video", (videoId) => {
    socket.join(`video:${videoId}`);
    console.log(`[SOCKET] Socket ${socket.id} joined video:${videoId}`);
  });

  // Leave a video comments room
  socket.on("leave-video", (videoId) => {
    socket.leave(`video:${videoId}`);
    console.log(`[SOCKET] Socket ${socket.id} left video:${videoId}`);
  });

  // Join a call room
  socket.on("join-room", ({ roomId, userName }) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.userName = userName || "Anonymous";

    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId).add(socket.id);

    // Tell existing peers a new user joined
    socket.to(roomId).emit("user-joined", {
      socketId: socket.id,
      userName: socket.data.userName,
    });

    // Tell the new user how many peers are already in the room
    const peers = [...rooms.get(roomId)].filter((id) => id !== socket.id);
    socket.emit("room-peers", peers);

    console.log(`[SOCKET] ${socket.data.userName} joined room ${roomId}`);
  });

  // WebRTC offer
  socket.on("offer", ({ to, offer }) => {
    io.to(to).emit("offer", { from: socket.id, offer });
  });

  // WebRTC answer
  socket.on("answer", ({ to, answer }) => {
    io.to(to).emit("answer", { from: socket.id, answer });
  });

  // ICE candidate
  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", { from: socket.id, candidate });
  });

  // Screen share started/stopped
  socket.on("screen-share-started", () => {
    socket.to(socket.data.roomId).emit("peer-screen-share-started", {
      socketId: socket.id,
    });
  });

  socket.on("screen-share-stopped", () => {
    socket.to(socket.data.roomId).emit("peer-screen-share-stopped", {
      socketId: socket.id,
    });
  });

  // Chat message during call
  socket.on("call-message", ({ roomId, message }) => {
    io.to(roomId).emit("call-message", {
      from: socket.data.userName,
      message,
      time: new Date().toLocaleTimeString(),
    });
  });

  // Disconnect
  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (roomId && rooms.has(roomId)) {
      rooms.get(roomId).delete(socket.id);
      if (rooms.get(roomId).size === 0) rooms.delete(roomId);
    }
    socket.to(roomId).emit("user-left", { socketId: socket.id });
    console.log(`[SOCKET] Disconnected: ${socket.id}`);
  });
});

// ─── REST Middleware ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use("/uploads", express.static(path.join("uploads")));
app.use(bodyParser.json());

app.get("/", (req, res) => res.send("YourTube backend is running ✅"));

app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/payment", paymentroutes);
app.use("/download", downloadroutes);
app.use("/user", otproutes);

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`server running on port ${PORT}`));

mongoose
  .connect(process.env.DB_URL)
  .then(() => console.log("Mongodb connected"))
  .catch((e) => console.log(e));
