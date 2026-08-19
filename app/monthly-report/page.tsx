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
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">월간 리포트</h2>
          <p className="text-sm text-gray-500 mt-0.5">ACSM 저항운동 가이드라인 기반 회원별 월간 피드백 &amp; 목표</p>
        </div>
        <div className="flex items-center gap-1 bg-white border border-gray-100 rounded-lg px-1 py-1">
          <Link href={`/monthly-report?ym=${shiftYearMonth(yearMonth, -1)}`} className="p-1.5 rounded-md hover:bg-gray-50 text-gray-500">
            <ChevronLeft size={16} />
          </Link>
          <span className="text-sm font-medium text-gray-900 px-2 w-24 text-center">{formatYearMonth(yearMonth)}</span>
          <Link href={`/monthly-report?ym=${shiftYearMonth(yearMonth, 1)}`} className="p-1.5 rounded-md hover:bg-gray-50 text-gray-500">
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <p className="text-gray-400">등록된 회원이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map((card) => (
            <MonthlyReportCard key={card.clientId} yearMonth={yearMonth} {...card} />
          ))}
        </div>
      )}
    </div>
  );
}
