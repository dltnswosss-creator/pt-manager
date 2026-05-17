import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ClientDetail from "@/components/ClientDetail";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
  if (!client) notFound();
  return <ClientDetail client={JSON.parse(JSON.stringify(client))} />;
}
