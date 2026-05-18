import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ScheduleForm from "@/components/ScheduleForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function EditSchedulePage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const schedule = await prisma.schedule.findUnique({
    where: { id: Number(id) },
    include: { client: true, location: true },
  });
  if (!schedule) notFound();

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/schedule" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft size={20} />
        </Link>
        <h2 className="text-xl font-bold text-gray-900">일정 수정</h2>
      </div>
      <ScheduleForm
        mode="edit"
        initial={{
          id: schedule.id,
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime ?? "",
          type: schedule.type,
          status: schedule.status,
          clientId: schedule.clientId,
          participants: schedule.participants,
          locationId: schedule.locationId,
          memo: schedule.memo ?? "",
        }}
      />
    </div>
  );
}
