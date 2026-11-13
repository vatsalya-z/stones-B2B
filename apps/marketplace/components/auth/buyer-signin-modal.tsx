"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, Lock, Mail, Phone, Loader2, ArrowRight } from "lucide-react";

interface BuyerSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type AuthTab = "mobile" | "email";

export function BuyerSignInModal({
  isOpen,
  onClose,
  onSuccess,
}: BuyerSignInModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<AuthTab>("mobile");

  // Mobile state
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [testOtpHint, setTestOtpHint] = useState<string | null>(null);

  // Email state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setError(null);
      setSuccessMessage(null);
      setOtpSent(false);
      setOtp("");
      setTimeout(() => {
        if (activeTab === "mobile") {
          phoneInputRef.current?.focus();
        } else {
          emailInputRef.current?.focus();
        }
      }, 100);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, activeTab]);

  // Escape key listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // --- 1-Click Demo Fill for Developer/Tester ---
  function handleDemoEmailFill() {
    setActiveTab("email");
    setEmail("buyer@gmail.com");
    setPassword("Password@123");
    setError(null);
  }

  function handleDemoMobileFill() {
    setActiveTab("mobile");
    setPhone("9876543210");
    setError(null);
  }

  // --- Handle Send OTP ---
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/mobile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_otp", phone: cleanPhone }),
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok || data.error) {
        setError(data.error || "Failed to send OTP. Please try again.");
        return;
      }

      setOtpSent(true);
      setTestOtpHint(data.testOtp || "1234");
      setOtp(data.testOtp || "1234"); // auto-fill demo OTP for convenience
      setTimeout(() => otpInputRef.current?.focus(), 150);
    } catch {
      setLoading(false);
      setError("Network error while sending OTP.");
    }
  }

  // --- Handle Verify OTP ---
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setError("Please enter the OTP.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/mobile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_otp",
          phone: phone.replace(/\D/g, ""),
          otp: cleanOtp,
        }),
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok || data.error) {
        setError(data.error || "Invalid OTP. Please try again.");
        return;
      }

      setSuccessMessage("Login Successful! Connecting you...");
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
        else window.location.reload();
      }, 1000);
    } catch {
      setLoading(false);
      setError("Network error during verification.");
    }
  }

  // --- Handle Email Login ---
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok || data.error) {
        setError(data.error || "Invalid email or password.");
        return;
      }

      setSuccessMessage("Sign In Successful!");
      setTimeout(() => {
        onClose();
        if (onSuccess) onSuccess();
        else window.location.reload();
      }, 1000);
    } catch {
      setLoading(false);
      setError("Network error during login.");
    }
  }

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Modal Dialog Card (Matches StonesDekho Obsidian & Warm Amber Theme) */}
      <div className="relative w-full max-w-[440px] my-auto bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-in zoom-in-95 duration-200">
        {/* Top Accent Gold Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

        {/* 1. Header (Deep Obsidian Stone 950 with Warm Amber Accents) */}
        <div className="relative bg-stone-950 px-6 py-5 text-white border-b border-stone-800">
          {/* Close button 'X' */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-stone-400 hover:text-white transition-colors cursor-pointer p-1 rounded-full hover:bg-stone-800/80"
            aria-label="Close"
          >
            <X className="w-5 h-5" strokeWidth={2.5} />
          </button>

          {/* Heading */}
          <h3 className="text-lg sm:text-xl font-extrabold tracking-tight text-white pr-6">
            Login to connect with suppliers
          </h3>
          {/* Subtitle */}
          <p className="mt-0.5 text-xs text-amber-400/90 italic font-medium">
            Login to get verified Indian quarry &amp; factory rates
          </p>
        </div>

        {/* 2. Authentication Mode Tabs (Mobile vs Email) */}
        <div className="flex border-b border-stone-200 bg-stone-100/70">
          <button
            type="button"
            onClick={() => {
              setActiveTab("mobile");
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "mobile"
                ? "bg-white text-stone-900 border-b-2 border-amber-600 shadow-2xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Phone className="w-3.5 h-3.5 text-amber-600" />
            <span>Mobile Number</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("email");
              setError(null);
            }}
            className={`flex-1 py-3 text-xs font-bold text-center flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "email"
                ? "bg-white text-stone-900 border-b-2 border-amber-600 shadow-2xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-amber-600" />
            <span>Email ID</span>
          </button>
        </div>

        {/* 3. Body Section */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <span className="text-sm">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: Mobile Authentication */}
          {activeTab === "mobile" && (
            <div>
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  {/* Flag 🇮🇳 +91 and Mobile Input */}
                  <div className="flex rounded-xl border border-stone-300 overflow-hidden focus-within:ring-2 focus-within:ring-amber-500/25 focus-within:border-amber-600 transition-all bg-white">
                    {/* Left Flag + +91 Container */}
                    <div className="px-3.5 py-3 text-sm font-semibold text-stone-700 border-r border-stone-200 bg-stone-50 flex items-center gap-1.5 select-none shrink-0">
                      <span className="text-base leading-none">🇮🇳</span>
                      <span className="text-stone-300 font-bold">·</span>
                      <span className="text-stone-800 font-bold">+91</span>
                    </div>

                    {/* Right Mobile Number Input */}
                    <input
                      ref={phoneInputRef}
                      type="tel"
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      placeholder="Enter your mobile number"
                      className="w-full px-3.5 py-3 text-sm focus:outline-none bg-transparent text-stone-900 placeholder:text-stone-400 font-medium"
                      maxLength={10}
                      required
                    />
                  </div>

                  {/* Trust message with green checkmark */}
                  <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="italic text-stone-600 text-[12px]">
                      Your mobile number is safe with us
                    </span>
                  </div>

                  {/* GET OTP Button (StonesDekho Signature Amber CTA Button) */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm sm:text-base py-3.5 px-4 rounded-xl shadow-md shadow-amber-600/30 hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-70 cursor-pointer tracking-wider"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <span>GET OTP</span>
                    )}
                  </button>
                </form>
              ) : (
                /* OTP Verification Step */
                <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950">
                    OTP sent to <strong>+91 {phone}</strong>.
                    {testOtpHint && (
                      <span className="block mt-1 text-[11px] text-amber-800">
                        ⚡ Demo OTP: <strong>{testOtpHint}</strong>
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Enter 4-Digit OTP
                    </label>
                    <input
                      ref={otpInputRef}
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                      placeholder="Enter OTP (e.g. 1234)"
                      className="w-full px-4 py-3 text-base text-center tracking-widest font-mono font-bold border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600"
                      maxLength={6}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-sm transition-all disabled:opacity-70 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <span>VERIFY &amp; LOGIN</span>
                    )}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-xs text-stone-500 hover:text-stone-800 underline cursor-pointer"
                    >
                      ← Change mobile number
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: Email Authentication */}
          {activeTab === "email" && (
            <form onSubmit={handleEmailLogin} className="space-y-3.5 animate-in fade-in">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="buyer@gmail.com"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-900"
                    required
                  />
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-stone-900"
                    required
                  />
                  <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm py-3.5 px-4 rounded-xl shadow-md shadow-amber-600/30 hover:shadow-lg transition-all disabled:opacity-70 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>SIGN IN WITH EMAIL</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Autofill Bar */}
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-[11px]">
            <span className="text-stone-400">⚡ Test Account:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDemoMobileFill}
                className="text-stone-600 hover:text-stone-900 font-semibold underline cursor-pointer"
              >
                Auto Mobile
              </button>
              <span className="text-stone-300">|</span>
              <button
                type="button"
                onClick={handleDemoEmailFill}
                className="text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
              >
                Auto Buyer Email
              </button>
            </div>
          </div>

          {/* 4. Bottom Branding (StonesDekho Logo with Amber accent) */}
          <div className="mt-4 pt-3 flex items-center justify-between border-t border-stone-100">
            <span className="text-[10px] text-stone-400 font-medium">
              Verified B2B Stone Network
            </span>
            <div className="flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4 text-amber-600"
              >
                <path d="M12.378 1.602a.75.75 0 0 0-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03ZM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 0 0 .372-.648V7.93ZM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 0 0 .372.648l8.628 5.033Z" />
              </svg>
              <span className="text-xs font-extrabold tracking-tight text-stone-900">
                Stones<span className="text-amber-600">Dekho</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
