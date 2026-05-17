import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SessionEditForm from "@/components/SessionEditForm";

export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await prisma.session.findUnique({
    where: { id: Number(id) },
    include: { exercises: { orderBy: { order: "asc" } }, client: true },
  });
  if (!session) notFound();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">수업 기록 수정</h2>
      <p className="text-sm text-gray-500 mb-6">{session.client.name} 회원</p>
      <SessionEditForm session={JSON.parse(JSON.stringify(session))} />
    </div>
  );
}
