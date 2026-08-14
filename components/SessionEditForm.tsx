"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { COMMON_EXERCISES } from "@/lib/types";
import { cn, uploadWithProgress } from "@/lib/utils";
import { maybeCompressVideo } from "@/lib/video";
import { Plus, Trash2, Loader2, Video, CheckCircle, X, ChevronUp, ChevronDown } from "lucide-react";

type ExerciseRow = {
  name: string; sets: string; reps: string; weight: string; unit: string; memo: string; isMain: boolean;
  videoUrls: string[]; videoUploading: boolean; videoProgress: number; videoStage: "compressing" | "uploading";
};
type Session = {
  id: number;
  clientId: number;
  date: string;
  duration: number | null;
  memo: string | null;
  exercises: { name: string; sets: number | null; reps: string | null; weight: number | null; unit: string; memo: string | null; isMain: boolean; videoUrls: string[] }[];
};

export default function SessionEditForm({ session }: { session: Session }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(session.date);
  const [duration, setDuration] = useState(session.duration?.toString() ?? "60");
  const [memo, setMemo] = useState(session.memo ?? "");
  const [exercises, setExercises] = useState<ExerciseRow[]>(
    session.exercises.length > 0
      ? session.exercises.map((e) => ({
          name: e.name, sets: e.sets?.toString() ?? "",
          reps: e.reps ?? "", weight: e.weight?.toString() ?? "",
          unit: e.unit, memo: e.memo ?? "", isMain: e.isMain ?? true,
          videoUrls: e.videoUrls ?? [], videoUploading: false, videoProgress: 0, videoStage: "uploading",
        }))
      : [{ name: "", sets: "", reps: "", weight: "", unit: "kg", memo: "", isMain: true, videoUrls: [], videoUploading: false, videoProgress: 0, videoStage: "uploading" as const }]
  );
  const [suggestion, setSuggestion] = useState<{ idx: number; results: string[] } | null>(null);
  const videoInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const moveExercise = (i: number, dir: -1 | 1) => {
    setExercises((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  };

  const setEx = (i: number, k: keyof ExerciseRow, v: string) => {
    setExercises((prev) => prev.map((e, idx) => (idx === i ? { ...e, [k]: v } : e)));
    if (k === "name") {
      const q = v.toLowerCase();
      const results = q ? COMMON_EXERCISES.filter((ex) => ex.toLowerCase().includes(q)).slice(0, 5) : [];
      setSuggestion(results.length ? { idx: i, results } : null);
    }
  };

  const handleVideoSelect = async (i: number, file: File) => {
    if (file.size > 200 * 1024 * 1024) {
      alert("영상은 200MB 이하만 업로드 가능합니다.");
      return;
    }
    setExercises((prev) => prev.map((e, idx) =>
      idx === i ? { ...e, videoUploading: true, videoProgress: 0, videoStage: "compressing" } : e
    ));
    try {
      const { blob, fileName } = await maybeCompressVideo(file);
      setExercises((prev) => prev.map((e, idx) => idx === i ? { ...e, videoStage: "uploading" } : e));
      const res = await fetch("/api/upload/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, fileSize: blob.size }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "영상 업로드에 실패했습니다.");
        setExercises((prev) => prev.map((e, idx) => idx === i ? { ...e, videoUploading: false } : e));
        return;
      }
      await uploadWithProgress(data.signedUrl, blob, (pct) => {
        setExercises((prev) => prev.map((e, idx) => idx === i ? { ...e, videoProgress: pct } : e));
      });
      setExercises((prev) => prev.map((e, idx) =>
        idx === i ? { ...e, videoUploading: false, videoUrls: [...e.videoUrls, data.publicUrl] } : e
      ));
    } catch (err) {
      const timedOut = err instanceof Error && err.message === "upload timed out";
      alert(timedOut
        ? "업로드가 너무 오래 걸려 취소했습니다. 네트워크 상태를 확인하고 다시 시도해주세요."
        : "영상 업로드에 실패했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.");
      setExercises((prev) => prev.map((e, idx) => idx === i ? { ...e, videoUploading: false } : e));
    }
    if (videoInputRefs.current[i]) videoInputRefs.current[i]!.value = "";
  };

  const toggleMain = (i: number) => {
    setExercises((prev) => prev.map((e, idx) => (idx === i ? { ...e, isMain: !e.isMain } : e)));
  };

  const removeVideo = (i: number, videoIdx: number) => {
    setExercises((prev) => prev.map((e, idx) =>
      idx === i ? { ...e, videoUrls: e.videoUrls.filter((_, vi) => vi !== videoIdx) } : e
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      date,
      duration: duration ? Number(duration) : null,
      memo: memo || null,
      exercises: exercises.filter((e) => e.name.trim()).map((e) => ({
        name: e.name,
        sets: e.sets ? Number(e.sets) : null,
        reps: e.reps || null,
        weight: e.weight ? Number(e.weight) : null,
        unit: e.unit,
        memo: e.memo || null,
        isMain: e.isMain,
        videoUrls: e.videoUrls,
      })),
    };
    const res = await fetch(`/api/sessions/${session.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      router.push(`/clients/${session.clientId}`);
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        const tag = (e.target as HTMLElement).tagName;
        if (e.key === "Enter" && tag !== "BUTTON" && tag !== "TEXTAREA") e.preventDefault();
      }}
      className="space-y-4 p-4 max-w-2xl mx-auto lg:p-6"
    >
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">기본 정보</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">수업 날짜 *</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls()} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">시간 (분)</label>
            <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className={inputCls()} placeholder="60" min={0} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">운동 목록</h3>
          <button
            type="button"
            onClick={() => setExercises((p) => [...p, { name: "", sets: "", reps: "", weight: "", unit: "kg", memo: "", isMain: true, videoUrls: [], videoUploading: false, videoProgress: 0, videoStage: "uploading" }])}
            className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium py-1.5 px-3 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <Plus size={14} /> 운동 추가
          </button>
        </div>
        <div className="space-y-3">
          {exercises.map((ex, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input value={ex.name} onChange={(e) => setEx(i, "name", e.target.value)}
                    onBlur={() => setTimeout(() => setSuggestion(null), 150)}
                    className={inputCls()} placeholder="운동명" />
                  {suggestion?.idx === i && (
                    <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                      {suggestion.results.map((r) => (
                        <button key={r} type="button"
                          onClick={() => { setEx(i, "name", r); setSuggestion(null); }}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-indigo-50">{r}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col shrink-0">
                  <button
                    type="button"
                    onClick={() => moveExercise(i, -1)}
                    disabled={i === 0}
                    className="p-0.5 text-gray-300 hover:text-indigo-500 active:text-indigo-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveExercise(i, 1)}
                    disabled={i === exercises.length - 1}
                    className="p-0.5 text-gray-300 hover:text-indigo-500 active:text-indigo-600 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                <button type="button" onClick={() => setExercises((p) => p.filter((_, idx) => idx !== i))}
                  className="p-2.5 text-gray-300 hover:text-red-400 transition-colors shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "세트", key: "sets" as const, type: "number", placeholder: "3" },
                  { label: "횟수", key: "reps" as const, type: "text", placeholder: "12" },
                  { label: "중량", key: "weight" as const, type: "number", placeholder: "60" },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key} className="space-y-1">
                    <p className="text-[10px] font-medium text-gray-400 text-center">{label}</p>
                    <input type={type} value={ex[key]} onChange={(e) => setEx(i, key, e.target.value)}
                      className={cn(inputCls(), "text-center px-1")} placeholder={placeholder}
                      min={type === "number" ? 0 : undefined}
                      step={key === "weight" ? 0.5 : undefined} />
                  </div>
                ))}
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-gray-400 text-center">단위</p>
                  <select value={ex.unit} onChange={(e) => setEx(i, "unit", e.target.value)}
                    className={cn(inputCls(), "text-center px-1")}>
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer w-fit">
                <input type="checkbox" checked={ex.isMain} onChange={() => toggleMain(i)} className="accent-indigo-600" />
                메인 운동 (월간 리포트에서 중량·세트·반복수 추적)
              </label>

              <input value={ex.memo} onChange={(e) => setEx(i, "memo", e.target.value)}
                className={inputCls()} placeholder="메모 (선택)" />

              {/* 영상 업로드 */}
              <div className="space-y-1.5">
                <input
                  ref={(el) => { videoInputRefs.current[i] = el; }}
                  type="file" accept="video/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoSelect(i, f); }}
                />
                {ex.videoUrls.map((url, vi) => (
                  <div key={url} className="flex items-center gap-2 py-1">
                    <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                    <span className="text-xs text-emerald-600 font-medium flex-1 truncate">영상 {vi + 1} 등록됨</span>
                    <button type="button" onClick={() => removeVideo(i, vi)} className="p-1 text-gray-300 hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {ex.videoUploading ? (
                  <div className="flex items-center gap-2 py-1">
                    <Loader2 size={15} className="animate-spin text-indigo-500 shrink-0" />
                    <span className="text-xs text-gray-400">
                      {ex.videoStage === "compressing" ? "영상 압축 중..." : `영상 업로드 중... ${ex.videoProgress}%`}
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => videoInputRefs.current[i]?.click()}
                    className="flex items-center gap-2 py-2 px-3 w-full border border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:text-indigo-600 hover:border-indigo-300 active:bg-indigo-50 transition-colors"
                  >
                    <Video size={14} />
                    {ex.videoUrls.length > 0 ? "영상 추가 첨부" : "영상 첨부 (카메라롤 또는 파일)"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
        <label className="text-sm font-semibold text-gray-700">특이사항 / 메모</label>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)}
          className={cn(inputCls(), "h-24 resize-none")}
          placeholder="수업 중 특이사항, 컨디션, 피드백 등" />
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()}
          className="flex-1 py-3.5 border border-gray-200 rounded-2xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          취소
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
          {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />저장 중...</span> : "수정 완료"}
        </button>
      </div>
    </form>
  );
}

function inputCls() {
  return "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white";
}
