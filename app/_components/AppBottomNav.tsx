"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  match: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    href: "/app",
    label: "ホーム",
    icon: "✦",
    match: (pathname) => pathname === "/app",
  },
  {
    href: "/app/characters",
    label: "キャラ",
    icon: "☻",
    match: (pathname) =>
      pathname.startsWith("/app/characters") ||
      pathname.startsWith("/app/relationships"),
  },
  {
    href: "/app/chats",
    label: "チャット",
    icon: "💬",
    match: (pathname) =>
      pathname.startsWith("/app/chats") || pathname.startsWith("/app/chat"),
  },
  {
    href: "/app/settings",
    label: "設定",
    icon: "⚙",
    match: (pathname) => pathname.startsWith("/app/settings"),
  },
];

export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-900/10 bg-[#07111F]/[0.94] px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-18px_45px_rgba(15,23,42,0.20)] backdrop-blur-xl">
      <div className="mx-auto grid w-full max-w-md grid-cols-4 gap-1">
        {navItems.map((item) => {
          const isActive = item.match(pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex min-w-0 touch-manipulation flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-semibold transition active:scale-[0.98]",
                isActive
                  ? "bg-[#BEF264]/[0.18] text-[#D9F99D] shadow-[0_0_18px_rgba(190,242,100,0.18)]"
                  : "text-slate-300 hover:bg-white/[0.08] hover:text-white",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="mt-1 truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
