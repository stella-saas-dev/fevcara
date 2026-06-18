"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/app",
    label: "Home",
    icon: "✦",
  },
  {
    href: "/app/characters",
    label: "Characters",
    icon: "◇",
  },
  {
    href: "/app/settings",
    label: "Settings",
    icon: "⚙",
  },
];

export function AppBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#080D19]/90 px-4 pb-4 pt-2 text-[#A7B0C0] backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex flex-col items-center justify-center rounded-2xl px-3 py-2 text-xs transition",
                isActive
                  ? "bg-gradient-to-r from-[#BEF264]/20 to-[#7DD3FC]/20 text-[#F4F1EA]"
                  : "hover:bg-white/[0.06] hover:text-[#F4F1EA]",
              ].join(" ")}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}