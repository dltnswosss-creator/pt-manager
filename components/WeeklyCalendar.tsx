"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, MapPin, CheckCircle, XCircle, X } from "lucide-react";

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

type LocationItem = { id: number; name: string; color: string };
type ClientItem = { id: number; name: string };

type QuickAdd = { date: string; startTime: string; endTime: string; x: number; y: number };

type DragState = {
  schedule: ScheduleItem;
  offsetY: number;
  ghostX: number;
  ghostY: number;
  targetDate: string | null;
  targetStartTime: string | null;
  isCopy: boolean;
};

type Props = {
  weekStart: Date;
  schedules: ScheduleItem[];
  onWeekChange: (date: Date) => void;
  onComplete: (id: number) => void;
  onCancel: (id: number) => void;
  onScheduleUpdate: () => void;
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

function minsToTime(totalMins: number): string {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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
  const fmt = (d: Date) => d.toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
  return `${fmt(days[0])} – ${fmt(days[6])}`;
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function snapMins(relY: number): number {
  const raw = (relY / HOUR_HEIGHT) * 60;
  const snapped = Math.round(raw / 30) * 30;
  return Math.max(0, Math.min(snapped, (END_HOUR - START_HOUR - 1) * 60));
}

const todayStr = toDateStr(new Date());

export default function WeeklyCalendar({
  weekStart,
  schedules,
  onWeekChange,
  onComplete,
  onCancel,
  onScheduleUpdate,
}: Props) {
  const router = useRouter();
  const [quickAdd, setQuickAdd] = useState<QuickAdd | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);

  const dragRef = useRef<DragState | null>(null);
  const onUpdateRef = useRef(onScheduleUpdate);
  useEffect(() => { onUpdateRef.current = onScheduleUpdate; }, [onScheduleUpdate]);

  function updateDrag(d: DragState | null) {
    dragRef.current = d;
    setDrag(d);
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/locations").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ]).then(([locs, cls]) => {
      setLocations(locs);
      setClients(cls);
    });
  }, []);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const byDate = new Map<string, ScheduleItem[]>();
  for (const s of schedules) {
    const arr = byDate.get(s.date) ?? [];
    byDate.set(s.date, [...arr, s]);
  }

  // ── 클릭으로 빠른 일정 추가 ──────────────────────────────
  function handleGridClick(e: React.MouseEvent<HTMLDivElement>, dateStr: string) {
    if ((e.target as HTMLElement).closest("[data-schedule]")) return;
    if (dragRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const clamped = snapMins(relY);
    const startMins = START_HOUR * 60 + clamped;
    const endMins = Math.min(startMins + 60, END_HOUR * 60);

    setQuickAdd({
      date: dateStr,
      startTime: minsToTime(startMins),
      endTime: minsToTime(endMins),
      x: e.clientX,
      y: e.clientY,
    });
  }

  // ── 드래그 이동 / 복사 ────────────────────────────────────
  function startDrag(e: React.PointerEvent, schedule: ScheduleItem) {
    e.preventDefault();
    e.stopPropagation();

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetY = e.clientY - rect.top;

    updateDrag({
      schedule,
      offsetY,
      ghostX: e.clientX,
      ghostY: e.clientY,
      targetDate: schedule.date,
      targetStartTime: schedule.startTime,
      isCopy: e.altKey,
    });

    const move = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;

      const cols = document.querySelectorAll<HTMLElement>("[data-grid-col]");
      let targetDate: string | null = null;
      let targetStartTime: string | null = null;

      for (const col of cols) {
        const r = col.getBoundingClientRect();
        if (ev.clientX >= r.left && ev.clientX <= r.right) {
          targetDate = col.dataset.date!;
          const relY = ev.clientY - r.top - d.offsetY;
          const clamped = snapMins(relY);
          targetStartTime = minsToTime(START_HOUR * 60 + clamped);
          break;
        }
      }

      updateDrag({ ...d, ghostX: ev.clientX, ghostY: ev.clientY, targetDate, targetStartTime, isCopy: ev.altKey });
    };

    const up = async (ev: PointerEvent) => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);

      const d = dragRef.current;
      updateDrag(null);
      if (!d || !d.targetDate || !d.targetStartTime) return;
      if (!d.isCopy && d.targetDate === d.schedule.date && d.targetStartTime === d.schedule.startTime) return;

      const s = d.schedule;
      const [sh, sm] = parseTime(s.startTime);
      const duration = s.endTime
        ? (() => { const [eh, em] = parseTime(s.endTime!); return (eh - sh) * 60 + (em - sm); })()
        : 60;
      const [tsh, tsm] = parseTime(d.targetStartTime);
      const endTime = minsToTime(Math.min(tsh * 60 + tsm + duration, END_HOUR * 60));

      if (d.isCopy) {
        await fetch("/api/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: d.targetDate, startTime: d.targetStartTime, endTime,
            type: s.type, clientId: s.client?.id ?? null,
            participants: s.participants, locationId: s.location?.id ?? null,
            memo: s.memo, status: "scheduled",
          }),
        });
      } else {
        await fetch(`/api/schedules/${s.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: d.targetDate, startTime: d.targetStartTime, endTime }),
        });
      }

      onUpdateRef.current();
    };

    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  }

  return (
    <div className="flex flex-col h-full bg-white" style={{ userSelect: drag ? "none" : undefined }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => onWeekChange(addDays(weekStart, -7))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-gray-900 min-w-[160px] text-center">
            {weekLabel(weekDays)}
          </span>
          <button onClick={() => onWeekChange(addDays(weekStart, 7))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronRight size={18} />
          </button>
          <button onClick={() => onWeekChange(getMondayOf(new Date()))} className="text-xs text-indigo-600 font-medium px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors">
            오늘
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/schedule/locations" className="flex items-center gap-1 text-xs text-gray-500 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <MapPin size={13} />
            장소 관리
          </Link>
          <Link href="/schedule/new" className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Plus size={15} />
            일정 추가
          </Link>
        </div>
      </div>

      {/* 달력 그리드 */}
      <div className="flex-1 overflow-auto">
        <div className="flex" style={{ minWidth: 560 }}>
          {/* 시간 컬럼 */}
          <div className="w-14 shrink-0 bg-white sticky left-0 z-10">
            <div className="h-12 border-b border-r border-gray-100" />
            <div className="relative border-r border-gray-100" style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT }}>
              {HOURS.map((h) => (
                <div key={h} className="absolute w-full" style={{ top: (h - START_HOUR) * HOUR_HEIGHT - 8 }}>
                  <span className="block text-right pr-2 text-[10px] text-gray-400 font-medium">{h}:00</span>
                </div>
              ))}
            </div>
          </div>

          {/* 요일 컬럼 */}
          {weekDays.map((day, i) => {
            const dateStr = toDateStr(day);
            const daySchedules = byDate.get(dateStr) ?? [];
            const isToday = dateStr === todayStr;
            const isWeekend = i >= 5;
            const isDropTarget = drag?.targetDate === dateStr;

            return (
              <div key={dateStr} className="flex-1 min-w-0 border-l border-gray-100">
                {/* 요일 헤더 */}
                <div className={`h-12 flex flex-col items-center justify-center border-b border-gray-100 sticky top-0 z-10 ${isToday ? "bg-indigo-50" : "bg-white"}`}>
                  <span className={`text-[10px] font-medium ${isToday ? "text-indigo-500" : isWeekend ? "text-rose-400" : "text-gray-400"}`}>
                    {DAYS_KR[i]}
                  </span>
                  <span className={`text-sm font-bold leading-tight ${isToday ? "text-white bg-indigo-600 w-7 h-7 rounded-full flex items-center justify-center" : isWeekend ? "text-rose-500" : "text-gray-800"}`}>
                    {day.getDate()}
                  </span>
                </div>

                {/* 시간 그리드 */}
                <div
                  className={`relative transition-colors ${isDropTarget && drag ? "bg-indigo-50/40" : ""}`}
                  style={{ height: (END_HOUR - START_HOUR) * HOUR_HEIGHT, cursor: drag ? "grabbing" : "default" }}
                  data-grid-col
                  data-date={dateStr}
                  onClick={(e) => handleGridClick(e, dateStr)}
                >
                  {HOURS.map((h) => (
                    <div key={h} className="absolute w-full border-b border-gray-50" style={{ top: (h - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }} />
                  ))}
                  {HOURS.map((h) => (
                    <div key={`${h}h`} className="absolute w-full border-b border-dashed border-gray-100" style={{ top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
                  ))}

                  {/* 드롭 위치 표시 */}
                  {isDropTarget && drag?.targetStartTime && (
                    <div
                      className="absolute left-0.5 right-0.5 rounded border-2 border-dashed pointer-events-none"
                      style={{
                        top: eventTop(drag.targetStartTime),
                        height: eventHeight(drag.targetStartTime, null),
                        borderColor: drag.schedule.location?.color ?? "#6366f1",
                        backgroundColor: `${drag.schedule.location?.color ?? "#6366f1"}11`,
                      }}
                    />
                  )}

                  {/* 이벤트 블록 */}
                  {daySchedules.map((s) => (
                    <ScheduleBlock
                      key={s.id}
                      schedule={s}
                      isDraggingSource={drag?.schedule.id === s.id && !drag.isCopy}
                      onPointerDown={(e) => startDrag(e, s)}
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

      {/* 드래그 고스트 */}
      {drag && (
        <div
          className="fixed pointer-events-none z-50 rounded-md overflow-hidden shadow-lg"
          style={{
            left: drag.ghostX - 50,
            top: drag.ghostY - drag.offsetY,
            width: 110,
            height: eventHeight(drag.schedule.startTime, drag.schedule.endTime),
            backgroundColor: `${drag.schedule.location?.color ?? "#6366f1"}22`,
            borderLeft: `3px solid ${drag.schedule.location?.color ?? "#6366f1"}`,
            opacity: 0.85,
          }}
        >
          <div className="px-1.5 py-1">
            <p className="text-[10px] font-semibold" style={{ color: drag.schedule.location?.color ?? "#6366f1" }}>
              {drag.targetStartTime ?? drag.schedule.startTime}
            </p>
            <p className="text-[11px] font-medium text-gray-800 truncate">
              {drag.schedule.type === "individual" ? (drag.schedule.client?.name ?? "회원 미지정") : "그룹"}
            </p>
          </div>
          {drag.isCopy && (
            <div className="absolute top-0.5 right-0.5 bg-indigo-600 text-white text-[8px] font-bold px-1 py-0.5 rounded">복사</div>
          )}
        </div>
      )}

      {/* 드래그 힌트 */}
      {drag && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-800/90 text-white text-xs px-3 py-1.5 rounded-full z-50 pointer-events-none">
          {drag.isCopy ? "복사 모드 (Alt 키)" : "이동 중 · Alt 키를 누르면 복사"}
        </div>
      )}

      {/* 빠른 추가 모달 */}
      {quickAdd && (
        <QuickAddModal
          state={quickAdd}
          locations={locations}
          clients={clients}
          onClose={() => setQuickAdd(null)}
          onSave={async (payload) => {
            await fetch("/api/schedules", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            setQuickAdd(null);
            onUpdateRef.current();
          }}
          onDetail={(date, startTime, endTime) => {
            const p = new URLSearchParams({ date, startTime, endTime });
            router.push(`/schedule/new?${p}`);
            setQuickAdd(null);
          }}
        />
      )}
    </div>
  );
}

// ── ScheduleBlock ──────────────────────────────────────────
function ScheduleBlock({
  schedule: s,
  isDraggingSource,
  onPointerDown,
  onComplete,
  onCancel,
  onEdit,
}: {
  schedule: ScheduleItem;
  isDraggingSource: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
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

  const label = s.type === "individual" ? (s.client?.name ?? "회원 미지정") : `그룹 ${s.participants.length > 0 ? `(${s.participants.length}인)` : ""}`;

  return (
    <div
      data-schedule="true"
      className="absolute left-0.5 right-0.5 rounded-md overflow-hidden group transition-opacity"
      style={{
        top: top + 1,
        height: height - 2,
        backgroundColor: isCancelled ? "#f3f4f6" : `${color}1a`,
        borderLeft: `3px solid ${isCancelled ? "#d1d5db" : color}`,
        opacity: isDraggingSource ? 0.3 : isCancelled ? 0.6 : 1,
        cursor: "grab",
      }}
      onPointerDown={onPointerDown}
      onClick={(e) => { e.stopPropagation(); onEdit(); }}
    >
      <div className="px-1.5 py-1 h-full flex flex-col justify-between overflow-hidden">
        <div>
          <p className="text-[10px] font-semibold leading-tight truncate" style={{ color: isCancelled ? "#9ca3af" : color }}>
            {s.startTime}{s.endTime ? `–${s.endTime}` : ""}
          </p>
          <p className="text-[11px] font-medium text-gray-800 truncate leading-tight mt-0.5" style={{ fontSize: isShort ? 10 : undefined }}>
            {label}
          </p>
          {!isShort && s.location && (
            <p className="text-[10px] text-gray-500 truncate leading-tight">{s.location.name}</p>
          )}
        </div>
        {!isShort && (
          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            {isCompleted && <span className="text-[9px] text-emerald-600 font-semibold">완료</span>}
            {isCancelled && <span className="text-[9px] text-gray-400 font-semibold">취소</span>}
            {isScheduled && (
              <div className="hidden group-hover:flex items-center gap-0.5">
                <button className="p-0.5 rounded hover:bg-emerald-100 text-emerald-600" title="완료" onClick={() => onComplete(s.id)}>
                  <CheckCircle size={13} />
                </button>
                <button className="p-0.5 rounded hover:bg-red-100 text-red-400" title="취소" onClick={() => onCancel(s.id)}>
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

// ── QuickAddModal ──────────────────────────────────────────
function QuickAddModal({
  state,
  locations,
  clients,
  onClose,
  onSave,
  onDetail,
}: {
  state: QuickAdd;
  locations: LocationItem[];
  clients: ClientItem[];
  onClose: () => void;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  onDetail: (date: string, startTime: string, endTime: string) => void;
}) {
  const [clientId, setClientId] = useState<number | null>(null);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [type, setType] = useState("individual");
  const [saving, setSaving] = useState(false);

  const modalW = 264;
  const modalH = 280;
  const left = state.x + 16 + modalW > window.innerWidth ? state.x - 16 - modalW : state.x + 16;
  const top = Math.max(8, Math.min(state.y - 24, window.innerHeight - modalH - 8));

  async function handleSave() {
    setSaving(true);
    await onSave({
      date: state.date,
      startTime: state.startTime,
      endTime: state.endTime,
      type,
      clientId: type === "individual" ? clientId : null,
      participants: [],
      locationId,
      memo: "",
      status: "scheduled",
    });
    setSaving(false);
  }

  const dateLabel = new Date(state.date + "T00:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-100 p-4"
        style={{ left, top, width: modalW }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs text-gray-400">{dateLabel}</p>
            <p className="text-sm font-bold text-gray-900">{state.startTime} – {state.endTime}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* 수업 유형 */}
        <div className="flex gap-1 mb-3">
          {[["individual", "1:1"], ["group", "그룹"]] .map(([v, l]) => (
            <button
              key={v}
              onClick={() => setType(v)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${type === v ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* 회원 선택 */}
        {type === "individual" && (
          <select
            value={clientId ?? ""}
            onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : null)}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">회원 선택</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        {/* 장소 선택 */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setLocationId(null)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${locationId === null ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
          >
            미지정
          </button>
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => setLocationId(loc.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors"
              style={locationId === loc.id
                ? { backgroundColor: loc.color, color: "white", borderColor: loc.color }
                : { borderColor: "#e5e7eb", color: "#374151" }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: loc.color }} />
              {loc.name}
            </button>
          ))}
        </div>

        {/* 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
          <button
            onClick={() => onDetail(state.date, state.startTime, state.endTime)}
            className="px-3 py-2 border border-gray-200 text-gray-500 rounded-lg text-xs hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            상세 설정
          </button>
        </div>
      </div>
    </>
  );
}
