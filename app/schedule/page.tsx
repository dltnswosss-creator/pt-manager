"use client";

import { useState, useEffect, useCallback } from "react";
import WeeklyCalendar, { ScheduleItem } from "@/components/WeeklyCalendar";

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

  const fetchSchedules = useCallback(async (start: Date) => {
    const y = start.getFullYear();
    const m = String(start.getMonth() + 1).padStart(2, "0");
    const d = String(start.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;
    const res = await fetch(`/api/schedules?weekStart=${dateStr}`);
    const data = await res.json();
    setSchedules(data);
  }, []);

  useEffect(() => {
    fetchSchedules(weekStart);
  }, [weekStart, fetchSchedules]);

  async function handleComplete(id: number) {
    const res = await fetch(`/api/schedules/${id}/complete`, { method: "POST" });
    const data = await res.json();
    if (data.redirect) {
      window.location.href = data.redirect;
    } else {
      fetchSchedules(weekStart);
    }
  }

  async function handleCancel(id: number) {
    if (!confirm("이 일정을 취소 처리하시겠습니까?")) return;
    await fetch(`/api/schedules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    fetchSchedules(weekStart);
  }

  return (
    <div className="h-full flex flex-col">
      <WeeklyCalendar
        weekStart={weekStart}
        schedules={schedules}
        onWeekChange={(d) => setWeekStart(d)}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onScheduleUpdate={() => fetchSchedules(weekStart)}
      />
    </div>
  );
}
