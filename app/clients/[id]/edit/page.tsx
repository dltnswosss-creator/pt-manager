import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ClientForm from "@/components/ClientForm";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id: Number(id) } });
  if (!client) notFound();
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{client.name} 회원 수정</h2>
      <ClientForm defaultValues={JSON.parse(JSON.stringify(client))} clientId={client.id} />
    </div>
  );
}
