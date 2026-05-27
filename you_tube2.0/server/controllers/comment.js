import comment from "../Modals/comment.js";
import mongoose from "mongoose";

export const postcomment = async (req, res) => {
  const commentdata = req.body;
  
  // special character filter
  const suspiciousRegex = /[@#$%^&*]/;
  if (commentdata.commentbody && suspiciousRegex.test(commentdata.commentbody)) {
    return res.status(400).json({ message: "Comment contains invalid special characters." });
  }

  const postcomment = new comment(commentdata);
  try {
    await postcomment.save();
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
    await comment.findByIdAndDelete(_id);
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
  try {
    const updatecomment = await comment.findByIdAndUpdate(_id, {
      $set: { commentbody: commentbody },
    });
    res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const likecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const updatedComment = await comment.findByIdAndUpdate(
      _id,
      { $inc: { likes: 1 } },
      { new: true }
    );
    return res.status(200).json(updatedComment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const dislikecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const existingComment = await comment.findById(_id);
    if (!existingComment) {
      return res.status(404).send("comment unavailable");
    }

    if (existingComment.dislikes + 1 >= 2) {
      await comment.findByIdAndDelete(_id);
      return res.status(200).json({ deleted: true, message: "Comment deleted due to too many dislikes" });
    } else {
      const updatedComment = await comment.findByIdAndUpdate(
        _id,
        { $inc: { dislikes: 1 } },
        { new: true }
      );
      return res.status(200).json(updatedComment);
    }
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
