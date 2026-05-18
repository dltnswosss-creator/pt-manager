import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const schedule = await prisma.schedule.findUnique({ where: { id: Number(id) } });
  if (!schedule) return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.schedule.update({ where: { id: Number(id) }, data: { status: "completed" } });

  const duration =
    schedule.endTime
      ? (() => {
          const [sh, sm] = schedule.startTime.split(":").map(Number);
          const [eh, em] = schedule.endTime!.split(":").map(Number);
          return (eh - sh) * 60 + (em - sm);
        })()
      : null;

  if (schedule.type === "individual" && schedule.clientId) {
    const session = await prisma.session.create({
      data: {
        clientId: schedule.clientId,
        date: schedule.date,
        sessionType: "individual",
        duration,
        memo: schedule.memo,
      },
    });
    return Response.json({ redirect: `/sessions/${session.id}/edit` });
  }

  const groupSession = await prisma.groupSession.create({
    data: {
      date: schedule.date,
      participants: schedule.participants,
      memo: schedule.memo,
    },
  });
  return Response.json({ redirect: `/group-sessions/${groupSession.id}/edit` });
}
