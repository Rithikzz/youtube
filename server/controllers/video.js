import video from "../Modals/video.js";
import User from "../Modals/Auth.js";
import fs from "fs";
import path from "path";
import { uploadToGridFS, getFileStreamById, getFileInfoById } from "../helpers/gridfs.js";

export const uploadvideo = async (req, res) => {
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  } else {
    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      const gridfsFile = await uploadToGridFS(
        fileBuffer,
        req.file.originalname,
        req.file.mimetype
      );

      fs.unlinkSync(req.file.path);

      const file = new video({
        videotitle: req.body.videotitle,
        filename: req.file.originalname,
        filepath: `gridfs:${gridfsFile._id}`,
        filetype: req.file.mimetype,
        filesize: req.file.size,
        videochanel: req.body.videochanel,
        uploader: req.body.uploader,
      });
      await file.save();
      return res.status(201).json("file uploaded successfully");
    } catch (error) {
      console.error(" error:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }
};
export const getallvideo = async (req, res) => {
  try {
    const files = await video.find();
    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const streamVideo = async (req, res) => {
  try {
    const { videoId } = req.params;
    const vid = await video.findById(videoId);
    if (!vid) return res.status(404).json({ message: "Video not found" });

    const filepath = vid.filepath || "";

    if (filepath.startsWith("gridfs:")) {
      const fileId = filepath.replace("gridfs:", "");
      const fileInfo = await getFileInfoById(fileId);
      if (!fileInfo) return res.status(404).json({ message: "Video file not found" });
      const stream = getFileStreamById(fileId);
      res.setHeader("Content-Type", fileInfo.contentType || "video/mp4");
      res.setHeader("Accept-Ranges", "bytes");
      stream.on("error", (err) => {
        console.error("GridFS stream error:", err);
        if (!res.headersSent) res.status(500).end();
      });
      stream.pipe(res);
    } else {
      const resolvedPath = path.resolve(filepath);
      if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({ message: "Video file not found on disk" });
      }
      res.sendFile(resolvedPath);
    }
  } catch (error) {
    console.error("Stream error:", error);
    if (!res.headersSent) res.status(500).json({ message: "Failed to stream video" });
  }
};

export const validateWatchTime = async (req, res) => {
  try {
    const { userId, currentTime } = req.body;
    let limitInSeconds = 300;
    let plan = "free";

    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        plan = user.plan || "free";
        if (plan === "bronze") limitInSeconds = 420;
        else if (plan === "silver") limitInSeconds = 600;
        else if (plan === "gold") limitInSeconds = 999999;
      }
    }

    if (currentTime >= limitInSeconds) {
      return res.status(200).json({ valid: false, limit: limitInSeconds, plan });
    }

    return res.status(200).json({ valid: true, limit: limitInSeconds, plan });
  } catch (error) {
    console.error("Watch time validation error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
