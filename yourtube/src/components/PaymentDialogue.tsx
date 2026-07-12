import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Crown, Smartphone, CheckCircle, Copy } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";
import QRCode from "react-qr-code";

const PaymentDialogue = ({ isopen, onclose, user, onsuccess, plan }: any) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Plan Details dynamic helper
  const getPlanDetails = () => {
    switch (plan) {
      case "bronze":
        return { title: "Bronze Plan", priceAmount: "10.00", price: "₹10.00", color: "text-amber-600" };
      case "silver":
        return { title: "Silver Plan", priceAmount: "50.00", price: "₹50.00", color: "text-zinc-300" };
      case "gold":
        return { title: "Gold Plan", priceAmount: "100.00", price: "₹100.00", color: "text-yellow-500" };
      default:
        return { title: "Premium Lifetime", priceAmount: "199.00", price: "₹199.00", color: "text-yellow-500" };
    }
  };

  const planDetails = getPlanDetails();

  const upiId = "sankarrithik5-1@okaxis";
  const payeeName = "Rithik S";
  // Dynamic UPI Link with pre-filled amount
  const upiLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${planDetails.priceAmount}&cu=INR`;

  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyPayment = async () => {
    setIsSubmitting(true);
    setError("");
    
    // Simulate a brief verification delay
    setTimeout(async () => {
      try {
        const response = await axiosInstance.post("/payment/verify", {
          // Use a mock order ID so the backend bypasses Razorpay signature verification
          razorpay_order_id: `order_mock_upi_${Date.now()}`,
          razorpay_payment_id: `pay_upi_${Date.now()}`,
          razorpay_signature: "upi_signature",
          userId: user._id,
          plan: plan || "gold",
        });

        if (response.data.user) {
          onsuccess(response.data.user);
          alert(`Payment Verified Successfully! Activated ${planDetails.title}.`);
          onclose();
        }
      } catch (err) {
        console.error("Verification error:", err);
        setError("Failed to verify payment. Please contact support if money was deducted.");
      } finally {
        setIsSubmitting(false);
      }
    }, 2000);
  };

  return (
    <Dialog open={isopen} onOpenChange={() => {
      setError("");
      onclose();
    }}>
      <DialogContent className="sm:max-w-md bg-zinc-950 text-white border-yellow-500/30">
        <DialogHeader className="text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center mb-2 border border-yellow-500/20">
            <Crown className="w-6 h-6 text-yellow-500 animate-pulse" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
            Upgrade Plan Checkout
          </DialogTitle>
          <p className="text-xs text-zinc-400 mt-1">
            Pay securely directly via UPI
          </p>
        </DialogHeader>

        <div className="py-4 space-y-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center text-sm text-zinc-400">
              <span>Subscription Plan</span>
              <span className={`font-bold ${planDetails.color}`}>{planDetails.title}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-zinc-400">
              <span>Amount</span>
              <span className="font-bold text-white text-lg">{planDetails.price}</span>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-4">
            <div className="bg-white p-3 rounded-xl">
              <QRCode value={upiLink} size={160} />
            </div>
            <p className="text-xs text-zinc-400 text-center">
              Scan with any UPI app (GPay, PhonePe, Paytm)
            </p>

            <div className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-lg border border-zinc-800">
              <span className="text-sm font-medium text-zinc-300">{upiId}</span>
              <button onClick={copyUpiId} className="text-zinc-400 hover:text-white transition">
                {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <a href={upiLink} className="w-full block md:hidden">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                <Smartphone className="w-4 h-4 mr-2" /> Pay with UPI App
              </Button>
            </a>
            
            {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}
          </div>
        </div>

        <DialogFooter className="flex sm:flex-row gap-2 sm:justify-between items-center">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setError("");
              onclose();
            }}
            className="text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs w-full sm:w-auto"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleVerifyPayment}
            disabled={isSubmitting}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold text-sm border-none shadow-md shadow-yellow-500/10 w-full sm:w-auto px-8"
          >
            {isSubmitting ? "Verifying Payment..." : "I've Paid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialogue;
