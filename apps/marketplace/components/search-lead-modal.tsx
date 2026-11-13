"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, Send, Lock, Mail, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

interface SearchLeadModalProps {
  /** The search term that triggered the modal */
  initialQuery: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (query: string) => void;
}

export function SearchLeadModal({
  initialQuery,
  isOpen,
  onClose,
  onSuccess,
}: SearchLeadModalProps) {
  const router = useRouter();
  const [productName, setProductName] = useState(initialQuery);
  const [mobileNumber, setMobileNumber] = useState("");
  const [guestName, setGuestName] = useState("");
  const [showPasswordLogin, setShowPasswordLogin] = useState(false);

  // Email / password login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep productName in sync with initialQuery when modal opens
  useEffect(() => {
    if (isOpen) {
      setProductName(initialQuery);
      setError(null);
      setSubmitted(false);
    }
  }, [isOpen, initialQuery]);

  // Focus mobile input on open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, showPasswordLogin]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lead save function
  const saveLead = useCallback(
    async (payload: {
      query: string;
      name?: string;
      phone?: string;
      email?: string;
    }) => {
      try {
        await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.error("Failed to save lead:", err);
      }
    },
    [],
  );

  // 1-Click Demo Fill for testing
  function handleDemoFill() {
    setShowPasswordLogin(true);
    setEmail("buyer@gmail.com");
    setPassword("Password@123");
    setError(null);
  }

  // Handle IndiaMart-style Mobile + Product requirement submission
  async function handleRequirementSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanProduct = productName.trim();
    if (!cleanProduct || cleanProduct.length < 2) {
      setError("Please enter the stone or product you need.");
      return;
    }

    const cleanMobile = mobileNumber.replace(/\D/g, "");
    if (!cleanMobile || cleanMobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    setLoading(true);

    try {
      // 1. Save search lead to PostgreSQL database
      await saveLead({
        query: cleanProduct,
        phone: `+91${cleanMobile}`,
        name: guestName.trim() || undefined,
      });

      setSubmitted(true);
      setLoading(false);

      // 2. Allow user to see success state, then redirect to search results
      setTimeout(() => {
        onClose();
        if (onSuccess) {
          onSuccess(cleanProduct);
        } else {
          router.push(`/products?q=${encodeURIComponent(cleanProduct)}`);
        }
      }, 1500);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  // Handle password login for registered buyers
  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || "Invalid login credentials");
        setLoading(false);
        return;
      }

      // Save lead associated with logged-in user
      const cleanProduct = productName.trim() || initialQuery;
      await saveLead({
        query: cleanProduct,
      });

      setSubmitted(true);
      setLoading(false);

      setTimeout(() => {
        onClose();
        if (onSuccess) {
          onSuccess(cleanProduct);
        } else {
          router.push(`/products?q=${encodeURIComponent(cleanProduct)}`);
        }
      }, 1200);
    } catch {
      setError("Network error while logging in.");
      setLoading(false);
    }
  }

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* Modal Dialog Card */}
      <div
        ref={modalRef}
        className="relative w-full max-w-[840px] my-auto bg-white rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-stone-200 animate-in zoom-in-95 duration-200"
      >
        {/* Top-Right Close Button (X) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-stone-400 hover:text-stone-700 bg-white/80 hover:bg-stone-100 rounded-full p-1.5 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
        </button>

        {/* LEFT COLUMN: IndiaMart-style Mint Banner + Illustration */}
        <div className="w-full md:w-[42%] bg-[#eaf7f5] p-6 sm:p-8 flex flex-col items-center justify-center text-center relative border-b md:border-b-0 md:border-r border-[#cdeae5]">
          {/* Inner Laptop Illustration Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-[#d6f0eb] w-full max-w-[240px] flex items-center justify-center mb-5">
            <svg
              viewBox="0 0 160 130"
              className="w-full h-auto max-h-[110px]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Laptop screen body */}
              <rect
                x="20"
                y="15"
                width="120"
                height="80"
                rx="6"
                stroke="#68c5b8"
                strokeWidth="2.5"
                fill="#ffffff"
              />
              <line x1="20" y1="85" x2="140" y2="85" stroke="#e0f2fe" strokeWidth="1.5" />
              {/* Laptop base */}
              <path
                d="M10 95 C10 95, 15 102, 30 102 L130 102 C145 102, 150 95, 150 95 Z"
                stroke="#68c5b8"
                strokeWidth="2.5"
                fill="#f0fdfa"
              />
              <line x1="68" y1="98" x2="92" y2="98" stroke="#68c5b8" strokeWidth="2.5" strokeLinecap="round" />

              {/* Text lines inside screen */}
              <line x1="32" y1="28" x2="88" y2="28" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="32" y1="36" x2="108" y2="36" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="32" y1="44" x2="98" y2="44" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="32" y1="52" x2="82" y2="52" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
              {/* Highlight red accent line */}
              <rect x="74" y="49" width="30" height="5" rx="2.5" fill="#f87171" opacity="0.85" />
              <line x1="32" y1="60" x2="70" y2="60" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
              <rect x="72" y="58" width="22" height="4" rx="2" fill="#38bdf8" opacity="0.8" />
              <line x1="32" y1="68" x2="60" y2="68" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />

              {/* Red/orange dashed trajectory of paper airplane */}
              <path
                d="M 65 52 Q 85 10, 125 18"
                stroke="#f97316"
                strokeWidth="1.8"
                strokeDasharray="3 3"
                fill="none"
              />

              {/* Flying paper airplane */}
              <g transform="translate(116, 6) rotate(15) scale(0.65)">
                <polygon points="0,20 38,0 24,34 16,22" fill="#38bdf8" />
                <polygon points="16,22 38,0 24,34" fill="#0284c7" />
                <polygon points="0,20 16,22 10,32" fill="#f97316" />
              </g>
            </svg>
          </div>

          {/* Heading & Subtext */}
          <h3 className="text-xl sm:text-2xl font-bold text-[#007065] tracking-tight mb-2">
            Looking for ?
          </h3>
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-[260px]">
            Let us know your requirement, and get quotes from trusted sellers!
          </p>

          {/* Trust points */}
          <div className="mt-5 hidden sm:flex flex-col gap-2 text-left w-full max-w-[220px]">
            <div className="flex items-center gap-2 text-[11px] text-[#006055] font-medium">
              <span className="text-[#007065]">✓</span> 100% Free Service
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#006055] font-medium">
              <span className="text-[#007065]">✓</span> Quotes from Verified Quarries
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#006055] font-medium">
              <span className="text-[#007065]">✓</span> Wholesale Stone Pricing
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: The Form (IndiaMart Exact Pattern) */}
        <div className="w-full md:w-[58%] p-6 sm:p-8 flex flex-col justify-center">
          {submitted ? (
            <div className="py-10 flex flex-col items-center justify-center text-center animate-in fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h4 className="text-xl font-bold text-stone-900 mb-1">Requirement Submitted!</h4>
              <p className="text-sm text-stone-600 max-w-sm mb-4">
                We have registered your requirement for{" "}
                <span className="font-semibold text-stone-900">&ldquo;{productName}&rdquo;</span>.
                Connecting you with verified stone suppliers now...
              </p>
              <div className="flex items-center gap-2 text-xs text-stone-400">
                <Loader2 className="w-4 h-4 animate-spin text-[#007065]" />
                Opening product search results...
              </div>
            </div>
          ) : !showPasswordLogin ? (
            /* IndiaMart Default Mode: Product Name + Mobile Number + Get OTP */
            <div>
              <form onSubmit={handleRequirementSubmit} className="space-y-4 sm:space-y-5">
                {error && (
                  <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                    <span className="text-sm">⚠️</span> {error}
                  </div>
                )}

                {/* 1. Enter Product/Service name* */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1.5">
                    Enter Product/Service name<span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Enter Product / Service name"
                    className="w-full px-4 py-3 text-sm sm:text-base border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007065]/30 focus:border-[#007065] transition-all text-stone-900 placeholder:text-stone-400 bg-stone-50/50 focus:bg-white"
                    required
                  />
                </div>

                {/* 2. Mobile Number* */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-stone-700 mb-1.5">
                    Mobile Number<span className="text-red-500 font-bold">*</span>
                  </label>
                  <div className="flex rounded-xl border border-stone-300 overflow-hidden focus-within:ring-2 focus-within:ring-[#007065]/30 focus-within:border-[#007065] transition-all bg-stone-50/50 focus-within:bg-white">
                    <div className="px-3.5 py-3 text-sm sm:text-base font-medium text-stone-600 border-r border-stone-300 bg-stone-100 flex items-center select-none">
                      +91
                    </div>
                    <input
                      ref={inputRef}
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="Enter your Mobile"
                      className="w-full px-4 py-3 text-sm sm:text-base focus:outline-none bg-transparent text-stone-900 placeholder:text-stone-400"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                {/* Optional Buyer Name */}
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">
                    Your Name <span className="text-stone-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="e.g. Ramesh Sharma / Architect"
                    className="w-full px-4 py-2.5 text-xs sm:text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007065]/20 focus:border-[#007065] text-stone-800 placeholder:text-stone-400"
                  />
                </div>

                {/* 3. Primary Button: Get OTP > */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 bg-[#007065] hover:bg-[#005a51] text-white font-semibold text-base py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Submitting Requirement...</span>
                    </>
                  ) : (
                    <>
                      <span>Get Instant Quotes</span>
                      <Send className="w-4 h-4 fill-white text-white" />
                    </>
                  )}
                </button>
              </form>

              {/* Alternative Option: Sign in with Password */}
              <div className="mt-5 pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-stone-500">
                <span>Already have a buyer account?</span>
                <button
                  type="button"
                  onClick={() => setShowPasswordLogin(true)}
                  className="text-[#007065] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Sign in with Password
                </button>
              </div>

              {/* 1-Click Demo Fill for Developer/Tester Convenience */}
              <div className="mt-3 bg-amber-50/80 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
                <span className="text-amber-900 font-medium">⚡ Testing? Quick autofill:</span>
                <button
                  type="button"
                  onClick={handleDemoFill}
                  className="font-bold text-amber-700 hover:text-amber-900 underline cursor-pointer"
                >
                  Buyer Demo Login →
                </button>
              </div>
            </div>
          ) : (
            /* Registered Buyer Password Login Mode */
            <div>
              <div className="mb-4">
                <h4 className="text-lg font-bold text-stone-900">Sign In to Your Account</h4>
                <p className="text-xs text-stone-500">
                  Save quotes, track seller conversations, and view wholesale rates.
                </p>
              </div>

              <form onSubmit={handlePasswordLogin} className="space-y-3.5">
                {error && (
                  <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                    <span className="text-sm">⚠️</span> {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="buyer@gmail.com"
                      className="w-full pl-9 pr-4 py-2.5 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007065]/30 focus:border-[#007065]"
                      required
                    />
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password@123"
                      className="w-full pl-9 pr-4 py-2.5 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007065]/30 focus:border-[#007065]"
                      required
                    />
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-[#007065] hover:bg-[#005a51] text-white font-semibold py-3 px-4 rounded-xl text-sm shadow transition-all disabled:opacity-60 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In &amp; Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Back to Mobile / Requirement mode */}
              <div className="mt-4 pt-3 border-t border-stone-200 text-center">
                <button
                  type="button"
                  onClick={() => setShowPasswordLogin(false)}
                  className="text-xs text-stone-500 hover:text-stone-800 underline cursor-pointer"
                >
                  ← Submit with Mobile Number instead
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
