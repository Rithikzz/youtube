import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const videochema = mongoose.Schema(
  {
    videotitle: { type: String, required: true },
    filename: { type: String, required: true },
    filetype: { type: String, required: true },
    filepath: { type: String, required: true },
    filesize: { type: String, required: true },
    videochanel: { type: String, required: true },
    Like: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    uploader: { type: String },
  },
  { timestamps: true }
);
const Video = mongoose.model("videofiles", videochema);

const seedVideos = [
  {
    videotitle: "Sample Video - Demo Reel",
    filename: "vdo.mp4",
    filetype: "video/mp4",
    filepath: "uploads/2025-06-25T06-09-29.296Z-vdo.mp4",
    filesize: "930013",
    videochanel: "YourTube Official",
    uploader: "admin",
    Like: 42,
    views: 1280,
  },
  {
    videotitle: "Getting Started with YourTube",
    filename: "vdo.mp4",
    filetype: "video/mp4",
    filepath: "uploads/2025-06-25T06-09-29.296Z-vdo.mp4",
    filesize: "930013",
    videochanel: "YourTube Official",
    uploader: "admin",
    Like: 17,
    views: 560,
  },
  {
    videotitle: "Top 10 Coding Tips for 2025",
    filename: "vdo.mp4",
    filetype: "video/mp4",
    filepath: "uploads/2025-06-25T06-09-29.296Z-vdo.mp4",
    filesize: "930013",
    videochanel: "Dev Channel",
    uploader: "admin",
    Like: 89,
    views: 3400,
  },
  {
    videotitle: "Nature Documentary: Mountains",
    filename: "vdo.mp4",
    filetype: "video/mp4",
    filepath: "uploads/2025-06-25T06-09-29.296Z-vdo.mp4",
    filesize: "930013",
    videochanel: "Nature Lens",
    uploader: "admin",
    Like: 203,
    views: 8900,
  },
  {
    videotitle: "Lo-fi Study Beats 🎵",
    filename: "vdo.mp4",
    filetype: "video/mp4",
    filepath: "uploads/2025-06-25T06-09-29.296Z-vdo.mp4",
    filesize: "930013",
    videochanel: "Chill Vibes",
    uploader: "admin",
    Like: 512,
    views: 22000,
  },
  {
    videotitle: "React + Next.js Full Course",
    filename: "vdo.mp4",
    filetype: "video/mp4",
    filepath: "uploads/2025-06-25T06-09-29.296Z-vdo.mp4",
    filesize: "930013",
    videochanel: "Dev Channel",
    uploader: "admin",
    Like: 330,
    views: 15600,
  },
];

async function seed() {
  await mongoose.connect(process.env.DB_URL);
  console.log("Connected to MongoDB");

  const existing = await Video.countDocuments();
  if (existing > 0) {
    console.log(`Already have ${existing} videos — skipping seed.`);
    process.exit(0);
  }

  await Video.insertMany(seedVideos);
  console.log(`✅ Seeded ${seedVideos.length} videos successfully!`);
  process.exit(0);
}

seed().catch((e) => {
  console.error("Seed error:", e);
  process.exit(1);
});
