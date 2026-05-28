import mongoose from "mongoose";

const downloadSchema = mongoose.Schema({
  userid: { type: String, required: true },
  videoid: { type: String, required: true },
  downloadedAt: { type: Date, default: Date.now }
});

export default mongoose.model("download", downloadSchema);
