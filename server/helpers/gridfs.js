import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";

let bucket = null;

export const getGridFSBucket = () => {
  if (bucket) return bucket;
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB not connected");
  bucket = new GridFSBucket(db, { bucketName: "videos" });
  return bucket;
};

export const uploadToGridFS = (fileBuffer, filename, mimetype) => {
  return new Promise((resolve, reject) => {
    const bucket = getGridFSBucket();
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: mimetype || "video/mp4",
    });
    uploadStream.on("finish", () => {
      const file = { _id: uploadStream.id, filename, contentType: mimetype, length: fileBuffer.length };
      resolve(file);
    });
    uploadStream.on("error", reject);
    uploadStream.end(fileBuffer);
  });
};

export const deleteFromGridFS = async (fileId) => {
  const bucket = getGridFSBucket();
  await bucket.delete(new mongoose.Types.ObjectId(fileId));
  return true;
};

export const getFileStreamById = (fileId) => {
  const bucket = getGridFSBucket();
  return bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));
};

export const getFileInfoById = async (fileId) => {
  const bucket = getGridFSBucket();
  const files = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
  return files[0] || null;
};
