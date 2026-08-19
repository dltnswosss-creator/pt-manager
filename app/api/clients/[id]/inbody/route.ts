import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/clients/[id]/inbody">) {
  const { id } = await ctx.params;
  const records = await prisma.inBodyRecord.findMany({
    where: { clientId: Number(id) },
    orderBy: { date: "asc" },
  });
  return Response.json(records);
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/clients/[id]/inbody">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const record = await prisma.inBodyRecord.upsert({
    where: { clientId_date: { clientId: Number(id), date: body.date } },
    create: { clientId: Number(id), ...body },
    update: body,
  });
  return Response.json(record, { status: 201 });
}
