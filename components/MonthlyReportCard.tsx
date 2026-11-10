"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Maximize2 } from "lucide-react";
import type { MonthlyFeedback, GoalSuggestion } from "@/lib/monthlyReport";
import MonthlyGoalForm from "@/components/MonthlyGoalForm";
import ExerciseSummaryChart from "@/components/ExerciseSummaryChart";
import ExerciseFeedbackSection from "@/components/ExerciseFeedbackSection";

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
  feedback: MonthlyFeedback;
  suggestion: GoalSuggestion;
  savedGoal: SavedGoal;
}) {
  const [expanded, setExpanded] = useState(false);

  const warningCount = feedback.stagnant.length + feedback.notice.filter((f) => f.type === "warning").length;

  return (
    <div className="bg-gray-50 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/clients/${clientId}`}
              onClick={(e) => e.stopPropagation()}
              className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-gray-700 font-semibold text-[17px] shrink-0"
            >
              {clientName[0]}
            </Link>
            <div className="min-w-0">
              <p className="text-[17px] font-semibold text-gray-900 truncate">{clientName}</p>
              <p className="text-[13px] text-gray-500 mt-0.5">
                이번 달 수업 {sessionCount}회 · 세션당 {Math.round(avgSetsPerSession * 10) / 10}세트
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {savedGoal?.achieved && (
              <span className="text-[13px] font-semibold text-emerald-600">목표 달성</span>
            )}
            {warningCount > 0 ? (
              <span className="text-[13px] font-semibold text-gray-700">확인 필요 {warningCount}</span>
            ) : (
              <span className="text-[13px] font-semibold text-emerald-600">양호</span>
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
        <div className="px-5 pb-5 pt-1 space-y-4">
          {/* 피드백 */}
          <ExerciseFeedbackSection feedback={feedback} />

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
