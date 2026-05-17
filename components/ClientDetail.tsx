"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getMenstrualPhase, PHASE_LABELS, PHASE_COLORS, PHASE_GUIDE,
  EXERCISE_LEVEL_LABELS, PAIN_INTENSITY_LABELS, PAIN_INTENSITY_COLORS,
  type PainArea, type MenstrualPhase,
} from "@/lib/types";
import { calcAge, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ArrowLeft, Edit, Trash2, Plus, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import SessionExportButton from "@/components/SessionExportButton";
import NotionShareButton from "@/components/NotionShareButton";

type Exercise = { id: number; name: string; sets: number | null; reps: string | null; weight: number | null; unit: string; memo: string | null };
type Session = { id: number; date: string; sessionType: string; duration: number | null; memo: string | null; notionUrl: string | null; exercises: Exercise[] };
type MenstrualCycle = { lastStartDate: string; cycleLength: number; periodLength: number; memo: string | null } | null;
type Client = {
  id: number; name: string; gender: string; birthDate: string | null; phone: string | null; email: string | null;
  job: string | null; startDate: string | null; goal: string | null; exerciseLevel: string | null;
  exerciseHistory: string | null; medicalHistory: string | null; painAreas: string | null; medications: string | null;
  mealCount: number | null; mealPattern: string | null; sleepHours: number | null; memo: string | null;
  sessions: Session[]; menstrualCycle: MenstrualCycle;
};

export default function ClientDetail({ client }: { client: Client }) {
  const router = useRouter();
  const tabs = ["인적사항", "수업 기록", ...(client.gender === "female" ? ["생리주기"] : [])];
  const [tab, setTab] = useState(tabs[0]);
  const [cycleForm, setCycleForm] = useState({
    lastStartDate: client.menstrualCycle?.lastStartDate ?? "",
    cycleLength: client.menstrualCycle?.cycleLength ?? 28,
    periodLength: client.menstrualCycle?.periodLength ?? 5,
    memo: client.menstrualCycle?.memo ?? "",
  });
  const [cycleLoading, setCycleLoading] = useState(false);
  const [expandedSession, setExpandedSession] = useState<number | null>(null);

  const painAreas: PainArea[] = client.painAreas ? JSON.parse(client.painAreas) : [];

  const phase: MenstrualPhase | null = client.menstrualCycle
    ? getMenstrualPhase(client.menstrualCycle.lastStartDate, client.menstrualCycle.cycleLength, client.menstrualCycle.periodLength)
    : null;

  const handleDelete = async () => {
    if (!confirm(`${client.name} 회원을 삭제하시겠습니까?`)) return;
    await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    router.push("/clients");
    router.refresh();
  };

  const saveCycle = async () => {
    setCycleLoading(true);
    await fetch(`/api/clients/${client.id}/menstrual`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cycleForm),
    });
    setCycleLoading(false);
    router.refresh();
  };

  const deleteSession = async (sessionId: number) => {
    if (!confirm("이 수업 기록을 삭제하시겠습니까?")) return;
    await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-4">
        <Link href="/clients" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-500" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
            {phase && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${PHASE_COLORS[phase]}`}>
                {PHASE_LABELS[phase]}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {client.gender === "female" ? "여성" : "남성"}
            {client.birthDate && ` · ${calcAge(client.birthDate)}세`}
            {client.job && ` · ${client.job}`}
            {client.startDate && ` · PT 시작 ${formatDate(client.startDate)}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/clients/${client.id}/edit`} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
            <Edit size={15} /> 수정
          </Link>
          <button onClick={handleDelete} className="flex items-center gap-1.5 px-3 py-2 border border-red-100 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={15} /> 삭제
          </button>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-gray-100">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 인적사항 탭 */}
      {tab === "인적사항" && (
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-2">
          <InfoCard title="기본 정보">
            <InfoRow label="이름" value={client.name} />
            <InfoRow label="성별" value={client.gender === "female" ? "여성" : "남성"} />
            <InfoRow label="생년월일" value={client.birthDate ? `${client.birthDate} (${calcAge(client.birthDate)}세)` : "-"} />
            <InfoRow label="연락처" value={client.phone} />
            <InfoRow label="직업" value={client.job} />
            <InfoRow label="PT 시작일" value={client.startDate ? formatDate(client.startDate) : null} />
            <InfoRow label="목표" value={client.goal} />
          </InfoCard>

          <InfoCard title="운동 경험">
            <InfoRow label="레벨" value={client.exerciseLevel ? EXERCISE_LEVEL_LABELS[client.exerciseLevel] : null} />
            <InfoRow label="경력" value={client.exerciseHistory} multiline />
          </InfoCard>

          <InfoCard title="병력 / 통증">
            <InfoRow label="병력" value={client.medicalHistory} multiline />
            <InfoRow label="복용 약물" value={client.medications} />
            {painAreas.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500">통증 부위</p>
                <div className="flex flex-wrap gap-1.5">
                  {painAreas.map((p, i) => (
                    <span key={i} className={cn("text-xs px-2.5 py-1 rounded-full border", PAIN_INTENSITY_COLORS[p.intensity])}>
                      {p.area} · {PAIN_INTENSITY_LABELS[p.intensity]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </InfoCard>

          <InfoCard title="생활 습관">
            <InfoRow label="식사 횟수" value={client.mealCount ? `하루 ${client.mealCount}회` : null} />
            <InfoRow label="수면 시간" value={client.sleepHours ? `${client.sleepHours}시간` : null} />
            <InfoRow label="식사 패턴" value={client.mealPattern} multiline />
          </InfoCard>

          {client.memo && (
            <div className="lg:col-span-2">
              <InfoCard title="메모">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{client.memo}</p>
              </InfoCard>
            </div>
          )}
        </div>
      )}

      {/* 수업 기록 탭 */}
      {tab === "수업 기록" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link
              href={`/sessions/new?clientId=${client.id}`}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} />
              수업 기록 추가
            </Link>
          </div>

          {client.sessions.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <p className="text-gray-400">수업 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {client.sessions.map((s) => (
                <div key={s.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div
                    className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedSession(expandedSession === s.id ? null : s.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold text-gray-900 shrink-0">{formatDate(s.date)}</span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full shrink-0",
                          s.sessionType === "individual" ? "bg-indigo-50 text-indigo-600" : "bg-violet-50 text-violet-600"
                        )}>
                          {s.sessionType === "individual" ? "1:1" : "그룹"}
                        </span>
                        {s.duration && <span className="text-xs text-gray-400 shrink-0">{s.duration}분</span>}
                      </div>
                      {expandedSession === s.id ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-400">{s.exercises.length}개 운동</span>
                      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <SessionExportButton session={s} clientName={client.name} />
                        <NotionShareButton sessionId={s.id} type="session" existingUrl={s.notionUrl} />
                        <Link
                          href={`/sessions/${s.id}/edit`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 hover:text-indigo-600 text-gray-300 transition-colors"
                        >
                          <Pencil size={14} />
                        </Link>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                          className="p-1.5 hover:text-red-500 text-gray-300 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {expandedSession === s.id && (
                    <div className="border-t border-gray-100 px-5 py-4 space-y-3">
                      {s.exercises.length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-gray-400">
                                <th className="text-left pb-2 font-medium w-8">#</th>
                                <th className="text-left pb-2 font-medium">운동명</th>
                                <th className="text-left pb-2 font-medium">세트</th>
                                <th className="text-left pb-2 font-medium">횟수</th>
                                <th className="text-left pb-2 font-medium">중량</th>
                                <th className="text-left pb-2 font-medium">메모</th>
                              </tr>
                            </thead>
                            <tbody>
                              {s.exercises.map((e, i) => (
                                <tr key={e.id} className="border-t border-gray-50">
                                  <td className="py-1.5 text-gray-300 text-xs">{i + 1}</td>
                                  <td className="py-1.5 font-medium text-gray-900">{e.name}</td>
                                  <td className="py-1.5 text-gray-600">{e.sets ?? "-"}</td>
                                  <td className="py-1.5 text-gray-600">{e.reps ?? "-"}</td>
                                  <td className="py-1.5 text-gray-600">{e.weight ? `${e.weight}${e.unit}` : "-"}</td>
                                  <td className="py-1.5 text-gray-400 text-xs">{e.memo ?? ""}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {s.memo && (
                        <div className="bg-gray-50 rounded-lg px-4 py-3">
                          <p className="text-xs font-medium text-gray-500 mb-1">특이사항</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{s.memo}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 생리주기 탭 */}
      {tab === "생리주기" && (
        <div className="flex flex-col gap-5 lg:grid lg:grid-cols-2">
          {phase && (
            <div className={cn("lg:col-span-2 rounded-xl p-5 space-y-3", {
              "bg-rose-50": phase === "menstrual",
              "bg-emerald-50": phase === "follicular",
              "bg-violet-50": phase === "ovulation",
              "bg-amber-50": phase === "luteal",
            })}>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${PHASE_COLORS[phase]}`}>현재: {PHASE_LABELS[phase]}</span>
                <span className="text-sm font-semibold text-gray-700">{PHASE_GUIDE[phase].title}</span>
              </div>
              <ul className="grid grid-cols-2 gap-1.5">
                {PHASE_GUIDE[phase].tips.map((tip) => (
                  <li key={tip} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">생리주기 설정</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">마지막 생리 시작일</label>
                <input
                  type="date"
                  value={cycleForm.lastStartDate}
                  onChange={(e) => setCycleForm((f) => ({ ...f, lastStartDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">생리 주기 (일): {cycleForm.cycleLength}일</label>
                <input type="range" min={21} max={40} value={cycleForm.cycleLength}
                  onChange={(e) => setCycleForm((f) => ({ ...f, cycleLength: Number(e.target.value) }))}
                  className="w-full accent-indigo-600 mt-2" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">생리 기간 (일): {cycleForm.periodLength}일</label>
                <input type="range" min={2} max={10} value={cycleForm.periodLength}
                  onChange={(e) => setCycleForm((f) => ({ ...f, periodLength: Number(e.target.value) }))}
                  className="w-full accent-indigo-600 mt-2" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">메모</label>
                <input
                  value={cycleForm.memo}
                  onChange={(e) => setCycleForm((f) => ({ ...f, memo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="특이사항"
                />
              </div>
            </div>
            <button
              onClick={saveCycle}
              disabled={cycleLoading || !cycleForm.lastStartDate}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {cycleLoading ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
      <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
      {children}
    </div>
  );
}

function InfoRow({ label, value, multiline }: { label: string; value: string | number | null | undefined; multiline?: boolean }) {
  if (!value && value !== 0) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className={cn("text-sm text-gray-800", multiline ? "whitespace-pre-wrap" : "")}>{value}</p>
    </div>
  );
}
