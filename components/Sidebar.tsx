"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ClipboardList, Dumbbell, CalendarDays, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/schedule", label: "일정", icon: CalendarDays },
  { href: "/clients", label: "회원 관리", icon: Users },
  { href: "/sessions/new", label: "수업 기록", icon: ClipboardList },
  { href: "/group-sessions", label: "그룹 수업", icon: Dumbbell },
  { href: "/monthly-report", label: "월간 리포트", icon: TrendingUp },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* 데스크탑 사이드바 */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-white border-r border-gray-100 flex-col">
        <div className="px-6 py-5 border-b border-gray-100">
          <h1 className="text-lg font-bold text-gray-900">PT Manager</h1>
          <p className="text-xs text-gray-400 mt-0.5">트레이너 회원 관리</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive(href)
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* 모바일 / 태블릿 하단 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-gray-100 safe-area-bottom">
        <div className="flex">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors",
                isActive(href)
                  ? "text-indigo-600"
                  : "text-gray-400"
              )}
            >
              <Icon size={22} strokeWidth={isActive(href) ? 2.5 : 1.8} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
