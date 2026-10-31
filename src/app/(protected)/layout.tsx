import { requireAuth } from "@/lib/auth/session";
import { signOutAction } from "@/lib/auth/actions";
import { ShieldCheck, LogOut, User, FolderKanban } from "lucide-react";
import Link from "next/link";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 text-white font-semibold text-lg tracking-tight hover:opacity-90 transition">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span>QA Workspace</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-md bg-slate-800/80 text-white flex items-center gap-1.5"
              >
                <FolderKanban className="w-4 h-4 text-indigo-400" />
                Workspaces
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 text-xs text-slate-300 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/50">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="font-semibold text-slate-200 leading-none">{user.name}</p>
                <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{user.email}</p>
              </div>
            </div>

            <form action={signOutAction}>
              <button
                type="submit"
                title="Sign out"
                className="p-2 rounded-lg text-slate-400 hover:text-red-300 hover:bg-red-950/30 border border-transparent hover:border-red-900/50 transition flex items-center gap-1.5 text-xs font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500">
        QA Workspace MVP • Foundation Phase 1 • Neon PostgreSQL Connected
      </footer>
    </div>
  );
}
