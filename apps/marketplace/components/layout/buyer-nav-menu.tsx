"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  ChevronDown,
  Home,
  ClipboardList,
  UserCheck,
  ShieldCheck,
  Store,
  ShoppingBag,
  Settings,
  Truck,
  Smartphone,
  LogOut,
} from "lucide-react";
import { BuyerSignInModal } from "@/components/auth/buyer-signin-modal";

interface BuyerNavMenuProps {
  isLoggedIn: boolean;
  userEmail: string | null;
  userName?: string | null;
}

export function BuyerNavMenu({
  isLoggedIn: initialIsLoggedIn,
  userEmail: initialUserEmail,
  userName: initialUserName,
}: BuyerNavMenuProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(initialIsLoggedIn);
  const [userEmail, setUserEmail] = useState(initialUserEmail);
  const [userName, setUserName] = useState(initialUserName);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync client-side auth state
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setIsLoggedIn(true);
            setUserEmail(data.user.email);
            setUserName(data.user.name || null);
          } else {
            setIsLoggedIn(false);
            setUserEmail(null);
            setUserName(null);
          }
        }
      } catch {
        // use initial
      }
    }
    checkAuth();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      // fallback
    }
    window.location.reload();
  }

  function handleOpenSignIn() {
    setIsOpen(false);
    setIsAuthModalOpen(true);
  }

  const displayName = userName || (userEmail ? userEmail.split("@")[0] : null);
  const navTriggerLabel = isLoggedIn
    ? (userName && userName.length <= 10 && !userName.toLowerCase().includes("account")
        ? userName
        : "My Account")
    : "Sign In";

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* 1. Navbar Trigger Button (Compact B2B Trigger) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex flex-col items-center justify-center px-2 py-1 text-stone-700 hover:text-stone-950 transition-colors group cursor-pointer focus:outline-none"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* User Avatar Circle Icon */}
        <div className="w-6 h-6 rounded-full border border-stone-400 group-hover:border-stone-700 flex items-center justify-center transition-colors">
          <User className="w-3.5 h-3.5 text-stone-600 group-hover:text-stone-900" />
        </div>

        {/* Text + Chevron Down */}
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-xs font-semibold text-stone-800 tracking-tight whitespace-nowrap">
            {navTriggerLabel}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-stone-500 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {/* 2. IndiaMART-Style Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white shadow-2xl border border-stone-200/90 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Action Section */}
          <div className="px-4 pb-3 border-b border-stone-100">
            {isLoggedIn ? (
              <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-sm">
                    {userEmail ? userEmail.charAt(0).toUpperCase() : "B"}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-stone-900 truncate">
                      {displayName || "Verified Buyer"}
                    </p>
                    <p className="text-[11px] text-stone-500 font-mono truncate">
                      {userEmail}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between text-xs pt-2 border-t border-stone-200">
                  <Link
                    href="/profile"
                    onClick={() => setIsOpen(false)}
                    className="font-semibold text-amber-700 hover:underline"
                  >
                    View Profile →
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="text-stone-500 hover:text-red-600 flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Big Amber Sign In Button (StonesDekho Brand Style) */}
                <button
                  type="button"
                  onClick={handleOpenSignIn}
                  className="w-full flex items-center justify-center py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm rounded-xl shadow-md shadow-amber-600/20 hover:shadow-lg transition-all active:scale-[0.99] cursor-pointer"
                >
                  Sign In
                </button>

                {/* Subtext: New to StonesDekho? Join Now */}
                <p className="mt-2 text-center text-xs text-stone-600">
                  New to StonesDekho?{" "}
                  <Link
                    href="/register"
                    onClick={() => setIsOpen(false)}
                    className="font-bold text-amber-600 hover:underline"
                  >
                    Join Now
                  </Link>
                </p>
              </div>
            )}
          </div>

          {/* Menu Items List (IndiaMART exact list items) */}
          <div className="py-1.5 text-xs text-stone-700">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-stone-50 transition-colors"
            >
              <Home className="w-4 h-4 text-stone-500" />
              <span className="font-medium text-stone-800">Home</span>
            </Link>

            <Link
              href="/request-quote"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-stone-50 transition-colors"
            >
              <ClipboardList className="w-4 h-4 text-stone-500" />
              <span className="font-medium text-stone-800">Post Your Requirement</span>
            </Link>

            <Link
              href="/about"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-stone-50 transition-colors"
            >
              <UserCheck className="w-4 h-4 text-stone-500" />
              <span className="font-medium text-stone-800">Verified Business Buyer</span>
            </Link>

            <Link
              href="/suppliers"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-4 py-2 hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-stone-500" />
                <span className="font-medium text-stone-800">Seller Verification</span>
              </div>
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-400 text-stone-950">
                NEW
              </span>
            </Link>

            <Link
              href="/how-it-works"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-4 py-2 hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-stone-500" />
                <span className="font-medium text-stone-800">Payment Safety</span>
              </div>
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-400 text-stone-950">
                NEW
              </span>
            </Link>

            <Link
              href="/products"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-stone-50 transition-colors"
            >
              <Store className="w-4 h-4 text-stone-500" />
              <span className="font-medium text-stone-800">Products/Services Directory</span>
            </Link>

            <Link
              href="/products"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 hover:bg-stone-50 transition-colors"
            >
              <ShoppingBag className="w-4 h-4 text-stone-500" />
              <span className="font-medium text-stone-800">My Orders &amp; RFQs</span>
            </Link>

            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between px-4 py-2 hover:bg-stone-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4 text-stone-500" />
                <span className="font-medium text-stone-800">Settings</span>
              </div>
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-red-500 text-white">
                NEW
              </span>
            </Link>
          </div>

          {/* Section Divider */}
          <div className="my-1 border-t border-stone-100" />

          {/* Ship with StonesDekho (Freight & Logistics) */}
          <div className="px-4 py-2 hover:bg-stone-50 transition-colors cursor-pointer">
            <div className="flex items-start gap-3">
              <Truck className="w-4 h-4 text-stone-500 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-stone-800">
                  Ship With StonesDekho
                </p>
                <p className="text-[11px] text-stone-400">
                  Easy booking of heavy stone transport
                </p>
              </div>
            </div>
          </div>

          {/* Section Divider */}
          <div className="my-1 border-t border-stone-100" />

          {/* Download App / Help */}
          <Link
            href="/contact"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-3 px-4 py-2 hover:bg-stone-50 transition-colors text-xs text-stone-700"
          >
            <Smartphone className="w-4 h-4 text-stone-500" />
            <span className="font-medium text-stone-800">Help &amp; Trade Desk</span>
          </Link>
        </div>
      )}

      {/* Dedicated Buyer Login Pop-up (IndiaMART layout + StonesDekho theme) */}
      <BuyerSignInModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          window.location.reload();
        }}
      />
    </div>
  );
}
