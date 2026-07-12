import mongoose from "mongoose";

const paymentSchema = mongoose.Schema({
  paymentId: { type: String, required: true, unique: true },
  orderId: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  plan: { type: String, enum: ["bronze", "silver", "gold", "free"], required: true },
  amount: { type: Number, required: true },
  transactionId: { type: String, required: true, unique: true },
  paymentScreenshot: { type: String },
  remarks: { type: String },
  status: { type: String, enum: ["pending", "approved", "rejected", "success"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
  verificationDate: { type: Date }
});

export default mongoose.model("Payment", paymentSchema);
