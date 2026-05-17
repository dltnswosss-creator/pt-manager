import ClientForm from "@/components/ClientForm";

export default function NewClientPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">회원 추가</h2>
      <ClientForm />
    </div>
  );
}
