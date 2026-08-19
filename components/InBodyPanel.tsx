"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, TrendingUp } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import ExerciseTrendChart from "@/components/ExerciseTrendChart";

type InBodyRecord = {
  id: number;
  date: string;
  weight: number | null;
  skeletalMuscleMass: number | null;
  bodyFatMass: number | null;
  bodyFatPercent: number | null;
  bmr: number | null;
};

const METRICS = [
  { key: "weight", label: "체중", unit: "kg", goodDirection: "down" },
  { key: "skeletalMuscleMass", label: "골격근량", unit: "kg", goodDirection: "up" },
  { key: "bodyFatMass", label: "체지방량", unit: "kg", goodDirection: "down" },
  { key: "bodyFatPercent", label: "체지방률", unit: "%", goodDirection: "down" },
  { key: "bmr", label: "기초대사량", unit: "kcal", goodDirection: "up" },
] as const;

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function InBodyPanel({ clientId, records }: { clientId: number; records: InBodyRecord[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    date: todayStr(),
    weight: "", skeletalMuscleMass: "", bodyFatMass: "", bodyFatPercent: "", bmr: "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const body: Record<string, unknown> = { date: form.date };
    for (const m of METRICS) {
      const v = form[m.key];
      if (v !== "") body[m.key] = m.key === "bmr" ? Number(v) : parseFloat(v);
    }
    await fetch(`/api/clients/${clientId}/inbody`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setForm({ date: todayStr(), weight: "", skeletalMuscleMass: "", bodyFatMass: "", bodyFatPercent: "", bmr: "" });
    router.refresh();
  };

  const deleteRecord = async (id: number) => {
    if (!confirm("이 인바디 기록을 삭제하시겠습니까?")) return;
    await fetch(`/api/inbody/${id}`, { method: "DELETE" });
    router.refresh();
  };

  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">인바디 기록 입력</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">측정일</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {METRICS.map((m) => (
            <div key={m.key} className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500">{m.label} ({m.unit})</label>
              <input
                type="number"
                step="0.1"
                value={form[m.key]}
                onChange={(e) => setForm((f) => ({ ...f, [m.key]: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          ))}
        </div>
        <button
          onClick={save}
          disabled={saving || !form.date}
          className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>

      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {METRICS.map((m) => (
            latest[m.key] != null && (
              <div key={m.key} className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                <p className="text-xs text-gray-400">{m.label}</p>
                <p className="text-lg font-bold text-gray-900">{latest[m.key]}{m.unit}</p>
              </div>
            )
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {METRICS.map((m) => {
          const points = sorted
            .filter((r) => r[m.key] != null)
            .map((r) => ({ date: r.date, weight: r[m.key] as number, unit: m.unit }));
          if (points.length < 2) return null;
          const delta = Math.round((points[points.length - 1].weight - points[0].weight) * 10) / 10;
          return (
            <div key={m.key} className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-indigo-500" />
                  <p className="text-sm font-semibold text-gray-900">{m.label}</p>
                </div>
                <span
                  className={cn("text-xs font-semibold px-1.5 py-0.5 rounded-full", {
                    "bg-emerald-50 text-emerald-600": delta !== 0 && (delta > 0) === (m.goodDirection === "up"),
                    "bg-rose-50 text-rose-500": delta !== 0 && (delta > 0) !== (m.goodDirection === "up"),
                    "bg-gray-50 text-gray-400": delta === 0,
                  })}
                >
                  {delta > 0 ? "+" : ""}{delta}{m.unit}
                </span>
              </div>
              <ExerciseTrendChart points={points} />
            </div>
          );
        })}
      </div>

      {sorted.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="pb-2 font-medium">측정일</th>
                {METRICS.map((m) => (
                  <th key={m.key} className="pb-2 font-medium text-right">{m.label}</th>
                ))}
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {[...sorted].reverse().map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 text-gray-600">{formatDate(r.date)}</td>
                  {METRICS.map((m) => (
                    <td key={m.key} className="py-2 text-right text-gray-800">
                      {r[m.key] != null ? `${r[m.key]}${m.unit}` : "-"}
                    </td>
                  ))}
                  <td className="py-2 text-right">
                    <button onClick={() => deleteRecord(r.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
