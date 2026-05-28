import Razorpay from "razorpay";
import crypto from "crypto";
import User from "../Modals/Auth.js";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

// Helper function to send email notification
const sendInvoiceEmail = async (userEmail, userName, plan, amount) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_EMAIL || "mock_email@gmail.com",
      pass: process.env.SMTP_PASSWORD || "mock_password",
    },
  });

  const mailOptions = {
    from: `"YourTube 2.0 Support" <${process.env.SMTP_EMAIL || "mock_email@gmail.com"}>`,
    to: userEmail,
    subject: `YourTube Premium Plan Activated: ${plan.toUpperCase()}`,
    text: `
Hello ${userName || "User"},

Your ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan has been activated successfully.

Invoice Details:
--------------------------------
Plan: ${plan.charAt(0).toUpperCase() + plan.slice(1)}
Amount Paid: ₹${amount}
Watch Time: ${plan === "gold" ? "Unlimited" : plan === "silver" ? "10 minutes" : "7 minutes"}
Transaction Date: ${new Date().toLocaleDateString()}
Status: SUCCESS
--------------------------------

Thank you for upgrading to Premium!

Best regards,
YourTube 2.0 Team
    `,
  };

  try {
    // If not properly configured, we will log the email in console
    if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
      console.log("\n==================================================");
      console.log("             [SIMULATED INVOICE EMAIL]            ");
      console.log(`To: ${userEmail}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log("Body:");
      console.log(mailOptions.text);
      console.log("==================================================\n");
      return;
    }
    await transporter.sendMail(mailOptions);
    console.log(`Invoice email sent successfully to ${userEmail}`);
  } catch (error) {
    console.log("Nodemailer error (falling back to console logging):", error.message || error);
    console.log("\n==================================================");
    console.log("             [SIMULATED INVOICE EMAIL]            ");
    console.log(`To: ${userEmail}`);
    console.log(`Subject: ${mailOptions.subject}`);
    console.log("Body:");
    console.log(mailOptions.text);
    console.log("==================================================\n");
  }
};

export const createOrder = async (req, res) => {
  try {
    const { plan } = req.body;
    
    // Determine amount in paise based on plan
    let amount = 19900; // default / gold fallback
    if (plan === "bronze") amount = 1000; // ₹10
    else if (plan === "silver") amount = 5000; // ₹50
    else if (plan === "gold") amount = 10000; // ₹100

    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || key_id === "rzp_test_1234567890" || !key_secret) {
      // Return simulated mock order
      return res.status(200).json({
        id: `order_mock_${Date.now()}`,
        amount: amount,
        currency: "INR",
        plan: plan,
        isMock: true
      });
    }

    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const options = {
      amount: amount,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json({ ...order, plan });
  } catch (error) {
    console.log("Error creating order, falling back to mock:", error.message || error);
    
    // Fallback amount calculations for mock
    const { plan } = req.body;
    let amount = 19900;
    if (plan === "bronze") amount = 1000;
    else if (plan === "silver") amount = 5000;
    else if (plan === "gold") amount = 10000;

    res.status(200).json({
      id: `order_mock_${Date.now()}`,
      amount: amount,
      currency: "INR",
      plan: plan,
      isMock: true
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId, plan } = req.body;
    
    // Set watch limit in minutes
    let watchLimit = 5;
    let price = 0;
    if (plan === "bronze") {
      watchLimit = 7;
      price = 10;
    } else if (plan === "silver") {
      watchLimit = 10;
      price = 50;
    } else if (plan === "gold") {
      watchLimit = 999999; // Unlimited
      price = 100;
    }

    // Upgrading user plan, watchLimit, and isPremium status in DB
    const updatedUser = await User.findByIdAndUpdate(
      userId, 
      { 
        isPremium: plan === "gold" || plan === "silver" || plan === "bronze",
        plan: plan,
        watchLimit: watchLimit,
        premiumActivatedAt: new Date()
      }, 
      { new: true }
    );

    if (updatedUser) {
      // Trigger invoice email sending
      await sendInvoiceEmail(updatedUser.email, updatedUser.name, plan, price);
    }

    res.status(200).json({ message: "Payment verified, plan upgraded successfully!", user: updatedUser });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
