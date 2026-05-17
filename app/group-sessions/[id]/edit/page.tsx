import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import GroupSessionEditForm from "@/components/GroupSessionEditForm";

export default async function EditGroupSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await prisma.groupSession.findUnique({
    where: { id: Number(id) },
    include: { exercises: { orderBy: { order: "asc" } } },
  });
  if (!session) notFound();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">그룹 수업 수정</h2>
      <GroupSessionEditForm session={JSON.parse(JSON.stringify(session))} />
    </div>
  );
}
