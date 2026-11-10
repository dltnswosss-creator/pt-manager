"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  id: number;
  name: string;
  meta: string;
  recent: boolean; // 오늘 수업한 회원은 강조
  phase: { label: string; className: string } | null;
};

export default function ClientList({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim();
  const shown = q ? items.filter((c) => c.name.includes(q)) : items;

  return (
    <>
      <label className="mt-4 h-12 px-3.5 rounded-[14px] bg-gray-100 flex items-center gap-2">
        <Search size={20} strokeWidth={2} className="text-gray-500 shrink-0" />
        <span className="sr-only">이름으로 찾기</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름으로 찾기"
          className="flex-1 min-w-0 bg-transparent text-[17px] text-gray-900 placeholder:text-gray-500 focus:outline-none"
        />
      </label>

      <div className="mt-4">
        {shown.length === 0 && (
          <p className="py-12 text-center text-[15px] text-gray-500">&quot;{q}&quot; 회원이 없어요</p>
        )}
        {shown.map((c) => (
          <Link key={c.id} href={`/clients/${c.id}`} className="press flex items-center gap-3 py-3">
            <span
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center text-[17px] shrink-0",
                c.recent ? "bg-indigo-50 text-indigo-600 font-bold" : "bg-gray-100 text-gray-700 font-semibold"
              )}
            >
              {c.name[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-[17px] font-semibold text-gray-900 truncate">{c.name}</span>
                {c.phase && (
                  <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0", c.phase.className)}>
                    {c.phase.label}
                  </span>
                )}
              </span>
              <span className="block text-[13px] text-gray-500 truncate">{c.meta}</span>
            </span>
            <ChevronRight size={20} className="text-gray-400 shrink-0" />
          </Link>
        ))}
      </div>
    </>
  );
}
