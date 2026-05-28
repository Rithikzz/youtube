import User from "../Modals/Auth.js";
import Download from "../Modals/Download.js";
import Video from "../Modals/video.js";

export const handleDownload = async (req, res) => {
  try {
    const { userId, videoId } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if free user exceeded limit
    const today = new Date().toDateString();
    let downloadCount = user.dailyDownloads || 0;
    
    if (user.lastDownloadDate && user.lastDownloadDate.toDateString() !== today) {
        // Reset if it's a new day
        downloadCount = 0;
    }

    if (!user.isPremium && downloadCount >= 1) {
      return res.status(403).json({ message: "Free limit exceeded. Upgrade to Premium for unlimited downloads." });
    }

    // Save download
    const newDownload = new Download({
      userid: userId,
      videoid: videoId
    });
    await newDownload.save();

    // Update user stats
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
        
        // Fetch video details for each download
        const videoIds = downloads.map(d => d.videoid);
        const videos = await Video.find({ _id: { $in: videoIds } });
        
        // Merge download info with video info
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
}
