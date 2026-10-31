"use client";

import { useActionState, useState } from "react";
import { signInAction, signUpAction, type AuthActionResult } from "@/lib/auth/actions";
import { ShieldCheck, LogIn, UserPlus, AlertCircle, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signInState, signInFormAction, isSigningIn] = useActionState<AuthActionResult | null, FormData>(
    signInAction,
    null
  );
  const [signUpState, signUpFormAction, isSigningUp] = useActionState<AuthActionResult | null, FormData>(
    signUpAction,
    null
  );

  const error = mode === "signin" ? signInState?.error : signUpState?.error;
  const isPending = mode === "signin" ? isSigningIn : isSigningUp;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header / Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">QA Workspace</h1>
          <p className="text-sm text-slate-400 mt-1">
            Centralized test management platform for modern QA & engineering teams
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 sm:p-8">
          {/* Tabs */}
          <div className="flex border-b border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 pb-3 text-sm font-medium text-center transition-colors relative flex items-center justify-center gap-2 ${
                mode === "signin"
                  ? "text-indigo-400 border-b-2 border-indigo-500"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 pb-3 text-sm font-medium text-center transition-colors relative flex items-center justify-center gap-2 ${
                mode === "signup"
                  ? "text-indigo-400 border-b-2 border-indigo-500"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-sm text-red-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form action={mode === "signin" ? signInFormAction : signUpFormAction} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="name">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@company.com"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/60 disabled:cursor-not-allowed text-white font-medium text-sm rounded-lg shadow transition flex items-center justify-center gap-2"
            >
              {isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === "signin" ? "Sign In" : "Get Started"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Phase 1 Foundation • Next.js App Router • Neon PostgreSQL • Drizzle ORM
        </p>
      </div>
    </div>
  );
}
