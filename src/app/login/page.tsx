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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Header / Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 mb-3 shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-100">QA Workspace</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Centralized test management platform for engineering teams
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-6 sm:p-7 shadow-xs">
          {/* Tabs */}
          <div className="flex border-b border-zinc-800/80 mb-6">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 pb-2.5 text-xs font-medium text-center transition-colors relative flex items-center justify-center gap-1.5 ${
                mode === "signin"
                  ? "text-zinc-100 border-b-2 border-zinc-100 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 pb-2.5 text-xs font-medium text-center transition-colors relative flex items-center justify-center gap-1.5 ${
                mode === "signup"
                  ? "text-zinc-100 border-b-2 border-zinc-100 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form key={mode} action={mode === "signin" ? signInFormAction : signUpFormAction} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5" htmlFor="name">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@company.com"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-2 py-2 px-4 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-zinc-950 font-medium text-sm rounded-lg transition flex items-center justify-center gap-2"
            >
              {isPending ? (
                <div className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === "signin" ? "Sign In" : "Create Account"}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-zinc-600 mt-6">
          Next.js App Router • Neon PostgreSQL • Drizzle ORM
        </p>
      </div>
    </div>
  );
}
