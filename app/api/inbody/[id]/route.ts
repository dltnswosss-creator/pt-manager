import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/inbody/[id]">) {
  const { id } = await ctx.params;
  await prisma.inBodyRecord.delete({ where: { id: Number(id) } });
  return Response.json({ ok: true });
}
