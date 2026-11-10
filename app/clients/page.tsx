export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getMenstrualPhase, PHASE_LABELS, PHASE_COLORS } from "@/lib/types";
import { calcAge, seoulNow, relativeDayLabel } from "@/lib/utils";
import ClientList from "@/components/ClientList";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: { menstrualCycle: true, sessions: { orderBy: { date: "desc" }, take: 1 } },
  });
  const today = seoulNow().date;

  const items = clients.map((c) => {
    const phase = c.menstrualCycle
      ? getMenstrualPhase(c.menstrualCycle.lastStartDate, c.menstrualCycle.cycleLength, c.menstrualCycle.periodLength)
      : null;
    const last = c.sessions[0];
    const meta = [
      c.gender === "female" ? "여성" : "남성",
      c.birthDate && `${calcAge(c.birthDate)}세`,
      last && `마지막 수업 ${relativeDayLabel(last.date, today)}`,
    ].filter(Boolean).join(" · ");
    return {
      id: c.id,
      name: c.name,
      meta,
      recent: last?.date === today,
      phase: phase ? { label: PHASE_LABELS[phase], className: PHASE_COLORS[phase] } : null,
    };
  });

  return (
    <div className="max-w-2xl mx-auto px-5 pt-8 pb-28 lg:pb-10">
      <header className="flex items-center justify-between">
        <h1 className="text-[28px] leading-snug font-bold text-gray-900">
          회원 <span className="text-indigo-600">{clients.length}</span>명
        </h1>
        <Link href="/clients/new" className="press h-11 px-2 -mr-2 flex items-center text-[17px] font-semibold text-indigo-600">
          추가
        </Link>
      </header>

      {clients.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <p className="text-[17px] text-gray-700">아직 등록한 회원이 없어요</p>
          <Link href="/clients/new" className="inline-block text-[15px] font-semibold text-indigo-600">첫 회원 추가하기</Link>
        </div>
      ) : (
        <ClientList items={items} />
      )}
    </div>
  );
}
