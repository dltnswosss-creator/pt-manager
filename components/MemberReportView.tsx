"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Info,
  ImageIcon, Download, Copy, Check, Loader2, X,
} from "lucide-react";
import { formatYearMonth, shiftYearMonth, type Feedback, type GoalSuggestion } from "@/lib/monthlyReport";
import MonthlyGoalForm from "@/components/MonthlyGoalForm";
import BodyMap from "@/components/BodyMap";

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

export default function MemberReportView({
  yearMonth,
  clientId,
  clientName,
  sessionCount,
  avgFrequency,
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
  avgFrequency: number;
  avgSetsPerSession: number;
  exerciseSummary: ExerciseSummary[];
  bodyPartVolume: BodyPartVolume[];
  feedback: Feedback[];
  suggestion: GoalSuggestion;
  savedGoal: SavedGoal;
}) {
  const [showExport, setShowExport] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const maxBodyPartSets = bodyPartVolume[0]?.totalSets ?? 0;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      {/* 상단 바 */}
      <div className="flex items-center justify-between gap-3">
        <Link href="/monthly-report" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft size={16} />
          전체 회원
        </Link>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 bg-white border border-gray-100 rounded-lg px-1 py-1">
            <Link href={`/monthly-report/${clientId}?ym=${shiftYearMonth(yearMonth, -1)}`} className="p-1.5 rounded-md hover:bg-gray-50 text-gray-500">
              <ChevronLeft size={16} />
            </Link>
            <span className="text-sm font-medium text-gray-900 px-2 w-24 text-center">{formatYearMonth(yearMonth)}</span>
            <Link href={`/monthly-report/${clientId}?ym=${shiftYearMonth(yearMonth, 1)}`} className="p-1.5 rounded-md hover:bg-gray-50 text-gray-500">
              <ChevronRight size={16} />
            </Link>
          </div>
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 text-sm text-gray-500 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ImageIcon size={15} />
            이미지로 저장
          </button>
        </div>
      </div>

      {/* 캡처 대상: 리포트 본문 */}
      <div ref={reportRef} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
        <div>
          <p className="text-xs text-gray-400">{formatYearMonth(yearMonth)} 월간 리포트</p>
          <h2 className="text-2xl font-bold text-gray-900 mt-0.5">{clientName}</h2>
        </div>

        {/* 요약 통계 */}
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="이번 달 수업" value={`${sessionCount}회`} />
          <StatTile label="주 평균 빈도" value={`${Math.round(avgFrequency * 10) / 10}회`} />
          <StatTile label="세션당 평균" value={`${Math.round(avgSetsPerSession * 10) / 10}세트`} />
        </div>

        {/* 피드백 */}
        <div className="space-y-2">
          {feedback.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              {f.type === "positive" && <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />}
              {f.type === "warning" && <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />}
              {f.type === "info" && <Info size={16} className="text-gray-400 shrink-0 mt-0.5" />}
              <span className="text-gray-700">{f.text}</span>
            </div>
          ))}
        </div>

        {/* 부위별 볼륨 */}
        {bodyPartVolume.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-700">부위별 볼륨</p>
            <BodyMap volume={bodyPartVolume} />
            <div className="space-y-2">
              {bodyPartVolume.map((p) => (
                <div key={p.part} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-10 shrink-0">{p.label}</span>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-400 rounded-full"
                      style={{ width: `${Math.round((p.totalSets / maxBodyPartSets) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-14 shrink-0 text-right">{p.totalSets}세트</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 운동별 요약 */}
        {exerciseSummary.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">운동별 요약</p>
            <div className="flex flex-wrap gap-1.5">
              {exerciseSummary.map((e) => (
                <span key={e.name} className="text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-100">
                  {e.name} · {e.totalSets}세트{e.maxWeight != null ? ` · 최고 ${e.maxWeight}${e.unit}` : ""}{e.maxReps != null ? ` · 최대 ${e.maxReps}회` : ""}
                </span>
              ))}
            </div>
          </div>
        )}

        {savedGoal?.goalNote && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-1.5">트레이너 메모</p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{savedGoal.goalNote}</p>
          </div>
        )}
      </div>

      {/* 목표 설정 (편집용, 이미지 캡처 대상 아님) */}
      <MonthlyGoalForm yearMonth={yearMonth} clientId={clientId} suggestion={suggestion} savedGoal={savedGoal} />

      {showExport && (
        <ExportModal
          targetRef={reportRef}
          fileName={`${clientName}_${yearMonth}_월간리포트.png`}
          title="월간 리포트 이미지 저장"
          description={`${clientName} 회원의 ${formatYearMonth(yearMonth)} 리포트를 이미지로 저장합니다.`}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
      <p className="text-[11px] text-gray-500 mt-1 leading-tight">{label}</p>
    </div>
  );
}

function ExportModal({ targetRef, fileName, title, description, onClose }: {
  targetRef: React.RefObject<HTMLDivElement | null>;
  fileName: string;
  title: string;
  description: string;
  onClose: () => void;
}) {
  const [loadingDown, setLoadingDown] = useState(false);
  const [loadingCopy, setLoadingCopy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function getBlob(): Promise<Blob | null> {
    if (!targetRef.current) return null;
    const { toBlob } = await import("html-to-image");
    return await toBlob(targetRef.current, { backgroundColor: "#ffffff", pixelRatio: 2 });
  }

  async function handleDownload() {
    setLoadingDown(true);
    try {
      const blob = await getBlob();
      if (!blob) return;

      const file = new File([blob], fileName, { type: "image/png" });
      if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: fileName });
          onClose();
          return;
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      onClose();
    } finally {
      setLoadingDown(false);
    }
  }

  async function handleCopy() {
    setLoadingCopy(true);
    try {
      const blob = await getBlob();
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setCopied(true);
        setTimeout(() => { setCopied(false); onClose(); }, 1500);
      } catch {
        await handleDownload();
      }
    } finally {
      setLoadingCopy(false);
    }
  }

  const busy = loadingDown || loadingCopy;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <p className="text-xs text-gray-400 mb-5 text-center">{description}</p>
        <div className="flex gap-2">
          <button onClick={handleCopy} disabled={busy} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {loadingCopy ? <Loader2 size={15} className="animate-spin" /> : copied ? <Check size={15} /> : <Copy size={15} />}
            {loadingCopy ? "처리 중..." : copied ? "복사됨!" : "클립보드 복사"}
          </button>
          <button onClick={handleDownload} disabled={busy} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition-colors">
            {loadingDown ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {loadingDown ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
