import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/sessions/[id]">) {
  const { id } = await ctx.params;
  const session = await prisma.session.findUnique({
    where: { id: Number(id) },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
  if (!session) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(session);
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/sessions/[id]">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { exercises, ...sessionData } = body;

  // 기존 exercises 삭제 후 재생성
  await prisma.exercise.deleteMany({ where: { sessionId: Number(id) } });

  const session = await prisma.session.update({
    where: { id: Number(id) },
    data: {
      ...sessionData,
      exercises: exercises?.length
        ? { create: exercises.map((e: Record<string, unknown>, i: number) => ({ ...e, order: i })) }
        : undefined,
    },
    include: { exercises: true },
  });
  return Response.json(session);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/sessions/[id]">) {
  const { id } = await ctx.params;
  await prisma.session.delete({ where: { id: Number(id) } });
  return Response.json({ ok: true });
}
