export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";
import GroupSessionList from "@/components/GroupSessionList";

export default async function GroupSessionsPage() {
  const sessions = await prisma.groupSession.findMany({
    orderBy: { date: "desc" },
    include: { exercises: { orderBy: { order: "asc" } } },
  });

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">그룹 수업</h2>
          <p className="text-sm text-gray-500 mt-0.5">기업 출강 및 그룹 수업 운동 기록</p>
        </div>
        <Link
          href="/group-sessions/new"
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          그룹 수업 추가
        </Link>
      </div>
      <GroupSessionList sessions={JSON.parse(JSON.stringify(sessions))} />
    </div>
  );
}
