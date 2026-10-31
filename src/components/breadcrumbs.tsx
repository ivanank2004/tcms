import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs text-zinc-500 mb-6 font-medium">
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 hover:text-zinc-300 transition"
      >
        <Home className="w-3.5 h-3.5 text-zinc-500" />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center">
            <span className="mx-2 text-zinc-700 select-none">/</span>
            {isLast || !item.href ? (
              <span className="text-zinc-200 truncate max-w-[220px]">
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-zinc-300 transition truncate max-w-[180px]"
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
