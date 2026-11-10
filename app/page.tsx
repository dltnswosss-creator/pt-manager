export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Mic, ChevronRight } from "lucide-react";
import { seoulNow, relativeDayLabel } from "@/lib/utils";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

function Avatar({ name, highlight = false }: { name: string; highlight?: boolean }) {
  return (
    <span
      className={
        highlight
          ? "w-11 h-11 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[17px] font-bold shrink-0"
          : "w-11 h-11 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-[17px] font-semibold shrink-0"
      }
    >
      {name[0]}
    </span>
  );
}

export default async function HomePage() {
  const now = seoulNow();
  const today = now.date;
  const [y, m, d] = today.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];

  const todaySchedules = await prisma.schedule.findMany({
    where: { date: today, status: { not: "cancelled" } },
    include: { client: { select: { id: true, name: true } }, location: true },
    orderBy: { startTime: "asc" },
  });

  const recentSessions = await prisma.session.findMany({
    take: 5,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: { client: { select: { name: true } }, exercises: { orderBy: { order: "asc" } } },
  });

  // 지금 진행 중인 수업(앞뒤 10분 여유), 없으면 아직 끝나지 않은 다음 수업
  const withTime = todaySchedules.map((s) => ({
    ...s,
    start: toMin(s.startTime),
    end: s.endTime ? toMin(s.endTime) : toMin(s.startTime) + 60,
  }));
  const current = withTime.find((s) => s.status !== "completed" && now.minutes >= s.start - 10 && now.minutes <= s.end + 10);
  const next = withTime.find((s) => s.status !== "completed" && s.start > now.minutes);
  const focus = current ?? next ?? null;
  const rest = withTime.filter((s) => s !== focus && s.status !== "completed" && s.end >= now.minutes);

  const recordHref = focus?.client ? `/sessions/record?clientId=${focus.client.id}` : "/sessions/record";

  return (
    <div className="max-w-2xl mx-auto px-5 pt-8 pb-28 lg:pb-10">
      <header className="space-y-1.5">
        <p className="text-[15px] text-gray-500">{m}월 {d}일 {weekday}요일</p>
        <h1 className="text-[28px] leading-snug font-bold text-gray-900">
          {todaySchedules.length > 0 ? (
            <>오늘 수업 <span className="text-indigo-600">{todaySchedules.length}개</span></>
          ) : (
            "오늘은 수업이 없어요"
          )}
        </h1>
      </header>

      {/* 지금/다음 수업 → 바로 기록 */}
      <section className="mt-6 bg-gray-50 rounded-[20px] p-5 space-y-4">
        {focus ? (
          <div className="flex items-center gap-3">
            <Avatar name={focus.client?.name ?? "?"} highlight />
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-bold text-gray-900 truncate">
                {focus.client?.name ?? "회원 미지정"} 님 {focus === current ? "수업 중" : "다음 수업"}
              </p>
              <p className="text-[13px] text-gray-500">
                {focus.startTime}{focus.endTime ? ` – ${focus.endTime}` : ""}
                {focus.location ? ` · ${focus.location.name}` : ""}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[17px] font-semibold text-gray-900">수업이 끝나면 바로 기록해 보세요</p>
        )}
        <Link
          href={recordHref}
          className="press h-[52px] rounded-[14px] bg-indigo-600 active:bg-indigo-700 text-white flex items-center justify-center gap-2 text-[17px] font-semibold"
        >
          <Mic size={20} strokeWidth={2} /> 수업 기록하기
        </Link>
      </section>

      {rest.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">남은 일정</h2>
          {rest.map((s) => (
            <Link key={s.id} href={`/schedule/${s.id}/edit`} className="press flex items-center gap-3 py-3">
              <Avatar name={s.client?.name ?? "?"} />
              <div className="min-w-0 flex-1">
                <p className="text-[17px] font-medium text-gray-900 truncate">{s.client?.name ?? "회원 미지정"} 님</p>
                {s.location && <p className="text-[13px] text-gray-500">{s.location.name}</p>}
              </div>
              <span className="text-[15px] text-gray-700">{s.startTime}</span>
            </Link>
          ))}
        </section>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900">최근 기록</h2>
          <Link href="/sessions/new" className="text-[15px] font-medium text-gray-500 py-2">직접 쓰기</Link>
        </div>
        {recentSessions.length === 0 && (
          <p className="py-10 text-center text-[15px] text-gray-500">아직 기록이 없어요</p>
        )}
        {recentSessions.map((s) => (
          <Link key={s.id} href={`/sessions/${s.id}/edit`} className="press flex items-center gap-3 py-3">
            <Avatar name={s.client.name} />
            <div className="min-w-0 flex-1">
              <p className="text-[17px] font-medium text-gray-900 truncate">{s.client.name} 님</p>
              <p className="text-[13px] text-gray-500 truncate">
                {s.exercises.map((e) => e.name).join(", ") || "운동 기록 없음"}
              </p>
            </div>
            <span className="text-[13px] text-gray-500 shrink-0">{relativeDayLabel(s.date, today)}</span>
            <ChevronRight size={18} className="text-gray-400 shrink-0" />
          </Link>
        ))}
      </section>
    </div>
  );
}
