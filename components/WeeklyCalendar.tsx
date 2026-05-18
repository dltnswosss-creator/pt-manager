"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, MapPin, CheckCircle, XCircle } from "lucide-react";

const START_HOUR = 6;
const END_HOUR = 23;
const HOUR_HEIGHT = 64;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
const DAYS_KR = ["월", "화", "수", "목", "금", "토", "일"];

export type ScheduleItem = {
  id: number;
  date: string;
  startTime: string;
  endTime: string | null;
  type: string;
  status: string;
  memo: string | null;
  client: { id: number; name: string } | null;
  participants: string[];
  location: { id: number; name: string; color: string } | null;
};

type Props = {
  weekStart: Date;
  schedules: ScheduleItem[];
  onWeekChange: (date: Date) => void;
  onComplete: (id: number) => void;
  onCancel: (id: number) => void;
};

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseTime(t: string): [number, number] {
  const [h, m] = t.split(":").map(Number);
  return [h, m];
}

function eventTop(startTime: string): number {
  const [h, m] = parseTime(startTime);
  return (h - START_HOUR) * HOUR_HEIGHT + (m / 60) * HOUR_HEIGHT;
}

function eventHeight(startTime: string, endTime: string | null): number {
  const [sh, sm] = parseTime(startTime);
  const [eh, em] = endTime ? parseTime(endTime) : [sh + 1, sm];
  const mins = (eh - sh) * 60 + (em - sm);
  return Math.max((mins / 60) * HOUR_HEIGHT, 32);
}

function weekLabel(days: Date[]): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
  return `${fmt(days[0])} – ${fmt(days[6])}`;
}

const todayStr = toDateStr(new Date());

export default function WeeklyCalendar({
  weekStart,
  schedules,
  onWeekChange,
  onComplete,
  onCancel,
}: Props) {
  const router = useRouter();
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const byDate = new Map<string, ScheduleItem[]>();
  for (const s of schedules) {
    const arr = byDate.get(s.date) ?? [];
    byDate.set(s.date, [...arr, s]);
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onWeekChange(addDays(weekStart, -7))}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-gray-900 min-w-[160px] text-center">
            {weekLabel(weekDays)}
          </span>
          <button
            onClick={() => onWeekChange(addDays(weekStart, 7))}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
          <button
            onClick={() => onWeekChange(getMondayOf(new Date()))}
            className="text-xs text-indigo-600 font-medium px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            오늘
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/schedule/locations"
            className="flex items-center gap-1 text-xs text-gray-500 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <MapPin size={13} />
            장소 관리
          </Link>
          <Link
            href="/schedule/new"
            className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus size={15} />
            일정 추가
          </Link>
        </div>
      </div>

      {/* 달력 그리드 */}
      <div className="flex-1 overflow-auto">
        <div className="flex" style={{ minWidth: 560 }}>
          {/* 시간 레이블 컬럼 */}
          <div className="w-14 shrink-0 bg-white sticky left-0 z-10">
            {/* 요일 헤더 높이 맞춤 */}
            <div className="h-12 border-b border-r border-gray-100" />
            <div
              className="relative border-r border-gray-100"
              style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}
            >
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute w-full"
                  style={{ top: (h - START_HOUR) * HOUR_HEIGHT - 8 }}
                >
                  <span className="block text-right pr-2 text-[10px] text-gray-400 font-medium">
                    {h}:00
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 요일 컬럼들 */}
          {weekDays.map((day, i) => {
            const dateStr = toDateStr(day);
            const daySchedules = byDate.get(dateStr) ?? [];
            const isToday = dateStr === todayStr;
            const isWeekend = i >= 5;

            return (
              <div key={dateStr} className="flex-1 min-w-0 border-l border-gray-100">
                {/* 요일 헤더 */}
                <div
                  className={`h-12 flex flex-col items-center justify-center border-b border-gray-100 sticky top-0 z-10 ${
                    isToday ? "bg-indigo-50" : "bg-white"
                  }`}
                >
                  <span
                    className={`text-[10px] font-medium ${
                      isToday ? "text-indigo-500" : isWeekend ? "text-rose-400" : "text-gray-400"
                    }`}
                  >
                    {DAYS_KR[i]}
                  </span>
                  <span
                    className={`text-sm font-bold leading-tight ${
                      isToday
                        ? "text-white bg-indigo-600 w-7 h-7 rounded-full flex items-center justify-center"
                        : isWeekend
                        ? "text-rose-500"
                        : "text-gray-800"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>

                {/* 시간 그리드 */}
                <div
                  className="relative"
                  style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}
                >
                  {/* 시간선 */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute w-full border-b border-gray-50"
                      style={{ top: (h - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    />
                  ))}

                  {/* 30분 점선 */}
                  {HOURS.map((h) => (
                    <div
                      key={`${h}-30`}
                      className="absolute w-full border-b border-dashed border-gray-100"
                      style={{ top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                    />
                  ))}

                  {/* 이벤트 블록 */}
                  {daySchedules.map((s) => (
                    <ScheduleBlock
                      key={s.id}
                      schedule={s}
                      onComplete={onComplete}
                      onCancel={onCancel}
                      onEdit={() => router.push(`/schedule/${s.id}/edit`)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ScheduleBlock({
  schedule: s,
  onComplete,
  onCancel,
  onEdit,
}: {
  schedule: ScheduleItem;
  onComplete: (id: number) => void;
  onCancel: (id: number) => void;
  onEdit: () => void;
}) {
  const top = eventTop(s.startTime);
  const height = eventHeight(s.startTime, s.endTime);
  const color = s.location?.color ?? "#6366f1";
  const isCancelled = s.status === "cancelled";
  const isCompleted = s.status === "completed";
  const isScheduled = s.status === "scheduled";
  const isShort = height < 52;

  const bgColor = isCancelled
    ? "#f3f4f6"
    : `${color}1a`;
  const borderColor = isCancelled ? "#d1d5db" : color;
  const textColor = isCancelled ? "#9ca3af" : color;

  const label =
    s.type === "individual"
      ? (s.client?.name ?? "회원 미지정")
      : `그룹 ${s.participants.length > 0 ? `(${s.participants.length}인)` : ""}`;

  return (
    <div
      className="absolute left-0.5 right-0.5 rounded-md overflow-hidden group"
      style={{
        top: top + 1,
        height: height - 2,
        backgroundColor: bgColor,
        borderLeft: `3px solid ${borderColor}`,
        cursor: "pointer",
      }}
      onClick={onEdit}
    >
      <div className="px-1.5 py-1 h-full flex flex-col justify-between overflow-hidden">
        <div className="overflow-hidden">
          <p
            className="text-[10px] font-semibold leading-tight truncate"
            style={{ color: textColor }}
          >
            {s.startTime}
            {s.endTime && `–${s.endTime}`}
          </p>
          {!isShort && (
            <p className="text-[11px] font-medium text-gray-800 truncate leading-tight mt-0.5">
              {label}
            </p>
          )}
          {isShort && (
            <p className="text-[10px] font-medium text-gray-700 truncate leading-none">
              {label}
            </p>
          )}
          {!isShort && s.location && (
            <p className="text-[10px] text-gray-500 truncate leading-tight">
              {s.location.name}
            </p>
          )}
        </div>

        {!isShort && (
          <div className="flex items-center justify-between">
            {isCompleted && (
              <span className="text-[9px] text-emerald-600 font-semibold">완료</span>
            )}
            {isCancelled && (
              <span className="text-[9px] text-gray-400 font-semibold">취소</span>
            )}
            {isScheduled && (
              <div
                className="hidden group-hover:flex items-center gap-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="p-0.5 rounded hover:bg-emerald-100 text-emerald-600 transition-colors"
                  title="완료 처리"
                  onClick={() => onComplete(s.id)}
                >
                  <CheckCircle size={13} />
                </button>
                <button
                  className="p-0.5 rounded hover:bg-red-100 text-red-400 transition-colors"
                  title="취소"
                  onClick={() => onCancel(s.id)}
                >
                  <XCircle size={13} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
