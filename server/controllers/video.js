import video from "../Modals/video.js";
import User from "../Modals/Auth.js";

export const uploadvideo = async (req, res) => {
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  } else {
    try {
      const file = new video({
        videotitle: req.body.videotitle,
        filename: req.file.originalname,
        filepath: req.file.path,
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

export const validateWatchTime = async (req, res) => {
  try {
    const { userId, currentTime } = req.body;
    let limitInSeconds = 300; // Free plan default (5 min)
    let plan = "free";

    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        plan = user.plan || "free";
        if (plan === "bronze") limitInSeconds = 420; // 7 min
        else if (plan === "silver") limitInSeconds = 600; // 10 min
        else if (plan === "gold") limitInSeconds = 999999; // Unlimited
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
