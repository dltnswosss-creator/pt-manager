"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GoalSuggestion } from "@/lib/monthlyReport";

type SavedGoal = {
  targetFrequency: number | null;
  targetSets: number | null;
  targetVolume: number | null;
  intensityGuide: string | null;
  goalNote: string | null;
  achieved: boolean;
} | null;

export default function MonthlyGoalForm({
  yearMonth,
  clientId,
  suggestion,
  savedGoal,
}: {
  yearMonth: string;
  clientId: number;
  suggestion: GoalSuggestion;
  savedGoal: SavedGoal;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    targetFrequency: savedGoal?.targetFrequency ?? suggestion.targetFrequency,
    targetSets: savedGoal?.targetSets ?? suggestion.targetSets,
    targetVolume: savedGoal?.targetVolume ?? suggestion.targetVolume,
    intensityGuide: savedGoal?.intensityGuide ?? suggestion.intensityGuide,
    goalNote: savedGoal?.goalNote ?? "",
    achieved: savedGoal?.achieved ?? false,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await fetch(`/api/clients/${clientId}/monthly-goal`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ yearMonth, ...form }),
    });
    setSaving(false);
    router.refresh();
  };

  return (
    <div className="bg-indigo-50/50 rounded-lg p-4 space-y-3">
      <p className="text-xs font-semibold text-indigo-700">다음 달 목표 (ACSM 가이드라인 기반 제안)</p>
      <div className="grid grid-cols-3 gap-3">
        <NumberField label="주당 세션(회)" value={form.targetFrequency} onChange={(v) => setForm((f) => ({ ...f, targetFrequency: v }))} />
        <NumberField label="세션당 세트" value={form.targetSets} onChange={(v) => setForm((f) => ({ ...f, targetSets: v }))} />
        <NumberField label="주당 총 세트" value={form.targetVolume} onChange={(v) => setForm((f) => ({ ...f, targetVolume: v }))} />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-500">강도 가이드</label>
        <textarea
          value={form.intensityGuide}
          onChange={(e) => setForm((f) => ({ ...f, intensityGuide: e.target.value }))}
          rows={2}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-500">회원님께 전달할 메모</label>
        <textarea
          value={form.goalNote}
          onChange={(e) => setForm((f) => ({ ...f, goalNote: e.target.value }))}
          rows={2}
          placeholder="예: 이번 달 스쿼트 중량 잘 늘고 있어요! 다음 달은 주 3회, 데드리프트 중량도 함께 올려봐요."
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
      </div>
      <div className="flex items-center justify-between pt-1">
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={form.achieved}
            onChange={(e) => setForm((f) => ({ ...f, achieved: e.target.checked }))}
            className="accent-indigo-600"
          />
          이번 달 목표 달성으로 표시
        </label>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "저장 중..." : "목표 저장"}
        </button>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );
}
