import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionNotionPage } from "@/lib/notion";

export async function POST(_req: NextRequest, ctx: RouteContext<"/api/sessions/[id]/share">) {
  const { id } = await ctx.params;

  const session = await prisma.session.findUnique({
    where: { id: Number(id) },
    include: {
      client: true,
      exercises: { orderBy: { order: "asc" } },
    },
  });

  if (!session) {
    return Response.json({ error: "수업 기록을 찾을 수 없습니다" }, { status: 404 });
  }

  // 이미 공유된 경우 기존 URL 반환
  if (session.notionUrl) {
    return Response.json({ url: session.notionUrl });
  }

  const notionUrl = await createSessionNotionPage({
    clientName: session.client.name,
    date: session.date,
    sessionType: session.sessionType,
    duration: session.duration,
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

  await prisma.session.update({
    where: { id: Number(id) },
    data: { notionUrl },
  });

  return Response.json({ url: notionUrl }, { status: 201 });
}

// 공유 URL 초기화 (재공유 시 새 페이지 생성)
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/sessions/[id]/share">) {
  const { id } = await ctx.params;
  await prisma.session.update({
    where: { id: Number(id) },
    data: { notionUrl: null, notionPageId: null },
  });
  return Response.json({ ok: true });
}
