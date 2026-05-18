"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Plus, Pencil, Trash2, Check, X } from "lucide-react";

type Location = {
  id: number;
  name: string;
  address: string | null;
  color: string;
  memo: string | null;
};

const PRESET_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#f43f5e",
  "#0ea5e9", "#8b5cf6", "#f97316", "#14b8a6",
];

const emptyForm = { name: "", address: "", color: "#6366f1", memo: "" };

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then(setLocations);
  }, []);

  function startEdit(loc: Location) {
    setEditingId(loc.id);
    setForm({ name: loc.name, address: loc.address ?? "", color: loc.color, memo: loc.memo ?? "" });
    setShowForm(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const created = await res.json();
      setLocations((prev) => [...prev, created]);
      setForm(emptyForm);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: number, e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/locations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const updated = await res.json();
      setLocations((prev) => prev.map((l) => (l.id === id ? updated : l)));
      cancelEdit();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("이 장소를 삭제하시겠습니까? 연결된 일정의 장소 정보가 초기화됩니다.")) return;
    await fetch(`/api/locations/${id}`, { method: "DELETE" });
    setLocations((prev) => prev.filter((l) => l.id !== id));
    if (editingId === id) cancelEdit();
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/schedule" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft size={20} />
          </Link>
          <h2 className="text-xl font-bold text-gray-900">장소 관리</h2>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); cancelEdit(); }}
            className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus size={15} />
            장소 추가
          </button>
        )}
      </div>

      {/* 추가 폼 */}
      {showForm && (
        <LocationFormCard
          form={form}
          setForm={setForm}
          onSubmit={handleCreate}
          onCancel={() => { setShowForm(false); setForm(emptyForm); }}
          saving={saving}
          submitLabel="추가"
        />
      )}

      {/* 장소 목록 */}
      <div className="space-y-3">
        {locations.length === 0 && !showForm && (
          <div className="text-center py-12 text-gray-400 text-sm">
            등록된 장소가 없습니다.
            <br />
            위 버튼으로 첫 장소를 추가해보세요.
          </div>
        )}

        {locations.map((loc) =>
          editingId === loc.id ? (
            <LocationFormCard
              key={loc.id}
              form={form}
              setForm={setForm}
              onSubmit={(e) => handleUpdate(loc.id, e)}
              onCancel={cancelEdit}
              saving={saving}
              submitLabel="저장"
            />
          ) : (
            <div
              key={loc.id}
              className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100"
            >
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ backgroundColor: loc.color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{loc.name}</p>
                {loc.address && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">{loc.address}</p>
                )}
                {loc.memo && (
                  <p className="text-xs text-gray-400 truncate">{loc.memo}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => startEdit(loc)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(loc.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function LocationFormCard({
  form,
  setForm,
  onSubmit,
  onCancel,
  saving,
  submitLabel,
}: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="p-4 bg-white rounded-xl border border-indigo-100 shadow-sm space-y-3"
    >
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">장소명 *</label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="예: 강남 헬스장"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">주소 (선택)</label>
        <input
          type="text"
          value={form.address}
          onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          placeholder="서울시 강남구 ..."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">색상</label>
        <div className="flex gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setForm((p) => ({ ...p, color: c }))}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
              style={{ backgroundColor: c }}
            >
              {form.color === c && <Check size={13} className="text-white" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">메모 (선택)</label>
        <input
          type="text"
          value={form.memo}
          onChange={(e) => setForm((p) => ({ ...p, memo: e.target.value }))}
          placeholder="주차 가능 등"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "저장 중..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </form>
  );
}
