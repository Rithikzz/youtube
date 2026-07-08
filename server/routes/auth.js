import express from "express";
import { googleLogin, updateprofile } from "../controllers/auth.js";

const routes = express.Router();

// POST /user/google-login — called after Firebase Google OAuth popup completes
routes.post("/google-login", googleLogin);

// PATCH /user/update/:id — update channel name / description
routes.patch("/update/:id", updateprofile);

export default routes;
