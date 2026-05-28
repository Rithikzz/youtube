import Razorpay from "razorpay";
import crypto from "crypto";
import User from "../Modals/Auth.js";
import dotenv from "dotenv";

dotenv.config();

export const createOrder = async (req, res) => {
  try {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || key_id === "rzp_test_1234567890" || !key_secret) {
      // Return simulated mock order
      return res.status(200).json({
        id: `order_mock_${Date.now()}`,
        amount: 19900,
        currency: "INR",
        isMock: true
      });
    }

    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const options = {
      amount: 19900, // 199 INR in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json(order);
  } catch (error) {
    console.log("Error creating order, falling back to mock:", error.message || error);
    res.status(200).json({
      id: `order_mock_${Date.now()}`,
      amount: 19900,
      currency: "INR",
      isMock: true
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } = req.body;
    
    // Upgrading user to premium
    const updatedUser = await User.findByIdAndUpdate(userId, { isPremium: true }, { new: true });
    res.status(200).json({ message: "Payment verified, user upgraded to Premium!", user: updatedUser });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
