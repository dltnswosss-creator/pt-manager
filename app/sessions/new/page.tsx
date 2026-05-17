import { prisma } from "@/lib/prisma";
import SessionForm from "@/components/SessionForm";

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const clients = await prisma.client.findMany({ orderBy: { name: "asc" } });
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">1:1 수업 기록</h2>
      <SessionForm clients={JSON.parse(JSON.stringify(clients))} defaultClientId={clientId ? Number(clientId) : undefined} />
    </div>
  );
}
