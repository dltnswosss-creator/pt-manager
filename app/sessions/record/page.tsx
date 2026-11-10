import { prisma } from "@/lib/prisma";
import SessionRecorder from "@/components/SessionRecorder";

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function SessionRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const clients = await prisma.client.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });

  // "지금 진행 중인 수업"의 회원을 미리 선택하기 위한 일정.
  // 서버(UTC)와 브라우저(KST)의 날짜가 다를 수 있어 어제~내일을 넘기고, 시간 판단은 브라우저에서 한다.
  const now = new Date();
  const dates = [-1, 0, 1].map((d) => ymd(new Date(now.getTime() + d * 86_400_000)));
  const schedules = await prisma.schedule.findMany({
    where: { date: { in: dates }, status: { not: "cancelled" }, clientId: { not: null } },
    select: { date: true, startTime: true, endTime: true, clientId: true, location: { select: { name: true } } },
  });

  return (
    <SessionRecorder
      clients={clients}
      schedules={schedules.map(({ location, ...s }) => ({ ...s, clientId: s.clientId as number, locationName: location?.name ?? null }))}
      defaultClientId={clientId ? Number(clientId) : undefined}
    />
  );
}
