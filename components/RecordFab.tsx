"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mic } from "lucide-react";

// 어느 화면에서든 수업 녹음 화면으로 들어가는 floating 버튼.
// 회원 상세 화면에서 누르면 그 회원을 미리 선택한 상태로 연다.
export default function RecordFab() {
  const pathname = usePathname();

  // 녹음 화면 자체, 수업 기록 작성/수정 화면, 입력 폼(하단 저장 버튼과 겹침)에서는 숨긴다
  if (
    pathname.startsWith("/sessions/") ||
    /\/(new|edit)$/.test(pathname) ||
    pathname.startsWith("/schedule/locations")
  ) {
    return null;
  }

  const clientMatch = pathname.match(/^\/clients\/(\d+)/);
  const href = clientMatch ? `/sessions/record?clientId=${clientMatch[1]}` : "/sessions/record";

  return (
    <Link
      href={href}
      aria-label="수업 녹음"
      title="수업 녹음"
      className="press fixed right-5 z-40 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] lg:bottom-8 lg:right-8 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-[0_4px_12px_rgba(49,130,246,0.24)] flex items-center justify-center active:bg-indigo-700"
    >
      <Mic size={24} strokeWidth={2} />
    </Link>
  );
}
