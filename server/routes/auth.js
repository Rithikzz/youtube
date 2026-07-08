import express from "express";
import { googleLogin, phoneEmailLogin, updateprofile } from "../controllers/auth.js";

const routes = express.Router();

// POST /user/google-login — Google OAuth token verification
routes.post("/google-login", googleLogin);

// POST /user/email-otp-login — phone.email verified email login
routes.post("/email-otp-login", phoneEmailLogin);

// PATCH /user/update/:id — update channel name / description
routes.patch("/update/:id", updateprofile);

export default routes;
