export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getMenstrualPhase, PHASE_LABELS, PHASE_COLORS, EXERCISE_LEVEL_LABELS } from "@/lib/types";
import { calcAge } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { name: "asc" },
    include: { menstrualCycle: true, sessions: { orderBy: { date: "desc" }, take: 1 } },
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">회원 관리</h2>
        <Link
          href="/clients/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          회원 추가
        </Link>
      </div>

      {clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center">
          <p className="text-gray-400 mb-4">등록된 회원이 없습니다.</p>
          <Link href="/clients/new" className="text-indigo-600 text-sm font-medium hover:underline">
            첫 번째 회원 추가하기 →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">이름</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">성별 / 나이</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">운동 경험</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">마지막 수업</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">생리 주기</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const phase = c.menstrualCycle
                  ? getMenstrualPhase(c.menstrualCycle.lastStartDate, c.menstrualCycle.cycleLength, c.menstrualCycle.periodLength)
                  : null;
                const lastSession = c.sessions[0];
                return (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/clients/${c.id}`} className="flex items-center gap-3 group">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0">
                          {c.name[0]}
                        </div>
                        <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {c.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {c.gender === "female" ? "여성" : "남성"}
                      {c.birthDate && ` · ${calcAge(c.birthDate)}세`}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">
                      {c.exerciseLevel ? EXERCISE_LEVEL_LABELS[c.exerciseLevel] : "-"}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">
                      {lastSession
                        ? new Date(lastSession.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })
                        : "-"}
                    </td>
                    <td className="px-4 py-3.5">
                      {phase ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PHASE_COLORS[phase]}`}>
                          {PHASE_LABELS[phase]}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
