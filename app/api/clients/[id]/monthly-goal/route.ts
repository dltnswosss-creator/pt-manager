import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/clients/[id]/monthly-goal">) {
  const { id } = await ctx.params;
  const yearMonth = req.nextUrl.searchParams.get("yearMonth");
  if (!yearMonth) return Response.json({ error: "yearMonth required" }, { status: 400 });

  const goal = await prisma.monthlyGoal.findUnique({
    where: { clientId_yearMonth: { clientId: Number(id), yearMonth } },
  });
  return Response.json(goal);
}

export async function PUT(req: NextRequest, ctx: RouteContext<"/api/clients/[id]/monthly-goal">) {
  const { id } = await ctx.params;
  const body = await req.json();
  const { yearMonth, ...data } = body;
  if (!yearMonth) return Response.json({ error: "yearMonth required" }, { status: 400 });

  const goal = await prisma.monthlyGoal.upsert({
    where: { clientId_yearMonth: { clientId: Number(id), yearMonth } },
    create: { clientId: Number(id), yearMonth, ...data },
    update: data,
  });
  return Response.json(goal);
}
