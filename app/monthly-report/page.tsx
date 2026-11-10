export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  currentYearMonth,
  formatYearMonth,
  getMonthStats,
  generateFeedback,
  suggestGoal,
  shiftYearMonth,
  type SessionEntry,
} from "@/lib/monthlyReport";
import MonthlyReportCard from "@/components/MonthlyReportCard";
import { BODY_PART_ORDER, BODY_PART_LABELS, type PainArea, type BodyPart } from "@/lib/types";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  const { ym } = await searchParams;
  const yearMonth = ym ?? currentYearMonth();
  const prevYearMonth = shiftYearMonth(yearMonth, -1);

  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: {
      sessions: {
        select: { date: true, exercises: { select: { name: true, sets: true, reps: true, weight: true, unit: true, isMain: true, bodyParts: true } } },
      },
      monthlyGoals: { where: { yearMonth } },
    },
  });

  const cards = clients.map((c) => {
    const sessions: SessionEntry[] = c.sessions;
    const current = getMonthStats(sessions, yearMonth);
    const previous = getMonthStats(sessions, prevYearMonth);
    const previousOrNull = previous.sessionCount > 0 ? previous : null;
    const feedback = generateFeedback(current, previousOrNull);
    const painAreas: PainArea[] = c.painAreas ? JSON.parse(c.painAreas) : [];
    const suggestion = suggestGoal(current, previousOrNull, { exerciseLevel: c.exerciseLevel, painAreas });
    const savedGoal = c.monthlyGoals[0] ?? null;

    // Map은 서버→클라이언트 컴포넌트로 그대로 넘기지 않고 배열로 직렬화
    const exerciseSummary = Array.from(current.exercises.entries())
      .map(([name, s]) => ({ name, totalSets: s.totalSets, maxWeight: s.maxWeight, maxReps: s.maxReps, unit: s.unit }))
      .sort((a, b) => b.totalSets - a.totalSets);

    const bodyPartVolume = BODY_PART_ORDER
      .map((part) => ({ part, label: BODY_PART_LABELS[part as BodyPart], totalSets: current.bodyPartVolume.get(part) ?? 0 }))
      .filter((p) => p.totalSets > 0)
      .sort((a, b) => b.totalSets - a.totalSets);

    return {
      clientId: c.id,
      clientName: c.name,
      sessionCount: current.sessionCount,
      avgSetsPerSession: current.avgSetsPerSession,
      exerciseSummary,
      bodyPartVolume,
      feedback,
      suggestion,
      savedGoal: savedGoal ? JSON.parse(JSON.stringify(savedGoal)) : null,
    };
  });

  return (
    <div className="max-w-2xl mx-auto px-5 pt-8 pb-28 lg:pb-10 space-y-5">
      <header className="space-y-3">
        <h1 className="text-[28px] leading-snug font-bold text-gray-900">리포트</h1>
        <div className="flex items-center gap-1 -ml-2">
          <Link href={`/monthly-report?ym=${shiftYearMonth(yearMonth, -1)}`} aria-label="이전 달" className="press w-9 h-9 flex items-center justify-center text-gray-700">
            <ChevronLeft size={20} strokeWidth={2} />
          </Link>
          <span className="text-[17px] font-semibold text-gray-900">{formatYearMonth(yearMonth)}</span>
          <Link href={`/monthly-report?ym=${shiftYearMonth(yearMonth, 1)}`} aria-label="다음 달" className="press w-9 h-9 flex items-center justify-center text-gray-700">
            <ChevronRight size={20} strokeWidth={2} />
          </Link>
        </div>
      </header>

      {cards.length > 0 && (
        <section className="rounded-[20px] bg-gray-50 p-5 grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-[13px] text-gray-500">이번 달 수업</p>
            <p className="text-[28px] font-bold text-indigo-600">
              {cards.reduce((n, c) => n + c.sessionCount, 0)}
              <span className="ml-0.5 text-[15px] font-medium text-gray-700">회</span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[13px] text-gray-500">기록한 회원</p>
            <p className="text-[28px] font-bold text-gray-900">
              {cards.filter((c) => c.sessionCount > 0).length}
              <span className="ml-0.5 text-[15px] font-medium text-gray-700">명</span>
            </p>
          </div>
        </section>
      )}

      {cards.length === 0 ? (
        <p className="py-20 text-center text-[17px] text-gray-700">아직 등록한 회원이 없어요</p>
      ) : (
        <div className="space-y-3">
          <h2 className="pt-3 text-xl font-bold text-gray-900">회원별</h2>
          {cards.map((card) => (
            <MonthlyReportCard key={card.clientId} yearMonth={yearMonth} {...card} />
          ))}
        </div>
      )}
    </div>
  );
}
