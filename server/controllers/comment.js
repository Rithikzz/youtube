import comment from "../Modals/comment.js";
import mongoose from "mongoose";

export const postcomment = async (req, res) => {
  const commentdata = req.body;
  
  // special character filter
  const suspiciousRegex = /[@#$%^&*]/;
  if (commentdata.commentbody && suspiciousRegex.test(commentdata.commentbody)) {
    return res.status(400).json({ message: "Comment contains invalid special characters." });
  }

  // Backend City Detection (Requirement 5)
  let city = "Unknown";
  let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  if (!clientIp || clientIp === '::1' || clientIp === '127.0.0.1' || clientIp.includes('127.0.0.1')) {
    try {
      const geoRes = await fetch("https://ipapi.co/json/");
      const geoData = await geoRes.json();
      if (geoData && geoData.city) {
        city = geoData.city;
      }
    } catch (err) {
      console.error("Backend local IP geo lookup failed:", err);
    }
  } else {
    const ip = clientIp.replace(/^.*:/, '');
    try {
      const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
      const geoData = await geoRes.json();
      if (geoData && geoData.city) {
        city = geoData.city;
      }
    } catch (err) {
      console.error(`Backend geo lookup failed for IP ${ip}:`, err);
    }
  }
  commentdata.city = city;

  const postcomment = new comment(commentdata);
  try {
    await postcomment.save();

    // Socket.io Real-time Broadcast
    const io = req.app.get("io");
    if (io) {
      io.to(`video:${postcomment.videoid}`).emit("comment:new", postcomment);
    }

    return res.status(200).json({ comment: true, data: postcomment });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment.find({ videoid: videoid });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const deletedComment = await comment.findByIdAndDelete(_id);
    if (deletedComment) {
      const io = req.app.get("io");
      if (io) {
        io.to(`video:${deletedComment.videoid}`).emit("comment:deleted", _id);
      }
    }
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }

  // special character filter (Requirement 6)
  const suspiciousRegex = /[@#$%^&*]/;
  if (commentbody && suspiciousRegex.test(commentbody)) {
    return res.status(400).json({ message: "Comment contains invalid special characters." });
  }

  try {
    const updatecomment = await comment.findByIdAndUpdate(
      _id,
      { $set: { commentbody: commentbody } },
      { new: true }
    );

    if (updatecomment) {
      const io = req.app.get("io");
      if (io) {
        io.to(`video:${updatecomment.videoid}`).emit("comment:updated", updatecomment);
      }
    }

    res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const likecomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }
  try {
    const existingComment = await comment.findById(_id);
    if (!existingComment) {
      return res.status(404).send("comment unavailable");
    }

    let updatedLikes = [...(existingComment.likes || [])];
    let updatedDislikes = [...(existingComment.dislikes || [])];

    if (updatedLikes.includes(userId)) {
      updatedLikes = updatedLikes.filter((id) => id !== userId);
    } else {
      updatedLikes.push(userId);
      updatedDislikes = updatedDislikes.filter((id) => id !== userId);
    }

    const updatedComment = await comment.findByIdAndUpdate(
      _id,
      { $set: { likes: updatedLikes, dislikes: updatedDislikes } },
      { new: true }
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`video:${updatedComment.videoid}`).emit("comment:updated", updatedComment);
    }

    return res.status(200).json(updatedComment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const dislikecomment = async (req, res) => {
  const { id: _id } = req.params;
  const { userId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  if (!userId) {
    return res.status(400).json({ message: "User ID is required" });
  }
  try {
    const existingComment = await comment.findById(_id);
    if (!existingComment) {
      return res.status(404).send("comment unavailable");
    }

    let updatedLikes = [...(existingComment.likes || [])];
    let updatedDislikes = [...(existingComment.dislikes || [])];

    if (updatedDislikes.includes(userId)) {
      updatedDislikes = updatedDislikes.filter((id) => id !== userId);
    } else {
      updatedDislikes.push(userId);
      updatedLikes = updatedLikes.filter((id) => id !== userId);
    }

    if (updatedDislikes.length >= 2) {
      await comment.findByIdAndDelete(_id);
      
      const io = req.app.get("io");
      if (io) {
        io.to(`video:${existingComment.videoid}`).emit("comment:deleted", _id);
      }

      return res.status(200).json({ deleted: true, message: "Comment deleted due to too many dislikes" });
    }

    const updatedComment = await comment.findByIdAndUpdate(
      _id,
      { $set: { likes: updatedLikes, dislikes: updatedDislikes } },
      { new: true }
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`video:${updatedComment.videoid}`).emit("comment:updated", updatedComment);
    }

    return res.status(200).json(updatedComment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
