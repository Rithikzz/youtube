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
import { ShieldCheck, Mail, Phone, MapPin, Sparkles, Clock } from "lucide-react";
import axiosInstance from "@/lib/axiosinstance";

interface SignInDialogueProps {
  isopen: boolean;
  onclose: () => void;
  onLoginSuccess: (user: any) => void;
}

const SignInDialogue = ({ isopen, onclose, onLoginSuccess }: SignInDialogueProps) => {
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [detectedState, setDetectedState] = useState("");
  const [detectedCity, setDetectedCity] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  
  // OTP Verification States
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState("");
  const [otpMethod, setOtpMethod] = useState("");
  const [mockOtp, setMockOtp] = useState("");
  const [timer, setTimer] = useState(300);
  const [isExpired, setIsExpired] = useState(false);
  const [error, setError] = useState("");

  // Detect location dynamically on load
  useEffect(() => {
    if (isopen) {
      const detectLocation = async () => {
        try {
          const res = await fetch("https://get.geojs.io/v1/ip/geo.json");
          const geoData = await res.json();
          setDetectedState(geoData.region || "Delhi"); // Default to Delhi if untracked
          setDetectedCity(geoData.city || "New Delhi");
        } catch (err) {
          console.warn("Location detection failed, defaulting to Delhi", err);
          setDetectedState("Delhi");
          setDetectedCity("New Delhi");
        }
      };
      detectLocation();
      setStep("credentials");
      setError("");
      setOtp("");
      setTimer(300);
      setIsExpired(false);
    }
  }, [isopen]);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === "otp" && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsExpired(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const isSouthIndia = (stateName: string) => {
    const southStates = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"];
    return southStates.includes(stateName);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter a valid email address");
      return;
    }

    const requiresMobile = !isSouthIndia(detectedState);
    if (requiresMobile && !mobile) {
      setError("Users outside South India must enter a valid mobile number");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const payload = {
        email,
        name: email.split("@")[0], // Fallback user name
        image: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
        state: detectedState,
        city: detectedCity,
        mobile: requiresMobile ? mobile : undefined,
      };

      const response = await axiosInstance.post("/user/login", payload);

      if (response.data.userId) {
        setUserId(response.data.userId);
        setOtpMethod(response.data.otpMethod);
        setMockOtp(response.data.otp || "");
        setStep("otp");
        setTimer(300);
        setIsExpired(false);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to initiate login. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (isExpired) {
      setError("OTP has expired! Please try requesting again.");
      return;
    }
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const response = await axiosInstance.post("/user/verify-otp", {
        userId,
        otp,
      });

      if (response.data.result) {
        onLoginSuccess(response.data.result);
        alert("OTP Verified Successfully! Welcome to YourTube 2.0.");
        onclose();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <Dialog open={isopen} onOpenChange={(open) => !open && onclose()}>
      <DialogContent className="sm:max-w-md bg-zinc-950 text-white border-zinc-800 shadow-xl shadow-black/40">
        
        {step === "credentials" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <DialogHeader className="text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-red-600/10 rounded-full flex items-center justify-center mb-2 border border-red-600/20">
                <ShieldCheck className="w-6 h-6 text-red-500" />
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 justify-center">
                Sign In to YourTube <span className="text-xs text-red-500 font-bold bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">2.0</span>
              </DialogTitle>
              <p className="text-xs text-zinc-400">
                Enter your details to receive your secure, region-specific OTP.
              </p>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-zinc-400">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-zinc-900 border-zinc-800 pl-10 text-white focus:border-red-500 focus:ring-red-500"
                  />
                </div>
              </div>

              {/* Dynamic mobile view based on location */}
              {detectedState && !isSouthIndia(detectedState) && (
                <div className="space-y-1.5 animate-fadeIn">
                  <Label htmlFor="mobile" className="text-xs text-zinc-400 flex items-center justify-between">
                    <span>Mobile Number</span>
                    <span className="text-[10px] text-yellow-500 font-medium font-mono uppercase bg-yellow-500/10 px-1 rounded">Required outside South India</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      id="mobile"
                      type="tel"
                      placeholder="e.g. +91 9876543210"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      required
                      className="bg-zinc-900 border-zinc-800 pl-10 text-white focus:border-red-500 focus:ring-red-500"
                    />
                  </div>
                </div>
              )}

              {/* Detected Location Card */}
              {detectedState && (
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-2.5 flex items-center justify-between text-xs">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500 animate-bounce" /> Detected Region:
                  </span>
                  <span className="text-zinc-200 font-semibold flex items-center gap-1.5">
                    {detectedCity}, {detectedState}
                    {isSouthIndia(detectedState) ? (
                      <span className="text-[10px] text-green-500 font-bold bg-green-500/10 px-1 rounded uppercase tracking-wider border border-green-500/20">South India</span>
                    ) : (
                      <span className="text-[10px] text-yellow-500 font-bold bg-yellow-500/10 px-1 rounded uppercase tracking-wider border border-yellow-500/20">Other</span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {error && <p className="text-xs text-red-500 font-medium text-center">{error}</p>}

            <DialogFooter className="flex sm:flex-row gap-2 sm:justify-between items-center pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onclose}
                className="text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs border-none w-full sm:w-auto shadow-md shadow-red-600/10"
              >
                {isLoading ? "Requesting OTP..." : "Get OTP Code"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <DialogHeader className="text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center mb-2 border border-yellow-500/20">
                <ShieldCheck className="w-6 h-6 text-yellow-500" />
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight text-white">
                Enter Validation Code
              </DialogTitle>
              <p className="text-xs text-zinc-400 mt-1">
                We've sent a 6-digit OTP to your registered {otpMethod === "email" ? "Email Address" : "Mobile Number"}.
              </p>
            </DialogHeader>

            <div className="py-2 space-y-4">
              {mockOtp && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 p-2.5 rounded text-center text-xs font-mono flex items-center justify-center gap-1.5 animate-pulse">
                  <span className="font-semibold text-[10px] tracking-wide uppercase px-1.5 py-0.5 bg-yellow-500 text-black rounded select-none">
                    Sandbox
                  </span>
                  <span>
                    Mock OTP Code:{" "}
                    <strong className="text-sm underline decoration-wavy decoration-yellow-400 select-all font-bold tracking-widest">
                      {mockOtp}
                    </strong>
                  </span>
                </div>
              )}

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 flex items-center justify-center gap-2">
                {otpMethod === "email" ? (
                  <Mail className="w-4 h-4 text-zinc-400" />
                ) : (
                  <Phone className="w-4 h-4 text-zinc-400" />
                )}
                <span className="text-sm text-zinc-300 font-medium">
                  {otpMethod === "email" ? email : mobile}
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
                onClick={() => setStep("credentials")}
                className="text-zinc-400 hover:text-white hover:bg-zinc-900 text-xs w-full sm:w-auto"
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.length !== 6}
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-xs border-none w-full sm:w-auto shadow-md shadow-yellow-500/10"
              >
                {isLoading ? "Verifying..." : "Verify & Secure Login"}
              </Button>
            </DialogFooter>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
};

export default SignInDialogue;
