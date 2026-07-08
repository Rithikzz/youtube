import mongoose from "mongoose";
import users from "../Modals/Auth.js";

/**
 * POST /user/google-login
 *
 * Receives the Google OAuth access_token from the frontend.
 * Calls Google's userinfo API to verify + fetch profile data.
 * Upserts the user in MongoDB and returns the full user document.
 *
 * Body: { access_token, state, city }
 */
export const googleLogin = async (req, res) => {
  const { access_token, state, city } = req.body;

  if (!access_token) {
    return res.status(400).json({ message: "access_token is required" });
  }

  try {
    // Verify the token and fetch profile from Google
    const googleRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!googleRes.ok) {
      return res.status(401).json({ message: "Invalid or expired Google token" });
    }

    const profile = await googleRes.json();
    // profile = { sub, name, given_name, family_name, picture, email, email_verified }

    if (!profile.email) {
      return res.status(400).json({ message: "Could not retrieve email from Google" });
    }

    let existingUser = await users.findOne({ email: profile.email });

    if (!existingUser) {
      existingUser = await users.create({
        email: profile.email,
        googleId: profile.sub,
        name: profile.name,
        image: profile.picture || "https://github.com/shadcn.png",
        state: state || "",
        city: city || "",
      });
    } else {
      // Keep name/photo in sync with Google account
      existingUser.name = profile.name || existingUser.name;
      existingUser.image = profile.picture || existingUser.image;
      existingUser.googleId = profile.sub;
      if (state) existingUser.state = state;
      if (city) existingUser.city = city;
      await existingUser.save();
    }

    return res.status(200).json({ result: existingUser });
  } catch (error) {
    console.error("Google login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

/**
 * PATCH /user/update/:id
 * Updates channel name and description.
 */
export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }

  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      { $set: { channelname, description } },
      { new: true }
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
