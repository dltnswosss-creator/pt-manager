"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, CheckCircle } from "lucide-react";

type Location = { id: number; name: string; color: string; address: string | null };
type Client = { id: number; name: string };

type ScheduleData = {
  id?: number;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  clientId: number | null;
  participants: string[];
  locationId: number | null;
  memo: string;
};

type Props = {
  initial?: Partial<ScheduleData>;
  mode: "create" | "edit";
};

const defaultForm = (): ScheduleData => ({
  date: new Date().toISOString().split("T")[0],
  startTime: "10:00",
  endTime: "11:00",
  type: "individual",
  status: "scheduled",
  clientId: null,
  participants: [],
  locationId: null,
  memo: "",
});

export default function ScheduleForm({ initial, mode }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<ScheduleData>({ ...defaultForm(), ...initial });
  const [locations, setLocations] = useState<Location[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [participantInput, setParticipantInput] = useState(
    initial?.participants?.join(", ") ?? ""
  );
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/locations").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
    ]).then(([locs, cls]) => {
      setLocations(locs);
      setClients(cls);
    });
  }, []);

  function set<K extends keyof ScheduleData>(key: K, value: ScheduleData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...form,
      participants:
        form.type === "group"
          ? participantInput
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      clientId: form.type === "individual" ? form.clientId : null,
    };

    try {
      if (mode === "create") {
        await fetch("/api/schedules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch(`/api/schedules/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      router.push("/schedule");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;
    await fetch(`/api/schedules/${form.id}`, { method: "DELETE" });
    router.push("/schedule");
    router.refresh();
  }

  async function handleComplete() {
    if (!confirm("수업을 완료 처리하고 기록을 생성하시겠습니까?")) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/schedules/${form.id}/complete`, { method: "POST" });
      const data = await res.json();
      router.push(data.redirect);
      router.refresh();
    } finally {
      setCompleting(false);
    }
  }

  async function handleCancel() {
    if (!confirm("이 일정을 취소 처리하시겠습니까?")) return;
    await fetch(`/api/schedules/${form.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    router.push("/schedule");
    router.refresh();
  }

  const isScheduled = form.status === "scheduled";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      {/* 날짜 + 시간 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">날짜</label>
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">시작 시간</label>
          <input
            type="time"
            required
            value={form.startTime}
            onChange={(e) => set("startTime", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">종료 시간</label>
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => set("endTime", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">수업 유형</label>
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="individual">1:1</option>
            <option value="group">그룹</option>
          </select>
        </div>
      </div>

      {/* 장소 */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">장소</label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => set("locationId", null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              form.locationId === null
                ? "bg-gray-800 text-white border-gray-800"
                : "border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            미지정
          </button>
          {locations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => set("locationId", loc.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                form.locationId === loc.id
                  ? "text-white border-transparent"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              style={
                form.locationId === loc.id
                  ? { backgroundColor: loc.color, borderColor: loc.color }
                  : {}
              }
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: loc.color }}
              />
              {loc.name}
            </button>
          ))}
        </div>
        {locations.length === 0 && (
          <p className="text-xs text-gray-400 mt-1">
            <a href="/schedule/locations" className="text-indigo-500 hover:underline">
              장소를 먼저 등록해주세요
            </a>
          </p>
        )}
      </div>

      {/* 회원 (1:1) or 참여자 (그룹) */}
      {form.type === "individual" ? (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">회원</label>
          <select
            value={form.clientId ?? ""}
            onChange={(e) => set("clientId", e.target.value ? Number(e.target.value) : null)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            <option value="">회원 선택</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            참여자{" "}
            <span className="text-gray-400 font-normal">(쉼표로 구분)</span>
          </label>
          <input
            type="text"
            value={participantInput}
            onChange={(e) => setParticipantInput(e.target.value)}
            placeholder="홍길동, 김철수, 이영희"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      )}

      {/* 메모 */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">메모</label>
        <textarea
          value={form.memo}
          onChange={(e) => set("memo", e.target.value)}
          rows={2}
          placeholder="특이사항, 준비물 등"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
        />
      </div>

      {/* 상태 표시 (수정 시) */}
      {mode === "edit" && !isScheduled && (
        <div
          className={`text-sm font-medium px-3 py-2 rounded-lg ${
            form.status === "completed"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {form.status === "completed" ? "완료된 일정" : "취소된 일정"}
        </div>
      )}

      {/* 버튼 */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "저장 중..." : mode === "create" ? "일정 등록" : "수정 저장"}
        </button>

        {mode === "edit" && isScheduled && (
          <>
            <button
              type="button"
              onClick={handleComplete}
              disabled={completing}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircle size={15} />
              완료
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2.5 border border-gray-200 text-gray-500 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </>
        )}

        {mode === "edit" && (
          <button
            type="button"
            onClick={handleDelete}
            className="p-2.5 border border-red-200 text-red-400 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => router.back()}
        className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors"
      >
        취소하고 돌아가기
      </button>
    </form>
  );
}
