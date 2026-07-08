import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import https from "https";

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
    const googleRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!googleRes.ok) {
      return res.status(401).json({ message: "Invalid or expired Google token" });
    }

    const profile = await googleRes.json();

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
 * POST /user/email-otp-login
 *
 * Receives the phone.email verified user_json_url from the frontend.
 * Fetches the JSON server-side to get the verified email address.
 * Upserts the user in MongoDB and returns the full user document.
 *
 * Body: { user_json_url, state, city }
 */
export const phoneEmailLogin = async (req, res) => {
  const { user_json_url, state, city } = req.body;

  if (!user_json_url) {
    return res.status(400).json({ message: "user_json_url is required" });
  }

  // Only allow URLs from phone.email domain for security
  if (!user_json_url.startsWith("https://user.phone.email/")) {
    return res.status(400).json({ message: "Invalid user_json_url domain" });
  }

  try {
    // Fetch verified email from phone.email's secure JSON endpoint
    const fetchVerifiedEmail = () =>
      new Promise((resolve, reject) => {
        https.get(user_json_url, (response) => {
          let data = "";
          response.on("data", (chunk) => { data += chunk; });
          response.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error("Invalid JSON from phone.email"));
            }
          });
        }).on("error", reject);
      });

    const jsonData = await fetchVerifiedEmail();
    const email = jsonData.user_email_id;

    if (!email) {
      return res.status(400).json({ message: "Could not retrieve verified email" });
    }

    let existingUser = await users.findOne({ email });

    if (!existingUser) {
      existingUser = await users.create({
        email,
        name: email.split("@")[0],
        image: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
        state: state || "",
        city: city || "",
      });
    } else {
      if (state) existingUser.state = state;
      if (city) existingUser.city = city;
      await existingUser.save();
    }

    return res.status(200).json({ result: existingUser });
  } catch (error) {
    console.error("Phone.email login error:", error);
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
