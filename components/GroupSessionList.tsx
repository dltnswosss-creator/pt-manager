"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { ChevronDown, ChevronUp, Trash2, Pencil } from "lucide-react";
import GroupSessionExportButton from "@/components/GroupSessionExportButton";
import NotionShareButton from "@/components/NotionShareButton";

type Exercise = { id: number; name: string; sets: number | null; reps: string | null; weight: number | null; unit: string; memo: string | null };
type GroupSession = { id: number; date: string; title: string | null; memo: string | null; participants: string[]; notionUrl: string | null; exercises: Exercise[] };

export default function GroupSessionList({ sessions }: { sessions: GroupSession[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(sessions[0]?.id ?? null);

  const handleDelete = async (id: number) => {
    if (!confirm("이 그룹 수업 기록을 삭제하시겠습니까?")) return;
    await fetch(`/api/group-sessions/${id}`, { method: "DELETE" });
    router.refresh();
  };

  if (sessions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
        <p className="text-gray-400">그룹 수업 기록이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((s) => (
        <div key={s.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setExpanded(expanded === s.id ? null : s.id)}
          >
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-gray-900">{formatDate(s.date)}</span>
              {s.title && <span className="text-sm text-gray-500">· {s.title}</span>}
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 font-medium">그룹</span>
              {s.participants?.map((name) => (
                <span key={name} className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">{name}</span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{s.exercises.length}개 운동</span>
              <div onClick={(e) => e.stopPropagation()}>
                <GroupSessionExportButton session={s} />
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <NotionShareButton sessionId={s.id} type="group" existingUrl={s.notionUrl} />
              </div>
              <Link
                href={`/group-sessions/${s.id}/edit`}
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 text-gray-300 hover:text-indigo-600 transition-colors"
              >
                <Pencil size={14} />
              </Link>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }} className="p-1.5 text-gray-300 hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
              {expanded === s.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </div>
          </div>

          {expanded === s.id && (
            <div className="border-t border-gray-100 px-5 py-4 space-y-3">
              {s.exercises.length > 0 ? (
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
              ) : (
                <p className="text-sm text-gray-400">운동 없음</p>
              )}
              {s.memo && (
                <div className="bg-gray-50 rounded-lg px-4 py-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">메모</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{s.memo}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
