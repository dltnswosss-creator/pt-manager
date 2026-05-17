import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: { menstrualCycle: true, sessions: { orderBy: { date: "desc" }, take: 1 } },
  });
  return Response.json(clients);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const client = await prisma.client.create({ data: body });
  return Response.json(client, { status: 201 });
}
