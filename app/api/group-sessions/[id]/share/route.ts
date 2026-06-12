import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createGroupSessionNotionPage } from "@/lib/notion";

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/group-sessions/[id]/share">) {
  const { id } = await ctx.params;

  const session = await prisma.groupSession.findUnique({
    where: { id: Number(id) },
    include: { exercises: { orderBy: { order: "asc" } } },
  });

  if (!session) {
    return Response.json({ error: "그룹 수업 기록을 찾을 수 없습니다" }, { status: 404 });
  }

  if (session.notionUrl) {
    return Response.json({ url: session.notionUrl });
  }

  const notionUrl = await createGroupSessionNotionPage({
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

  await prisma.groupSession.update({
    where: { id: Number(id) },
    data: { notionUrl },
  });

  return Response.json({ url: notionUrl }, { status: 201 });
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/group-sessions/[id]/share">) {
  const { id } = await ctx.params;
  await prisma.groupSession.update({
    where: { id: Number(id) },
    data: { notionUrl: null, notionPageId: null },
  });
  return Response.json({ ok: true });
}
