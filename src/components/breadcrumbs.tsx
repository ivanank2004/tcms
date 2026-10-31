import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs text-slate-400 mb-6">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 hover:text-slate-200 transition"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center">
            <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-600 shrink-0" />
            {isLast || !item.href ? (
              <span className="font-semibold text-slate-200 truncate max-w-[200px]">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-slate-200 transition truncate max-w-[180px]"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
