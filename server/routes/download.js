import express from "express";
import { handleDownload, getDownloads, downloadFile } from "../controllers/download.js";

const router = express.Router();

router.post("/request", handleDownload);
router.get("/file/:videoId", downloadFile);
router.get("/:id", getDownloads);

export default router;
