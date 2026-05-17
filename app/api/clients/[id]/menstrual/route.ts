import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/clients/[id]/menstrual">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const cycle = await prisma.menstrualCycle.upsert({
    where: { clientId: Number(id) },
    create: { clientId: Number(id), ...body },
    update: body,
  });
  return Response.json(cycle);
}
