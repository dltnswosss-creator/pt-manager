export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import {
  currentYearMonth,
  getMonthStats,
  generateFeedback,
  suggestGoal,
  shiftYearMonth,
  type SessionEntry,
} from "@/lib/monthlyReport";
import { BODY_PART_ORDER, BODY_PART_LABELS, type PainArea, type BodyPart } from "@/lib/types";
import MemberReportView from "@/components/MemberReportView";

export default async function MemberMonthlyReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ ym?: string }>;
}) {
  const { clientId } = await params;
  const { ym } = await searchParams;
  const yearMonth = ym ?? currentYearMonth();
  const prevYearMonth = shiftYearMonth(yearMonth, -1);

  const client = await prisma.client.findUnique({
    where: { id: Number(clientId) },
    include: {
      sessions: {
        select: { date: true, exercises: { select: { name: true, sets: true, reps: true, weight: true, unit: true, isMain: true, bodyParts: true } } },
      },
      monthlyGoals: { where: { yearMonth } },
    },
  });
  if (!client) notFound();

  const sessions: SessionEntry[] = client.sessions;
  const current = getMonthStats(sessions, yearMonth);
  const previous = getMonthStats(sessions, prevYearMonth);
  const previousOrNull = previous.sessionCount > 0 ? previous : null;
  const feedback = generateFeedback(current, previousOrNull);
  const painAreas: PainArea[] = client.painAreas ? JSON.parse(client.painAreas) : [];
  const suggestion = suggestGoal(current, previousOrNull, { exerciseLevel: client.exerciseLevel, painAreas });
  const savedGoal = client.monthlyGoals[0] ?? null;

  const exerciseSummary = Array.from(current.exercises.entries())
    .map(([name, s]) => ({ name, totalSets: s.totalSets, maxWeight: s.maxWeight, maxReps: s.maxReps, unit: s.unit }))
    .sort((a, b) => b.totalSets - a.totalSets);

  const bodyPartVolume = BODY_PART_ORDER
    .map((part) => ({ part, label: BODY_PART_LABELS[part as BodyPart], totalSets: current.bodyPartVolume.get(part) ?? 0 }))
    .filter((p) => p.totalSets > 0)
    .sort((a, b) => b.totalSets - a.totalSets);

  return (
    <MemberReportView
      yearMonth={yearMonth}
      clientId={client.id}
      clientName={client.name}
      sessionCount={current.sessionCount}
      avgSetsPerSession={current.avgSetsPerSession}
      exerciseSummary={exerciseSummary}
      bodyPartVolume={bodyPartVolume}
      feedback={feedback}
      suggestion={suggestion}
      savedGoal={savedGoal ? JSON.parse(JSON.stringify(savedGoal)) : null}
    />
  );
}
