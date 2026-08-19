"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, Info, ChevronDown, ChevronUp, Maximize2 } from "lucide-react";
import type { Feedback, GoalSuggestion } from "@/lib/monthlyReport";
import MonthlyGoalForm from "@/components/MonthlyGoalForm";
import ExerciseSummaryChart from "@/components/ExerciseSummaryChart";

type ExerciseSummary = { name: string; totalSets: number; maxWeight: number | null; maxReps: number | null; unit: string };
type BodyPartVolume = { part: string; label: string; totalSets: number };
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
  avgSetsPerSession,
  exerciseSummary,
  bodyPartVolume,
  feedback,
  suggestion,
  savedGoal,
}: {
  yearMonth: string;
  clientId: number;
  clientName: string;
  sessionCount: number;
  avgSetsPerSession: number;
  exerciseSummary: ExerciseSummary[];
  bodyPartVolume: BodyPartVolume[];
  feedback: Feedback[];
  suggestion: GoalSuggestion;
  savedGoal: SavedGoal;
}) {
  const [expanded, setExpanded] = useState(false);

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
                이번 달 수업 {sessionCount}회 · 세션당 {Math.round(avgSetsPerSession * 10) / 10}세트
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
            <Link
              href={`/monthly-report/${clientId}?ym=${yearMonth}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="전체 화면으로 보기"
            >
              <Maximize2 size={15} />
            </Link>
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
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-500">운동별 요약</p>
              <ExerciseSummaryChart exercises={exerciseSummary} limit={5} />
            </div>
          )}

          {/* 부위별 볼륨 */}
          {bodyPartVolume.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-gray-500">부위별 볼륨</p>
              {bodyPartVolume.map((p) => (
                <div key={p.part} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-10 shrink-0">{p.label}</span>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 rounded-full"
                      style={{ width: `${Math.round((p.totalSets / bodyPartVolume[0].totalSets) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-12 shrink-0 text-right">{p.totalSets}세트</span>
                </div>
              ))}
            </div>
          )}

          {/* 목표 설정 */}
          <MonthlyGoalForm yearMonth={yearMonth} clientId={clientId} suggestion={suggestion} savedGoal={savedGoal} />
        </div>
      )}
    </div>
  );
}
