import GroupSessionForm from "@/components/GroupSessionForm";

export default function NewGroupSessionPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">그룹 수업 기록</h2>
      <GroupSessionForm />
    </div>
  );
}
