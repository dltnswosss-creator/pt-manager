import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { videoUrls } = await req.json();
  const exercise = await prisma.exercise.update({
    where: { id: Number(id) },
    data: { videoUrls },
  });
  return Response.json({ videoUrls: exercise.videoUrls });
}
