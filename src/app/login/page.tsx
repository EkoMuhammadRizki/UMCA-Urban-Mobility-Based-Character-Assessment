"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Splash screen states
  const [showSplash, setShowSplash] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start fading out after 1.8 seconds
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 1800);

    // Completely remove splash screen from DOM after 2.4 seconds
    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, 2400);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!username || !password) {
      setError("Silakan masukkan username dan password.");
      return;
    }

    setIsLoading(true);

    // Simulate login verification
    setTimeout(() => {
      setIsLoading(false);
      router.push("/guru/dashboard");
    }, 1200);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-navy-950 px-4 py-12 sm:px-6 lg:px-8">
      {/* CSS Keyframes for Splash Screen loading bar */}
      <style>{`
        @keyframes progress-bar {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        .animate-progress-bar {
          animation: progress-bar 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>

      {/* Splash Screen Overlay */}
      {showSplash && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-navy-950 transition-opacity duration-700 ${
            isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          {/* Background ambient light effects */}
          <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-brand-600/15 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-brand-500/15 blur-[120px]" />
          
          <div className="relative flex flex-col items-center text-center px-4">
            {/* Animated Logo Container */}
            <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-white p-3 shadow-2xl ring-8 ring-white/5 animate-pulse">
              <img
                src="/logo/Logo UMCA.png"
                alt="UMCA Logo"
                className="h-full w-full object-contain"
              />
            </div>
            
            {/* Titles */}
            <h1 className="mt-8 text-4xl font-extrabold tracking-wider text-white">
              UMCA
            </h1>
            <p className="mt-3 text-xs text-brand-500 max-w-xs font-semibold uppercase tracking-widest leading-relaxed">
              Urban Mobility-Based Character Assessment
            </p>

            {/* Loading Indicator */}
            <div className="mt-12 h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-brand-500 rounded-full animate-progress-bar" />
            </div>
          </div>
        </div>
      )}

      {/* Background ambient light effects */}
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-brand-600/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-brand-500/10 blur-[120px]" />

      <div className="relative w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white p-2.5 shadow-2xl shadow-brand-500/20 ring-4 ring-white/5 transition-transform hover:scale-105 duration-300">
            <img
              src="/logo/Logo UMCA.png"
              alt="UMCA Logo"
              className="h-full w-full object-contain"
            />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            UMCA
          </h2>
          <p className="mt-2 text-sm text-text-muted max-w-sm font-medium leading-relaxed uppercase tracking-wider">
            Urban Mobility-Based Character Assessment
          </p>
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border border-white/10 bg-navy-900/60 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                NIP / Username
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan NIP atau username"
                  className="block w-full rounded-xl border border-white/10 bg-navy-950/50 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:bg-navy-950/80 focus:outline-none focus:ring-2 focus:ring-brand-500/25 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full rounded-xl border border-white/10 bg-navy-950/50 py-3 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:bg-navy-950/80 focus:outline-none focus:ring-2 focus:ring-brand-500/25 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/10 bg-navy-950 text-brand-600 focus:ring-brand-500/25"
                />
                <label htmlFor="remember-me" className="ml-2 text-slate-400 font-medium">
                  Ingat Saya
                </label>
              </div>
              <a href="#" className="font-semibold text-brand-500 hover:text-brand-400 transition-colors">
                Lupa Password?
              </a>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full justify-center rounded-xl bg-brand-600 py-6 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50 active:scale-[0.98] transition-all disabled:opacity-70 disabled:pointer-events-none"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Memverifikasi...</span>
                </div>
              ) : (
                "Masuk ke Dashboard"
              )}
            </Button>
          </form>
        </div>

        {/* Footer Info */}
        <div className="flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-3 py-1 border border-white/5">
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            <span>Sistem Kehadiran NFC Terintegrasi</span>
          </div>
          <p>© 2026 UMCA. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
