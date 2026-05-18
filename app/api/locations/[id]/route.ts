import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const location = await prisma.location.update({ where: { id: Number(id) }, data: body });
  return Response.json(location);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await prisma.location.delete({ where: { id: Number(id) } });
  return Response.json({ ok: true });
}
