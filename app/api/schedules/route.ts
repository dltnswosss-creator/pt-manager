import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("weekStart");
  if (!weekStart) return Response.json({ error: "weekStart required" }, { status: 400 });

  const startDate = new Date(weekStart);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  const weekEnd = endDate.toISOString().split("T")[0];

  const schedules = await prisma.schedule.findMany({
    where: { date: { gte: weekStart, lte: weekEnd } },
    include: {
      client: { select: { id: true, name: true } },
      location: true,
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
  return Response.json(schedules);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const schedule = await prisma.schedule.create({
    data: body,
    include: {
      client: { select: { id: true, name: true } },
      location: true,
    },
  });
  return Response.json(schedule, { status: 201 });
}
