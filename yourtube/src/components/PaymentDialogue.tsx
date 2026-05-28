import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Crown, Sparkles, ShieldCheck, Phone, CheckCircle, RefreshCw, Clock } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";

const PaymentDialogue = ({ isopen, onclose, user, onsuccess }: any) => {
  const [step, setStep] = useState(1); // 1: Phone Input, 2: OTP Verification
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");
  const [timer, setTimer] = useState(60);
  const [isExpired, setIsExpired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpNotification, setOtpNotification] = useState("");
  const [error, setError] = useState("");

  // Countdown timer for 1-minute OTP validity
  useEffect(() => {
    let interval: any;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsExpired(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSendOtp = () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    setError("");
    
    // Generate a random 6-digit OTP
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(mockOtp);
    setTimer(60);
    setIsExpired(false);
    setStep(2);
    
    // Show a beautiful simulated notification banner
    setOtpNotification(`[SMS SIMULATOR] OTP sent to +91 ${phoneNumber}: ${mockOtp}`);
  };

  const handleResendOtp = () => {
    const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(mockOtp);
    setTimer(60);
    setIsExpired(false);
    setOtp("");
    setError("");
    setOtpNotification(`[SMS SIMULATOR] New OTP sent to +91 ${phoneNumber}: ${mockOtp}`);
  };

  const handleVerifyOtpAndPay = async () => {
    if (isExpired) {
      setError("OTP has expired! Please click Resend OTP.");
      return;
    }
    if (otp !== generatedOtp) {
      setError("Invalid OTP! Please try again.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const response = await axiosInstance.post("/payment/verify", {
        razorpay_order_id: `order_mock_${Date.now()}`,
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_signature: "mock_signature",
        userId: user._id,
      });

      if (response.data.user) {
        onsuccess(response.data.user);
        alert("Payment & OTP Verified Successfully! You are now a Premium user.");
        // Reset fields
        setStep(1);
        setPhoneNumber("");
        setOtp("");
        onclose();
      }
    } catch (error) {
      console.error("Simulation error:", error);
      setError("Failed to verify simulated payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <Dialog open={isopen} onOpenChange={() => {
      setStep(1);
      setPhoneNumber("");
      setOtp("");
      setError("");
      setOtpNotification("");
      onclose();
    }}>
      <DialogContent className="sm:max-w-md bg-zinc-950 text-white border-yellow-500/30">
        <DialogHeader className="text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center mb-2 border border-yellow-500/20">
            <Crown className="w-6 h-6 text-yellow-500 animate-pulse" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
            YourTube 2.0 Premium
          </DialogTitle>
          <p className="text-xs text-zinc-400 mt-1">
            Simulated Checkout with SMS OTP Verification
          </p>
        </DialogHeader>

        {otpNotification && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2 text-xs text-yellow-400 text-center font-mono animate-bounce mt-2">
            {otpNotification}
          </div>
        )}

        <div className="py-4 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center text-xs text-zinc-400">
              <span>Subscription Plan</span>
              <span className="font-semibold text-yellow-500">Premium Lifetime</span>
            </div>
            <div className="flex justify-between items-center text-xs text-zinc-400">
              <span>Amount</span>
              <span className="font-bold text-white">₹199.00</span>
            </div>
          </div>

          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs text-zinc-400 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Enter Phone Number for OTP
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500 text-sm font-medium">+91</span>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="9876543210"
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                    className="pl-12 bg-zinc-900 border-zinc-800 text-white placeholder-zinc-600 focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>
              </div>
              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="otp" className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Enter 6-digit OTP
                  </Label>
                  <span className={`text-xs font-mono flex items-center gap-1 ${isExpired ? "text-red-500" : "text-yellow-500"}`}>
                    <Clock className="w-3 h-3" />
                    {isExpired ? "Expired" : formatTime(timer)}
                  </span>
                </div>
                <Input
                  id="otp"
                  type="text"
                  placeholder="******"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  disabled={isExpired}
                  className="bg-zinc-900 border-zinc-800 text-center tracking-widest text-lg font-bold text-white focus:border-yellow-500 focus:ring-yellow-500"
                />
              </div>
              {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}
            </div>
          )}
        </div>

        <DialogFooter className="flex sm:flex-row gap-2 sm:justify-between items-center">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setStep(1);
              setPhoneNumber("");
              setOtp("");
              setError("");
              setOtpNotification("");
              onclose();
            }}
            className="text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs"
          >
            Cancel
          </Button>

          {step === 1 ? (
            <Button
              type="button"
              onClick={handleSendOtp}
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-xs border-none shadow-md shadow-yellow-500/10"
            >
              Send Verification OTP
            </Button>
          ) : (
            <div className="flex gap-2">
              {isExpired && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResendOtp}
                  className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Resend
                </Button>
              )}
              <Button
                type="button"
                onClick={handleVerifyOtpAndPay}
                disabled={isSubmitting || otp.length !== 6}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-xs border-none shadow-md shadow-yellow-500/10"
              >
                {isSubmitting ? "Verifying..." : "Confirm & Pay (₹199)"}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentDialogue;
