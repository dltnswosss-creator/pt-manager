export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getMenstrualPhase, PHASE_LABELS, PHASE_COLORS } from "@/lib/types";
import { calcAge, formatDate } from "@/lib/utils";
import { Users, CalendarDays, ClipboardList, Plus, Clock, MapPin } from "lucide-react";

export default async function DashboardPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      menstrualCycle: true,
      sessions: { orderBy: { date: "desc" }, take: 1 },
    },
  });

  const _now = new Date();
  const today = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
  const thisMonthStart = new Date(_now.getFullYear(), _now.getMonth(), 1);
  const thisMonthStr = `${thisMonthStart.getFullYear()}-${String(thisMonthStart.getMonth() + 1).padStart(2, "0")}-01`;

  const todaySessions = await prisma.session.findMany({ where: { date: today } });
  const todayGroupSessions = await prisma.groupSession.findMany({ where: { date: today } });

  const todaySchedules = await prisma.schedule.findMany({
    where: { date: today, status: { not: "cancelled" } },
    include: { client: { select: { name: true } }, location: true },
    orderBy: { startTime: "asc" },
  });

  const monthSessionCount = await prisma.session.count({ where: { date: { gte: thisMonthStr } } });
  const monthGroupCount = await prisma.groupSession.count({ where: { date: { gte: thisMonthStr } } });

  const recentSessions = await prisma.session.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { client: true, exercises: true },
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">대시보드</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })}
          </p>
        </div>
        <Link
          href="/clients/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          회원 추가
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Users size={18} className="text-indigo-600" />} label="전체 회원" value={clients.length} bg="bg-indigo-50" />
        <StatCard icon={<CalendarDays size={18} className="text-emerald-600" />} label="오늘 수업" value={todaySessions.length + todayGroupSessions.length} bg="bg-emerald-50" />
        <StatCard icon={<ClipboardList size={18} className="text-amber-600" />} label="이번달 수업" value={monthSessionCount + monthGroupCount} bg="bg-amber-50" />
      </div>

      {/* 오늘의 일정 */}
      {todaySchedules.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">오늘의 일정</h3>
            <Link href="/schedule" className="text-xs text-indigo-600 hover:underline">
              전체 보기
            </Link>
          </div>
          <div className="space-y-2">
            {todaySchedules.map((s) => {
              const color = s.location?.color ?? "#6366f1";
              const label =
                s.type === "individual"
                  ? (s.client?.name ?? "회원 미지정")
                  : `그룹 (${s.participants.length}인)`;
              return (
                <Link
                  key={s.id}
                  href={`/schedule/${s.id}/edit`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div
                    className="w-1 h-10 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={11} />
                        {s.startTime}{s.endTime ? `–${s.endTime}` : ""}
                      </span>
                      {s.location && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin size={11} />
                          {s.location.name}
                        </span>
                      )}
                    </div>
                  </div>
                  {s.status === "completed" && (
                    <span className="text-xs text-emerald-600 font-medium shrink-0">완료</span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-4">
        <section className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">전체 회원</h3>
            <Link href="/clients" className="text-xs text-indigo-600 hover:underline">전체 보기</Link>
          </div>
          <div className="space-y-1">
            {clients.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">등록된 회원이 없습니다.</p>
            )}
            {clients.map((c) => {
              const phase = c.menstrualCycle
                ? getMenstrualPhase(c.menstrualCycle.lastStartDate, c.menstrualCycle.cycleLength, c.menstrualCycle.periodLength)
                : null;
              return (
                <Link
                  key={c.id}
                  href={`/clients/${c.id}`}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0">
                      {c.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400">
                        {c.gender === "female" ? "여성" : "남성"}
                        {c.birthDate && ` · ${calcAge(c.birthDate)}세`}
                      </p>
                    </div>
                  </div>
                  {phase && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PHASE_COLORS[phase]}`}>
                      {PHASE_LABELS[phase]}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">최근 수업 기록</h3>
            <Link href="/sessions/new" className="text-xs text-indigo-600 hover:underline">기록 추가</Link>
          </div>
          <div className="space-y-2">
            {recentSessions.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">수업 기록이 없습니다.</p>
            )}
            {recentSessions.map((s) => (
              <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 min-w-0 truncate">{s.client.name}</p>
                    <span className="text-xs text-gray-400 shrink-0">{formatDate(s.date)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {s.exercises.map((e) => e.name).join(", ") || "운동 없음"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: number; bg: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 flex flex-col items-center gap-2 text-center">
      <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>{icon}</div>
      <div>
        <p className="text-xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}
