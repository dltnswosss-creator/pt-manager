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
    <SessionForm clients={JSON.parse(JSON.stringify(clients))} defaultClientId={clientId ? Number(clientId) : undefined} />
  );
}
