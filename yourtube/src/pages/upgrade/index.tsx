import React, { useState } from "react";
import { useUser } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Crown, Sparkles, Check, Play, ShieldAlert, BadgeInfo } from "lucide-react";
import PaymentDialogue from "@/components/PaymentDialogue";
import axiosInstance from "@/lib/axiosinstance";

const UpgradePlans = () => {
  const { user, login } = useUser();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  const plans = [
    {
      id: "free",
      name: "Free Plan",
      price: "₹0",
      description: "Basic access with time limitation",
      features: [
        "Watch any video up to 5 minutes",
        "Standard streaming resolution",
        "Download up to 1 video per day",
        "Ad-supported experience",
      ],
      color: "border-zinc-800 bg-zinc-950/50",
      buttonColor: "bg-zinc-800 hover:bg-zinc-700 text-zinc-300",
      textColor: "text-zinc-400",
      badge: null,
    },
    {
      id: "bronze",
      name: "Bronze Plan",
      price: "₹10",
      description: "Extended watch time for casual viewers",
      features: [
        "Watch any video up to 7 minutes",
        "Standard streaming resolution",
        "Download up to 1 video per day",
        "Reduced ad frequency",
      ],
      color: "border-amber-600/30 bg-zinc-950/60 shadow-amber-600/5 hover:border-amber-500/50",
      buttonColor: "bg-amber-600 hover:bg-amber-700 text-white",
      textColor: "text-amber-500",
      badge: "Popular Starter",
    },
    {
      id: "silver",
      name: "Silver Plan",
      price: "₹50",
      description: "Perfect tier for active daily users",
      features: [
        "Watch any video up to 10 minutes",
        "High-definition video playback",
        "Download up to 1 video per day",
        "Zero ad interruptions",
      ],
      color: "border-zinc-500/30 bg-zinc-950/60 shadow-zinc-500/5 hover:border-zinc-400/50",
      buttonColor: "bg-zinc-200 hover:bg-zinc-300 text-zinc-950",
      textColor: "text-zinc-300",
      badge: "Best Value",
    },
    {
      id: "gold",
      name: "Gold Plan",
      price: "₹100",
      description: "Ultimate unrestricted viewing power",
      features: [
        "Unlimited video watch duration",
        "Ultra HD / 4K streaming quality",
        "Unlimited high-speed downloads",
        "Priority premium customer support",
      ],
      color: "border-yellow-500/40 bg-zinc-950/80 shadow-yellow-500/10 scale-105 relative z-10 hover:border-yellow-400/60",
      buttonColor: "bg-yellow-500 hover:bg-yellow-600 text-zinc-950 font-bold",
      textColor: "text-yellow-500",
      badge: "Unlimited Choice",
    },
  ];

  const handleUpgradeClick = (planId: string) => {
    if (!user) {
      alert("Please login first to upgrade your plan.");
      return;
    }
    if (user.plan === planId) {
      alert(`You are already subscribed to the ${planId.toUpperCase()} Plan.`);
      return;
    }
    setSelectedPlan(planId);
    setIsPaymentOpen(true);
  };

  const getActivePlanLabel = (planId: string) => {
    if (!user) return "Get Started";
    if (user.plan === planId) return "Active Plan";
    
    // Check hierarchy if applicable or just show Upgrade
    const planHierarchy = ["free", "bronze", "silver", "gold"];
    const userPlanIndex = planHierarchy.indexOf(user.plan || "free");
    const targetPlanIndex = planHierarchy.indexOf(planId);
    
    if (targetPlanIndex < userPlanIndex) {
      return "Downgrade";
    }
    return "Upgrade";
  };

  return (
    <div className="min-h-screen bg-black text-white py-16 px-4">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <Crown className="w-3.5 h-3.5" /> Plan Upgrades
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
            Choose Your Watch Limits
          </h1>
          <p className="text-zinc-400 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Upgrade your plan to unlock extended playback times, high-definition streaming, and unlimited offline video downloads.
          </p>
        </div>

        {/* Current Plan Indicator Card */}
        {user && (
          <div className="max-w-md mx-auto bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                <Play className="w-5 h-5 text-yellow-500 fill-yellow-500/20" />
              </div>
              <div>
                <p className="text-xs text-zinc-500">Your Current Subscription</p>
                <h3 className="text-base font-bold text-white uppercase tracking-wider mt-0.5">
                  {user.plan || "free"} Plan
                </h3>
              </div>
            </div>
            <div className="px-3 py-1 rounded bg-yellow-500/10 border border-yellow-500/25 text-yellow-500 text-xs font-bold uppercase tracking-wider">
              {user.plan === "gold" ? "Unlimited" : `${user.watchLimit || 5} min Limit`}
            </div>
          </div>
        )}

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 items-stretch">
          {plans.map((plan) => {
            const isActive = user?.plan === plan.id;
            return (
              <Card
                key={plan.id}
                className={`flex flex-col border p-6 rounded-2xl shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${plan.color} text-white`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full bg-yellow-500 text-zinc-950 text-[10px] font-black uppercase tracking-wider border border-black">
                    {plan.badge}
                  </div>
                )}

                {/* Plan Header */}
                <div className="space-y-2 mb-6">
                  <h3 className="text-lg font-bold tracking-tight text-white uppercase tracking-wider">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1 py-1">
                    <span className="text-4xl font-extrabold tracking-tight text-white">{plan.price}</span>
                    <span className="text-zinc-500 text-xs">/ lifetime</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-normal">{plan.description}</p>
                </div>

                {/* Features List */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-tight">
                      <Check className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <Button
                  onClick={() => handleUpgradeClick(plan.id)}
                  disabled={isActive || plan.id === "free"}
                  className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition-all duration-200 ${plan.buttonColor}`}
                >
                  {getActivePlanLabel(plan.id)}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Info Banner */}
        <div className="max-w-2xl mx-auto flex gap-3 p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl items-start">
          <BadgeInfo className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-white">Need to upgrade your playback experience?</h4>
            <p className="text-[11px] text-zinc-400 leading-normal">
              Subscription plans dynamically modify your watch time limits on all active streaming pages immediately upon transaction validation. Double check your receipt details inside the automatically sent invoice email.
            </p>
          </div>
        </div>
      </div>

      {/* Payment Dialogue Modal */}
      {user && selectedPlan && (
        <PaymentDialogue
          isopen={isPaymentOpen}
          onclose={() => setIsPaymentOpen(false)}
          user={user}
          plan={selectedPlan}
          onsuccess={(updatedUser: any) => login(updatedUser)}
        />
      )}
    </div>
  );
};

export default UpgradePlans;
