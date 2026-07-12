import User from "../Modals/Auth.js";
import Download from "../Modals/Download.js";
import Video from "../Modals/video.js";
import path from "path";
import fs from "fs";
import { getFileStreamById, getFileInfoById } from "../helpers/gridfs.js";

export const handleDownload = async (req, res) => {
  try {
    const { userId, videoId } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const duplicateDownload = await Download.findOne({
      userid: userId,
      videoid: videoId,
      downloadedAt: { $gte: todayStart, $lte: todayEnd }
    });

    if (duplicateDownload) {
      return res.status(200).json({ message: "Download allowed (Duplicate/Redownload free)", user });
    }

    const today = new Date().toDateString();
    let downloadCount = user.dailyDownloads || 0;

    if (user.lastDownloadDate && user.lastDownloadDate.toDateString() !== today) {
        downloadCount = 0;
    }

    const hasUnlimitedDownloads = user.isPremium && user.plan === "gold";
    if (!hasUnlimitedDownloads && downloadCount >= 1) {
      return res.status(403).json({ message: "Free/Tier limit exceeded. Upgrade to Gold Premium for unlimited downloads." });
    }

    const newDownload = new Download({
      userid: userId,
      videoid: videoId
    });
    await newDownload.save();

    user.dailyDownloads = downloadCount + 1;
    user.lastDownloadDate = new Date();
    await user.save();

    res.status(200).json({ message: "Download allowed", download: newDownload, user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getDownloads = async (req, res) => {
    try {
        const { id } = req.params;
        const downloads = await Download.find({ userid: id }).sort({ downloadedAt: -1 });

        const videoIds = downloads.map(d => d.videoid);
        const videos = await Video.find({ _id: { $in: videoIds } });

        const result = downloads.map(d => {
            const vid = videos.find(v => v._id.toString() === d.videoid);
            return {
                ...d._doc,
                video: vid
            }
        }).filter(d => d.video);

        res.status(200).json(result);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const streamFromGridFS = async (res, filepath, filename) => {
  const fileId = filepath.replace("gridfs:", "");
  const fileInfo = await getFileInfoById(fileId);
  if (!fileInfo) {
    res.status(404).json({ message: "Video file not found in storage" });
    return false;
  }
  const stream = getFileStreamById(fileId);
  res.setHeader("Content-Type", fileInfo.contentType || "video/mp4");
  res.setHeader("Content-Disposition", `attachment; filename="${filename || fileInfo.filename || "video.mp4"}"`);
  stream.pipe(res);
  return true;
};

const streamFromDisk = (res, filepath, filename) => {
  const resolvedPath = path.resolve(filepath);
  if (!fs.existsSync(resolvedPath)) {
    return false;
  }
  res.setHeader("Content-Disposition", `attachment; filename="${filename || "video.mp4"}"`);
  res.download(resolvedPath, filename || "video.mp4");
  return true;
};

export const downloadFile = async (req, res) => {
  try {
    const { videoId } = req.params;
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const video = await Video.findById(videoId);
    if (!video) return res.status(404).json({ message: "Video not found" });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const duplicateDownload = await Download.findOne({
      userid: userId,
      videoid: videoId,
      downloadedAt: { $gte: todayStart, $lte: todayEnd }
    });

    let increment = false;

    if (!duplicateDownload) {
      const today = new Date().toDateString();
      let downloadCount = user.dailyDownloads || 0;

      if (user.lastDownloadDate && user.lastDownloadDate.toDateString() !== today) {
          downloadCount = 0;
      }

      const hasUnlimitedDownloads = user.isPremium && user.plan === "gold";
      if (!hasUnlimitedDownloads && downloadCount >= 1) {
        return res.status(403).json({ message: "Download limit exceeded. Upgrade to Gold Premium." });
      }
      increment = true;
    }

    const filepath = video.filepath || "";
    const filename = video.filename || "video.mp4";

    if (filepath.startsWith("gridfs:")) {
      const streamed = await streamFromGridFS(res, filepath, filename);
      if (!streamed) return res.status(404).json({ message: "Video file not found in GridFS" });
    } else {
      const streamed = streamFromDisk(res, filepath, filename);
      if (!streamed) return res.status(404).json({ message: "Video file not found on disk" });
    }

    if (increment) {
      const today = new Date().toDateString();
      let downloadCount = user.dailyDownloads || 0;
      if (user.lastDownloadDate && user.lastDownloadDate.toDateString() !== today) {
          downloadCount = 0;
      }

      const newDownload = new Download({
        userid: userId,
        videoid: videoId
      });
      await newDownload.save();

      user.dailyDownloads = downloadCount + 1;
      user.lastDownloadDate = new Date();
      await user.save();
    }
  } catch (error) {
    console.error("Error in downloadFile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
