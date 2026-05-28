import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  joinedon: { type: Date, default: Date.now },
  isPremium: { type: Boolean, default: false },
  dailyDownloads: { type: Number, default: 0 },
  lastDownloadDate: { type: Date },
  plan: {
    type: String,
    enum: ["free", "bronze", "silver", "gold"],
    default: "free"
  },
  watchLimit: {
    type: Number,
    default: 5
  },
  premiumActivatedAt: {
    type: Date
  }
});

export default mongoose.model("user", userschema);
