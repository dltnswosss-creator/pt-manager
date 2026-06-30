import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { updateSessionNotionPage } from "@/lib/notion";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { videoUrls } = await req.json();

  const exercise = await prisma.exercise.update({
    where: { id: Number(id) },
    data: { videoUrls },
    include: {
      session: {
        include: {
          client: true,
          exercises: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  if (exercise.session.notionUrl) {
    await updateSessionNotionPage(exercise.session.notionUrl, {
      clientName: exercise.session.client.name,
      date: exercise.session.date,
      sessionType: exercise.session.sessionType,
      duration: exercise.session.duration,
      memo: exercise.session.memo,
      exercises: exercise.session.exercises.map((e) => ({
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight,
        unit: e.unit,
        memo: e.memo,
        videoUrls: e.videoUrls,
      })),
    });
  }

  return Response.json({ videoUrls: exercise.videoUrls });
}
