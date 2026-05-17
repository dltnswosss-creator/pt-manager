import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/clients/[id]">) {
  const { id } = await ctx.params;
  const client = await prisma.client.findUnique({
    where: { id: Number(id) },
    include: {
      menstrualCycle: true,
      sessions: {
        orderBy: { date: "desc" },
        include: { exercises: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!client) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(client);
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/clients/[id]">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const client = await prisma.client.update({ where: { id: Number(id) }, data: body });
  return Response.json(client);
}

export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/clients/[id]">) {
  const { id } = await ctx.params;
  await prisma.client.delete({ where: { id: Number(id) } });
  return Response.json({ ok: true });
}
