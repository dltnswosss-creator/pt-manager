import ScheduleForm from "@/components/ScheduleForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function NewSchedulePage() {
  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/schedule" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <ChevronLeft size={20} />
        </Link>
        <h2 className="text-xl font-bold text-gray-900">일정 추가</h2>
      </div>
      <ScheduleForm mode="create" />
    </div>
  );
}
