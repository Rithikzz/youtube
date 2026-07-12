import express from "express";
import { getallvideo, uploadvideo, validateWatchTime, streamVideo } from "../controllers/video.js";
import upload from "../filehelper/filehelper.js";

const routes = express.Router();

routes.post("/upload", upload.single("file"), uploadvideo);
routes.get("/getall", getallvideo);
routes.post("/validate-watch-time", validateWatchTime);
routes.get("/serve/:videoId", streamVideo);
export default routes;
