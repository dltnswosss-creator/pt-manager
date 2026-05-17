"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BODY_AREAS, PAIN_INTENSITY_LABELS, PAIN_INTENSITY_COLORS, type PainArea } from "@/lib/types";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

type Props = {
  defaultValues?: Record<string, unknown>;
  clientId?: number;
};

export default function ClientForm({ defaultValues, clientId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: (defaultValues?.name as string) ?? "",
    gender: (defaultValues?.gender as string) ?? "male",
    birthDate: (defaultValues?.birthDate as string) ?? "",
    phone: (defaultValues?.phone as string) ?? "",
    email: (defaultValues?.email as string) ?? "",
    job: (defaultValues?.job as string) ?? "",
    startDate: (defaultValues?.startDate as string) ?? "",
    goal: (defaultValues?.goal as string) ?? "",
    exerciseLevel: (defaultValues?.exerciseLevel as string) ?? "",
    exerciseHistory: (defaultValues?.exerciseHistory as string) ?? "",
    medicalHistory: (defaultValues?.medicalHistory as string) ?? "",
    medications: (defaultValues?.medications as string) ?? "",
    mealCount: (defaultValues?.mealCount as number) ?? 3,
    mealPattern: (defaultValues?.mealPattern as string) ?? "",
    sleepHours: (defaultValues?.sleepHours as number) ?? 7,
    memo: (defaultValues?.memo as string) ?? "",
  });

  const [painAreas, setPainAreas] = useState<PainArea[]>(
    defaultValues?.painAreas ? JSON.parse(defaultValues.painAreas as string) : []
  );
  const [addingPain, setAddingPain] = useState({ area: "", intensity: "caution" as PainArea["intensity"] });

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const addPain = () => {
    if (!addingPain.area) return;
    setPainAreas((p) => [...p, { area: addingPain.area, intensity: addingPain.intensity }]);
    setAddingPain({ area: "", intensity: "caution" });
  };

  const removePain = (i: number) => setPainAreas((p) => p.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = { ...form, painAreas: JSON.stringify(painAreas) };
    const url = clientId ? `/api/clients/${clientId}` : "/api/clients";
    const method = clientId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      const data = await res.json();
      router.push(`/clients/${clientId ?? data.id}`);
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 기본 정보 */}
      <Section title="기본 정보">
        <div className="grid grid-cols-2 gap-4">
          <Field label="이름 *">
            <input required value={form.name} onChange={(e) => set("name", e.target.value)} className={input()} placeholder="홍길동" />
          </Field>
          <Field label="성별 *">
            <div className="flex gap-2">
              {["male", "female"].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set("gender", g)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium border transition-colors",
                    form.gender === g ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                  )}
                >
                  {g === "male" ? "남성" : "여성"}
                </button>
              ))}
            </div>
          </Field>
          <Field label="생년월일">
            <input type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} className={input()} />
          </Field>
          <Field label="연락처">
            <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={input()} placeholder="010-0000-0000" />
          </Field>
          <Field label="직업">
            <input value={form.job} onChange={(e) => set("job", e.target.value)} className={input()} placeholder="회사원" />
          </Field>
          <Field label="PT 시작일">
            <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className={input()} />
          </Field>
        </div>
        <Field label="목표">
          <textarea value={form.goal} onChange={(e) => set("goal", e.target.value)} className={input("h-20 resize-none")} placeholder="체중 감량, 근력 향상 등" />
        </Field>
      </Section>

      {/* 운동 경험 */}
      <Section title="운동 경험">
        <Field label="운동 레벨">
          <div className="flex gap-2 flex-wrap">
            {[
              { v: "none", l: "없음" },
              { v: "beginner", l: "초보" },
              { v: "intermediate", l: "중급" },
              { v: "advanced", l: "상급" },
            ].map(({ v, l }) => (
              <button
                key={v}
                type="button"
                onClick={() => set("exerciseLevel", v)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                  form.exerciseLevel === v ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="운동 경력 및 경험">
          <textarea value={form.exerciseHistory} onChange={(e) => set("exerciseHistory", e.target.value)} className={input("h-20 resize-none")} placeholder="헬스 2년, 수영 경험 있음 등" />
        </Field>
      </Section>

      {/* 병력 / 통증 */}
      <Section title="병력 / 통증">
        <Field label="병력 및 수술 이력">
          <textarea value={form.medicalHistory} onChange={(e) => set("medicalHistory", e.target.value)} className={input("h-20 resize-none")} placeholder="고혈압, 무릎 수술 이력 등" />
        </Field>
        <Field label="복용 약물">
          <input value={form.medications} onChange={(e) => set("medications", e.target.value)} className={input()} placeholder="혈압약 등" />
        </Field>
        <Field label="통증 부위">
          <div className="space-y-2">
            <div className="flex gap-2">
              <select
                value={addingPain.area}
                onChange={(e) => setAddingPain((a) => ({ ...a, area: e.target.value }))}
                className={cn(input(), "flex-1")}
              >
                <option value="">부위 선택</option>
                {BODY_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <select
                value={addingPain.intensity}
                onChange={(e) => setAddingPain((a) => ({ ...a, intensity: e.target.value as PainArea["intensity"] }))}
                className={cn(input(), "w-24")}
              >
                {Object.entries(PAIN_INTENSITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button type="button" onClick={addPain} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                추가
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {painAreas.map((p, i) => (
                <span key={i} className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border", PAIN_INTENSITY_COLORS[p.intensity])}>
                  {p.area} · {PAIN_INTENSITY_LABELS[p.intensity]}
                  <button type="button" onClick={() => removePain(i)} className="opacity-60 hover:opacity-100">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </Field>
      </Section>

      {/* 생활 습관 */}
      <Section title="생활 습관">
        <div className="grid grid-cols-2 gap-4">
          <Field label={`하루 식사 횟수: ${form.mealCount}회`}>
            <input type="range" min={1} max={6} value={form.mealCount} onChange={(e) => set("mealCount", Number(e.target.value))} className="w-full accent-indigo-600" />
          </Field>
          <Field label={`수면 시간: ${form.sleepHours}시간`}>
            <input type="range" min={3} max={12} step={0.5} value={form.sleepHours} onChange={(e) => set("sleepHours", Number(e.target.value))} className="w-full accent-indigo-600" />
          </Field>
        </div>
        <Field label="식사 패턴 메모">
          <textarea value={form.mealPattern} onChange={(e) => set("mealPattern", e.target.value)} className={input("h-20 resize-none")} placeholder="고단백 식사, 야식 자주 먹음 등" />
        </Field>
      </Section>

      {/* 메모 */}
      <Section title="메모">
        <textarea value={form.memo} onChange={(e) => set("memo", e.target.value)} className={input("h-24 resize-none")} placeholder="기타 특이사항" />
      </Section>

      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()} className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          취소
        </button>
        <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {loading ? "저장 중..." : clientId ? "수정 완료" : "회원 추가"}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-gray-500">{label}</label>
      {children}
    </div>
  );
}

function input(extra = "") {
  return cn("w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition", extra);
}
