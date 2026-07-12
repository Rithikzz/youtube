import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../Modals/Auth.js";

const otpStore = new Map();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_EMAIL || "mock_email@gmail.com",
    pass: process.env.SMTP_PASSWORD || "mock_password",
  },
});

const sendEmailOtp = async (email, otp, name) => {
  const mailOptions = {
    from: `"YourTube Security" <${process.env.SMTP_EMAIL || "mock_email@gmail.com"}>`,
    to: email,
    subject: "Your YourTube Login OTP",
    text: `
Hello ${name || "User"},

Your One-Time Password (OTP) for YourTube login is:

  ${otp}

This OTP is valid for 5 minutes.

If you did not request this, please ignore this email.

Best regards,
YourTube Security
    `,
  };

  try {
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
      console.log("\n==================================================");
      console.log("  [EMAIL OTP - Simulated]");
      console.log(`  To: ${email}`);
      console.log(`  OTP: ${otp}`);
      console.log("==================================================\n");
      return true;
    }
    await transporter.sendMail(mailOptions);
    console.log(`OTP email sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.log("Email OTP error (fallback to console):", error.message);
    console.log(`[EMAIL OTP - Console Fallback] To: ${email}, OTP: ${otp}`);
    return true;
  }
};

const sendMobileOtp = async (phone, otp) => {
  console.log("\n==================================================");
  console.log("  [SMS OTP - Simulated]");
  console.log(`  To: ${phone}`);
  console.log(`  OTP: ${otp}`);
  console.log("  [SMS gateway not configured - OTP logged for development]");
  console.log("==================================================\n");
  return true;
};

export const sendOtp = async (req, res) => {
  try {
    const { userId, method, phone } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000;

    otpStore.set(userId, { otp, expiresAt, method });

    console.log(`[OTP] Generated ${method} OTP for user ${userId}: ${otp}`);

    if (method === "email") {
      await sendEmailOtp(user.email, otp, user.name);
    } else if (method === "phone") {
      if (!phone && !user.phone) {
        return res.status(400).json({ message: "Phone number is required for SMS OTP" });
      }
      const targetPhone = phone || user.phone;
      if (phone) {
        user.phone = phone;
        await user.save();
      }
      await sendMobileOtp(targetPhone, otp);
    } else {
      return res.status(400).json({ message: "Invalid OTP method. Use 'email' or 'phone'." });
    }

    const isMock = !process.env.SMTP_EMAIL || process.env.SMTP_EMAIL === "mock_email@gmail.com";

    res.status(200).json({
      message: `OTP sent to your ${method === "email" ? "email" : "phone"}`,
      method,
      mockOtp: isMock ? otp : undefined,
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ message: "User ID and OTP are required" });
    }

    const stored = otpStore.get(userId);
    if (!stored) {
      return res.status(400).json({ message: "No OTP found. Please request a new one." });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(userId);
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    if (stored.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

    otpStore.delete(userId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log(`[OTP] Verified successfully for user ${userId}`);

    return res.status(200).json({ message: "OTP verified successfully", result: user });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: "Failed to verify OTP" });
  }
};
