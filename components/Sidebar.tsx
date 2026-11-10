"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Users, CalendarDays, ChartNoAxesColumn } from "lucide-react";
import { cn } from "@/lib/utils";

// 수업 기록은 탭 대신 어디서나 보이는 녹음 버튼(RecordFab)과 홈의 "수업 기록하기"로 들어간다
const nav = [
  { href: "/", label: "홈", icon: House },
  { href: "/schedule", label: "일정", icon: CalendarDays },
  { href: "/clients", label: "회원", icon: Users },
  { href: "/monthly-report", label: "리포트", icon: ChartNoAxesColumn },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // 하위 화면(녹음·기록 작성·입력 폼)에서는 하단 탭을 숨겨 하단 버튼과 겹치지 않게 한다
  const isSubPage =
    pathname.startsWith("/sessions/") ||
    /\/(new|edit)$/.test(pathname) ||
    pathname.startsWith("/schedule/locations");

  return (
    <>
      {/* 데스크탑 사이드바 */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-white border-r border-gray-100 flex-col">
        <div className="px-6 pt-8 pb-6">
          <h1 className="text-xl font-bold text-gray-900">PT Manager</h1>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] transition-colors",
                isActive(href)
                  ? "bg-gray-100 text-gray-900 font-semibold"
                  : "text-gray-500 font-medium hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon size={22} strokeWidth={2} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* 모바일 / 태블릿 하단 탭 */}
      {!isSubPage && (
      <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-4">
          {nav.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center pt-2.5 pb-3 gap-1 transition-colors",
                isActive(href) ? "text-gray-900" : "text-gray-500"
              )}
            >
              <Icon size={24} strokeWidth={2} />
              <span className={cn("text-[11px]", isActive(href) ? "font-semibold" : "font-medium")}>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
      )}
    </>
  );
}
