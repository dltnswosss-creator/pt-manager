import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionNotionPage } from "@/lib/notion";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { exercises, ...sessionData } = body;

  const session = await prisma.session.create({
    data: {
      ...sessionData,
      exercises: exercises?.length
        ? { create: exercises.map((e: Record<string, unknown>, i: number) => ({ ...e, order: i })) }
        : undefined,
    },
    include: { exercises: true, client: true },
  });

  let notionUrl: string | null = null;
  if (process.env.NOTION_API_KEY && process.env.NOTION_PARENT_PAGE_ID) {
    try {
      notionUrl = await createSessionNotionPage({
        clientName: session.client.name,
        date: session.date,
        sessionType: session.sessionType,
        duration: session.duration,
        memo: session.memo,
        exercises: session.exercises.map((e) => ({
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          unit: e.unit,
          memo: e.memo,
          videoUrl: (e as Record<string, unknown>).videoUrl as string | null,
        })),
      });
      await prisma.session.update({
        where: { id: session.id },
        data: { notionUrl },
      });
    } catch (e) {
      console.error("Notion 생성 실패:", e);
    }
  }

  return Response.json({ ...session, notionUrl }, { status: 201 });
}
