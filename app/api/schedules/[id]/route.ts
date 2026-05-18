import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const schedule = await prisma.schedule.findUnique({
    where: { id: Number(id) },
    include: {
      client: { select: { id: true, name: true } },
      location: true,
    },
  });
  if (!schedule) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(schedule);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const schedule = await prisma.schedule.update({
    where: { id: Number(id) },
    data: body,
    include: {
      client: { select: { id: true, name: true } },
      location: true,
    },
  });
  return Response.json(schedule);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await prisma.schedule.delete({ where: { id: Number(id) } });
  return Response.json({ ok: true });
}
