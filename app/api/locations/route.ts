import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const locations = await prisma.location.findMany({ orderBy: { createdAt: "asc" } });
  return Response.json(locations);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const location = await prisma.location.create({ data: body });
  return Response.json(location, { status: 201 });
}
