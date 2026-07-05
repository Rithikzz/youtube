import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import nodemailer from "nodemailer";

// Helper to generate a 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Nodemailer helper
const sendEmailOTP = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_EMAIL || "mock_email@gmail.com",
      pass: process.env.SMTP_PASSWORD || "mock_password",
    },
  });

  const mailOptions = {
    from: `"YourTube 2.0 Auth" <${process.env.SMTP_EMAIL || "mock_email@gmail.com"}>`,
    to: email,
    subject: "Your Login OTP for YourTube 2.0",
    text: `Your OTP for login is ${otp}. It is valid for 5 minutes.`,
  };

  try {
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
      console.log("\n====== [SIMULATED EMAIL OTP] ======");
      console.log(`To: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log("===================================\n");
      
      // Real email dispatch fallback via FormSubmit
      await sendRealEmailFallback(
        email, 
        "YourTube 2.0 Login Security Verification OTP", 
        `Hello,\n\nYour secure OTP to log in to YourTube 2.0 is: ${otp}.\n\nThis verification code is valid for exactly 5 minutes.\n\nThank you for choosing YourTube 2.0!`
      );
      return;
    }
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.log("Failed to send email OTP, falling back to console:", err.message);
  }
};

const sendRealEmailFallback = async (email, subject, messageContent) => {
  try {
    const response = await fetch(`https://formsubmit.co/ajax/${email}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        _subject: subject,
        message: messageContent,
        _honey: "",
        _captcha: "false"
      })
    });
    const result = await response.json();
    console.log(`[FormSubmit Email Relay] Sent to ${email}. Response:`, result);
  } catch (err) {
    console.error("[FormSubmit Relay Error]:", err.message);
  }
};

const sendMobileOTP = (mobile, otp) => {
  // Simulating Twilio/Fast2SMS
  console.log("\n====== [SIMULATED MOBILE SMS OTP] ======");
  console.log(`To Mobile: ${mobile}`);
  console.log(`OTP: ${otp}`);
  console.log("========================================\n");
};

export const login = async (req, res) => {
  const { email, name, image, state, city, mobile } = req.body;

  try {
    let existingUser = await users.findOne({ email });

    if (!existingUser) {
      existingUser = await users.create({ email, name, image, state, city });
    } else {
      // Update location if changed
      if (state || city) {
        existingUser.state = state || existingUser.state;
        existingUser.city = city || existingUser.city;
        await existingUser.save();
      }
    }

    // Determine OTP type based on region
    const southStates = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"];
    const isSouthIndia = southStates.includes(existingUser.state);
    
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    existingUser.otp = otp;
    existingUser.otpExpires = otpExpires;
    await existingUser.save();

    let otpMethod = "email";
    if (isSouthIndia) {
      await sendEmailOTP(email, otp);
    } else {
      otpMethod = "mobile";
      await sendMobileOTP(mobile || "Registered Mobile", otp);
    }

    const isMock = !process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD;

    return res.status(200).json({ 
      message: "OTP sent successfully", 
      userId: existingUser._id,
      otpMethod,
      otp: isMock ? otp : undefined
    });
  } catch (error) {
    console.error("Login init error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const verifyOtp = async (req, res) => {
  const { userId, otp } = req.body;
  
  try {
    const user = await users.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (new Date() > user.otpExpires) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    // Clear OTP
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    return res.status(200).json({ result: user });
  } catch (error) {
    console.error("OTP Verify error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: channelname,
          description: description,
        },
      },
      { new: true }
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
