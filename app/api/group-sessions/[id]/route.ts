import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateGroupSessionNotionPage } from "@/lib/notion";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/group-sessions/[id]">) {
  const { id } = await ctx.params;
  const session = await prisma.groupSession.findUnique({
    where: { id: Number(id) },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
  if (!session) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(session);
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/group-sessions/[id]">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { exercises, ...sessionData } = body;

  await prisma.groupExercise.deleteMany({ where: { groupSessionId: Number(id) } });

  const session = await prisma.groupSession.update({
    where: { id: Number(id) },
    data: {
      ...sessionData,
      exercises: exercises?.length
        ? { create: exercises.map((e: Record<string, unknown>, i: number) => ({ ...e, order: i })) }
        : undefined,
    },
    include: { exercises: true },
  });

  if (process.env.NOTION_API_KEY && session.notionUrl) {
    try {
      await updateGroupSessionNotionPage(session.notionUrl, {
        title: session.title,
        date: session.date,
        participants: session.participants,
        memo: session.memo,
        exercises: session.exercises.map((e) => ({
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          unit: e.unit,
          memo: e.memo,
          videoUrls: e.videoUrls,
        })),
      });
    } catch (e) {
      console.error("Notion 업데이트 실패:", e);
    }
  }

  return Response.json(session);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/group-sessions/[id]">) {
  const { id } = await ctx.params;
  await prisma.groupSession.delete({ where: { id: Number(id) } });
  return Response.json({ ok: true });
}
