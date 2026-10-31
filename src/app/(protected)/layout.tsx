import { requireAuth } from "@/lib/auth/session";
import { signOutAction } from "@/lib/auth/actions";
import { ShieldCheck, LogOut, FolderKanban } from "lucide-react";
import Link from "next/link";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-zinc-100 font-semibold text-sm tracking-tight hover:opacity-90 transition"
            >
              <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-200 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-medium">QA Workspace</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
              <Link
                href="/dashboard"
                className="px-2.5 py-1.5 rounded-md bg-zinc-900 text-zinc-200 border border-zinc-800/80 flex items-center gap-1.5 transition"
              >
                <FolderKanban className="w-3.5 h-3.5 text-zinc-400" />
                Workspaces
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/80 px-2.5 py-1 rounded-md border border-zinc-800/80">
              <div className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-200 flex items-center justify-center font-medium text-[10px]">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block text-left">
                <p className="font-medium text-zinc-200 leading-none">{user.name}</p>
              </div>
            </div>

            <form action={signOutAction}>
              <button
                type="submit"
                title="Sign out"
                className="px-2.5 py-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition flex items-center gap-1.5 text-xs font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
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
      <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-600">
        QA Workspace • Minimalist Test Management • Neon PostgreSQL
      </footer>
    </div>
  );
}
