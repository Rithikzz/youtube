import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Clock, RefreshCw, Mail, Phone, ShieldCheck } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";

const OtpDialogue = ({ isopen, onclose, userId, otpMethod, email, onLoginSuccess }: any) => {
  const [otp, setOtp] = useState("");
  const [timer, setTimer] = useState(300); // 5 minutes
  const [isExpired, setIsExpired] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isopen && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsExpired(true);
    }
    return () => clearInterval(interval);
  }, [isopen, timer]);

  const handleVerifyOtp = async () => {
    if (isExpired) {
      setError("OTP has expired! Please close and try logging in again.");
      return;
    }
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    try {
      const response = await axiosInstance.post("/user/verify-otp", {
        userId,
        otp,
      });

      if (response.data.result) {
        onLoginSuccess(response.data.result);
        alert("OTP Verified Successfully! Welcome back.");
        setOtp("");
        onclose();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Invalid OTP. Please try again.");
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
    <Dialog open={isopen} onOpenChange={(open) => !open && onclose()}>
      <DialogContent className="sm:max-w-md bg-zinc-950 text-white border-zinc-800">
        <DialogHeader className="text-center flex flex-col items-center">
          <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-2 border border-zinc-800">
            <ShieldCheck className="w-6 h-6 text-yellow-500" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-white">
            Security Verification
          </DialogTitle>
          <p className="text-xs text-zinc-400 mt-1">
            We've sent a 6-digit OTP to your registered {otpMethod === "email" ? "Email Address" : "Mobile Number"}.
          </p>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 flex items-center justify-center gap-2">
            {otpMethod === "email" ? (
              <Mail className="w-4 h-4 text-zinc-400" />
            ) : (
              <Phone className="w-4 h-4 text-zinc-400" />
            )}
            <span className="text-sm text-zinc-300 font-medium">
              {otpMethod === "email" ? email : "Registered Device"}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="otp" className="text-xs text-zinc-400">Enter OTP</Label>
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

        <DialogFooter className="flex sm:flex-row gap-2 sm:justify-between items-center">
          <Button
            type="button"
            variant="ghost"
            onClick={onclose}
            className="text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleVerifyOtp}
            disabled={isSubmitting || otp.length !== 6}
            className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-xs border-none w-full sm:w-auto"
          >
            {isSubmitting ? "Verifying..." : "Verify & Secure Login"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OtpDialogue;
