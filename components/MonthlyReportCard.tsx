"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Feedback, GoalSuggestion } from "@/lib/monthlyReport";

type ExerciseSummary = { name: string; totalSets: number; maxWeight: number | null; unit: string };
type SavedGoal = {
  targetFrequency: number | null;
  targetSets: number | null;
  targetVolume: number | null;
  intensityGuide: string | null;
  goalNote: string | null;
  achieved: boolean;
} | null;

export default function MonthlyReportCard({
  yearMonth,
  clientId,
  clientName,
  sessionCount,
  avgFrequency,
  avgSetsPerSession,
  exerciseSummary,
  feedback,
  suggestion,
  savedGoal,
}: {
  yearMonth: string;
  clientId: number;
  clientName: string;
  sessionCount: number;
  avgFrequency: number;
  avgSetsPerSession: number;
  exerciseSummary: ExerciseSummary[];
  feedback: Feedback[];
  suggestion: GoalSuggestion;
  savedGoal: SavedGoal;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
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

  const warningCount = feedback.filter((f) => f.type === "warning").length;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/clients/${clientId}`}
              onClick={(e) => e.stopPropagation()}
              className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0 hover:bg-indigo-200 transition-colors"
            >
              {clientName[0]}
            </Link>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{clientName}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                이번 달 수업 {sessionCount}회 · 주 평균 {Math.round(avgFrequency * 10) / 10}회 · 세션당 {Math.round(avgSetsPerSession * 10) / 10}세트
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {savedGoal?.achieved && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">목표 달성</span>
            )}
            {warningCount > 0 ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">확인 필요 {warningCount}</span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">양호</span>
            )}
            {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          {/* 피드백 */}
          <div className="space-y-1.5">
            {feedback.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                {f.type === "positive" && <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />}
                {f.type === "warning" && <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />}
                {f.type === "info" && <Info size={15} className="text-gray-400 shrink-0 mt-0.5" />}
                <span className="text-gray-700">{f.text}</span>
              </div>
            ))}
          </div>

          {/* 운동별 요약 */}
          {exerciseSummary.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {exerciseSummary.map((e) => (
                <span key={e.name} className="text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-100">
                  {e.name} · {e.totalSets}세트{e.maxWeight != null ? ` · 최고 ${e.maxWeight}${e.unit}` : ""}
                </span>
              ))}
            </div>
          )}

          {/* 목표 설정 */}
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
        </div>
      )}
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
