import express from "express";
import { handleDownload, getDownloads } from "../controllers/download.js";

const router = express.Router();

router.post("/request", handleDownload);
router.get("/:id", getDownloads);

export default router;
