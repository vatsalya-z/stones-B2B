"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { MobileNav } from "./mobile-nav";
import { BuyerSignInModal } from "@/components/auth/buyer-signin-modal";
import { SearchLeadModal } from "@/components/search-lead-modal";

interface ISpeechRecognitionEvent {
  results?: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface ISpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
}

interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognitionInstance;
}

/**
 * StonesDekho cubic logo icon
 */
function StoneLogoIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12.378 1.602a.75.75 0 0 0-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03ZM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 0 0 .372-.648V7.93ZM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 0 0 .372.648l8.628 5.033Z" />
    </svg>
  );
}

/**
 * Dual-color viewfinder camera icon matching IndiaMART's visual search style
 * with StonesDekho Amber & Red accent brackets
 */
function IndiaMartCameraIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Top Left Amber Bracket */}
      <path
        d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8"
        stroke="#d97706"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Top Right Amber Bracket */}
      <path
        d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8"
        stroke="#d97706"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Bottom Left Red Bracket */}
      <path
        d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20H8"
        stroke="#ef4444"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Bottom Right Red Bracket */}
      <path
        d="M16 20h2.5a1.5 1.5 0 0 0 1.5-1.5V16"
        stroke="#ef4444"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Camera Body in center */}
      <path
        d="M10 8.5h4l.8 1.5H16a1.5 1.5 0 0 1 1.5 1.5v4.5A1.5 1.5 0 0 1 16 17.5H8A1.5 1.5 0 0 1 6.5 16V11.5A1.5 1.5 0 0 1 8 10h1.2l.8-1.5Z"
        fill="#d97706"
      />
      <circle cx="12" cy="13.5" r="1.8" fill="white" />
    </svg>
  );
}

/**
 * Microphone voice icon with dual-color accents (matching IndiaMART's red/teal mic)
 */
function IndiaMartMicIcon({
  className = "h-5 w-5",
  isListening = false,
}: {
  className?: string;
  isListening?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Upper Mic capsule: Amber-600 */}
      <rect
        x="9"
        y="3"
        width="6"
        height="11"
        rx="3"
        fill={isListening ? "#ef4444" : "#d97706"}
      />
      {/* Mic holder bracket */}
      <path
        d="M5 10v1a7 7 0 0 0 14 0v-1"
        stroke="#ef4444"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Stem & Stand */}
      <path
        d="M12 18v3m-4 0h8"
        stroke="#ef4444"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface MobileIndiaMartHeaderProps {
  isLoggedIn: boolean;
  userEmail?: string | null;
  userName?: string | null;
}

export function MobileIndiaMartHeader({
  isLoggedIn,
  userEmail,
  userName,
}: MobileIndiaMartHeaderProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [modalQuery, setModalQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Derive initial for avatar circle (e.g. 'S' or user name initial)
  const avatarInitial = isLoggedIn
    ? (userName?.charAt(0) || userEmail?.charAt(0) || "S").toUpperCase()
    : "S";

  function handleAvatarClick() {
    if (isLoggedIn) {
      router.push("/buyer/dashboard");
    } else {
      setIsAuthModalOpen(true);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = query.trim();
    if (!clean) {
      router.push("/products");
      return;
    }
    if (isLoggedIn) {
      router.push(`/products?q=${encodeURIComponent(clean)}`);
    } else {
      // Guest: capture lead inquiry modal
      setModalQuery(clean);
      setIsLeadModalOpen(true);
    }
  }

  function handleCameraClick() {
    fileInputRef.current?.click();
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    const visualQuery = baseName.trim() || "Natural Stone (Photo Match)";
    setQuery(visualQuery);
    if (isLoggedIn) {
      router.push(`/products?q=${encodeURIComponent(visualQuery)}`);
    } else {
      setModalQuery(visualQuery);
      setIsLeadModalOpen(true);
    }
  }

  function handleMicClick() {
    // Check SpeechRecognition browser API
    const SpeechRecognition =
      (
        window as unknown as {
          SpeechRecognition?: ISpeechRecognitionConstructor;
          webkitSpeechRecognition?: ISpeechRecognitionConstructor;
        }
      ).SpeechRecognition ||
      (
        window as unknown as {
          SpeechRecognition?: ISpeechRecognitionConstructor;
          webkitSpeechRecognition?: ISpeechRecognitionConstructor;
        }
      ).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      // Fallback: focus input if voice not supported
      searchInputRef.current?.focus();
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-IN";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        const spoken = event.results?.[0]?.[0]?.transcript;
        if (spoken) {
          setQuery(spoken);
          if (isLoggedIn) {
            router.push(`/products?q=${encodeURIComponent(spoken)}`);
          } else {
            setModalQuery(spoken);
            setIsLeadModalOpen(true);
          }
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
      searchInputRef.current?.focus();
    }
  }

  return (
    <>
      <div className="w-full flex flex-col print:hidden">
        {/* ── ROW 1: IndiaMART-Style Solid Top Bar ──────────────────── */}
        <div className="h-12 bg-stone-900 text-white px-3 flex items-center justify-between relative z-10">
          {/* Left: Hamburger Icon with Red Notification Badge '1' */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="relative flex items-center justify-center p-2 rounded-lg text-white hover:bg-stone-800 active:scale-95 transition-all focus:outline-none"
            aria-label="Open navigation menu"
          >
            <div className="flex flex-col gap-1 w-5" aria-hidden="true">
              <span className="h-0.5 w-5 bg-white rounded-full transition-all" />
              <span className="h-0.5 w-5 bg-white rounded-full transition-all" />
              <span className="h-0.5 w-5 bg-white rounded-full transition-all" />
            </div>
            {/* Notification Badge '1' */}
            <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-amber-600 text-white text-[10px] font-black shadow-xs border border-stone-900">
              1
            </span>
          </button>

          {/* Center: StonesDekho Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 focus:outline-none active:scale-98 transition-transform"
            aria-label="StonesDekho — Home"
          >
            <StoneLogoIcon className="h-6 w-6 text-amber-500 shrink-0" />
            <div className="text-xl font-black tracking-tight text-white leading-none">
              Stones<span className="text-amber-500">Dekho</span>
            </div>
          </Link>

          {/* Right: Circular Avatar Profile Button (Letter 'S' or User Initial) */}
          <button
            type="button"
            onClick={handleAvatarClick}
            className="h-8 w-8 rounded-full bg-white text-stone-900 font-extrabold text-xs flex items-center justify-center shadow-xs border border-white/20 active:scale-95 transition-transform hover:bg-stone-100"
            aria-label={isLoggedIn ? "Account Profile" : "Sign In to StonesDekho"}
            title={isLoggedIn ? "Account Profile" : "Sign In to StonesDekho"}
          >
            <span>{avatarInitial}</span>
          </button>
        </div>

        {/* ── ROW 2: High-Contrast Search Omnibar (No Bottom Border, Increased Height) ───────────────────── */}
        <div className="bg-white px-3 py-2">
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex items-center w-full h-12 rounded-xl border border-stone-300 bg-white px-3 shadow-2xs focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all"
            role="search"
          >
            {/* Hidden file input for camera photo upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelected}
              aria-label="Upload stone photo"
            />

            {/* Left: Search Icon */}
            <Search className="h-4.5 w-4.5 text-amber-700 shrink-0 mr-2.5 stroke-[2.2]" />

            {/* Middle: Text Input with IndiaMART-style placeholder */}
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search suppliers, products, services"
              className="w-full text-xs sm:text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none bg-transparent pr-1"
            />

            {/* Clear Button if query is typed */}
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="p-1 mr-1 text-stone-400 hover:text-stone-700 transition-colors"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Right: Camera Visual Search Icon */}
            <button
              type="button"
              onClick={handleCameraClick}
              className="p-1 text-stone-600 hover:opacity-85 transition-opacity flex items-center justify-center shrink-0 cursor-pointer active:scale-95"
              title="Search by stone photo / texture"
              aria-label="Search by stone photo"
            >
              <IndiaMartCameraIcon className="w-5 h-5" />
            </button>

            {/* Right: Microphone Voice Search Icon */}
            <button
              type="button"
              onClick={handleMicClick}
              className={`p-1 ml-1 text-stone-600 hover:opacity-85 transition-opacity flex items-center justify-center shrink-0 cursor-pointer active:scale-95 ${
                isListening ? "animate-pulse" : ""
              }`}
              title="Voice Search"
              aria-label="Search by voice"
            >
              <IndiaMartMicIcon className="w-5 h-5" isListening={isListening} />
            </button>
          </form>
        </div>
      </div>

      {/* ── Slide-over Mobile Navigation Drawer ─────────────────────── */}
      <MobileNav
        isLoggedIn={isLoggedIn}
        userEmail={userEmail}
        userName={userName}
        isOpen={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        hideDefaultTrigger={true}
      />

      {/* ── Guest Buyer Sign-in Modal ──────────────────────────────── */}
      <BuyerSignInModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          router.refresh();
        }}
      />

      {/* ── Search Lead Capture Modal ──────────────────────────────── */}
      <SearchLeadModal
        isOpen={isLeadModalOpen}
        initialQuery={modalQuery}
        onClose={() => setIsLeadModalOpen(false)}
        onSuccess={(searched) => {
          setIsLeadModalOpen(false);
          router.push(`/products?q=${encodeURIComponent(searched)}`);
        }}
      />
    </>
  );
}
