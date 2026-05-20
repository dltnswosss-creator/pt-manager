"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { COMMON_EXERCISES } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Plus, Trash2, Video, CheckCircle, Loader2, X,
  Copy, ExternalLink, Check,
} from "lucide-react";

type ExerciseRow = {
  name: string; sets: string; reps: string; weight: string;
  unit: string; memo: string;
  videoUrl: string | null;
  videoUploading: boolean;
  videoFileName: string | null;
};

const emptyExercise = (): ExerciseRow => ({
  name: "", sets: "", reps: "", weight: "", unit: "kg", memo: "",
  videoUrl: null, videoUploading: false, videoFileName: null,
});

export default function GroupSessionForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantInput, setParticipantInput] = useState("");
  const [exercises, setExercises] = useState<ExerciseRow[]>([emptyExercise()]);
  const [suggestion, setSuggestion] = useState<{ idx: number; results: string[] } | null>(null);
  const [saved, setSaved] = useState(false);
  const [notionUrl, setNotionUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const videoInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const addParticipant = (name: string) => {
    const t = name.trim();
    if (t && !participants.includes(t)) setParticipants((p) => [...p, t]);
    setParticipantInput("");
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
      idx === i ? { ...e, videoUploading: true, videoFileName: file.name } : e
    ));
    try {
      // 1. 서버에서 signed upload URL 발급
      const res = await fetch("/api/upload/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "영상 업로드에 실패했습니다. 다시 시도해주세요.");
        setExercises((prev) => prev.map((e, idx) =>
          idx === i ? { ...e, videoUploading: false, videoFileName: null } : e
        ));
        return;
      }

      // 2. 브라우저에서 Supabase로 직접 업로드 (Next.js 경유 없음)
      const uploadForm = new FormData();
      uploadForm.append("cacheControl", "3600");
      uploadForm.append("file", file);
      const uploadRes = await fetch(data.signedUrl, { method: "PUT", body: uploadForm });
      if (!uploadRes.ok) {
        throw new Error(`upload ${uploadRes.status}`);
      }

      setExercises((prev) => prev.map((e, idx) =>
        idx === i ? { ...e, videoUploading: false, videoUrl: data.publicUrl } : e
      ));
    } catch {
      alert("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
      setExercises((prev) => prev.map((e, idx) =>
        idx === i ? { ...e, videoUploading: false, videoFileName: null } : e
      ));
    }
  };

  const clearVideo = (i: number) => {
    setExercises((prev) => prev.map((e, idx) =>
      idx === i ? { ...e, videoUrl: null, videoFileName: null } : e
    ));
    if (videoInputRefs.current[i]) videoInputRefs.current[i]!.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      date,
      title: title || null,
      memo: memo || null,
      participants,
      exercises: exercises
        .filter((e) => e.name.trim())
        .map((e) => ({
          name: e.name,
          sets: e.sets ? Number(e.sets) : null,
          reps: e.reps || null,
          weight: e.weight ? Number(e.weight) : null,
          unit: e.unit,
          memo: e.memo || null,
          videoUrl: e.videoUrl || null,
        })),
    };
    const res = await fetch("/api/group-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setNotionUrl(data.notionUrl ?? null);
      setSaved(true);
    }
    setLoading(false);
  };

  const copyNotion = async () => {
    if (!notionUrl) return;
    await navigator.clipboard.writeText(notionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-8">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle className="text-emerald-600" size={40} />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-xl font-bold text-gray-900">그룹 수업 기록 완료!</h3>
          {notionUrl && <p className="text-sm text-gray-500">Notion 일지가 자동으로 생성됐습니다.</p>}
        </div>
        {notionUrl && (
          <div className="w-full max-w-sm bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-medium text-gray-500">Notion 수업 일지 링크</p>
            <div className="flex gap-2">
              <button
                onClick={copyNotion}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? "복사됨!" : "링크 복사"}
              </button>
              <a href={notionUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center px-4 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        )}
        <button
          onClick={() => { router.push("/group-sessions"); router.refresh(); }}
          className="w-full max-w-sm py-3.5 border border-gray-200 rounded-2xl text-sm font-medium text-gray-600 text-center hover:bg-gray-50 transition-colors"
        >
          그룹 수업 목록으로 →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 max-w-2xl mx-auto lg:p-6">
      {/* 기본 정보 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">기본 정보</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">수업 날짜 *</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls()} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-500">수업 제목 (선택)</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls()} placeholder="예: OO기업 출강 1회차" />
          </div>
        </div>

        {/* 참여 회원 태그 */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-500">참여 회원 (이름 입력 후 Enter)</label>
          <div className="flex flex-wrap gap-1.5 min-h-[46px] px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-indigo-500 transition">
            {participants.map((name) => (
              <span key={name} className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1.5 rounded-full font-medium">
                {name}
                <button type="button" onClick={() => setParticipants((p) => p.filter((n) => n !== name))} className="hover:text-red-500 ml-0.5">×</button>
              </span>
            ))}
            <input
              value={participantInput}
              onChange={(e) => setParticipantInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addParticipant(participantInput); } }}
              onBlur={() => participantInput.trim() && addParticipant(participantInput)}
              className="flex-1 min-w-[120px] text-sm outline-none text-gray-900 placeholder-gray-300 bg-transparent"
              placeholder={participants.length === 0 ? "홍길동 입력 후 Enter" : "이름 추가..."}
            />
          </div>
        </div>
      </div>

      {/* 운동 목록 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">운동 목록</h3>
          <button type="button" onClick={() => setExercises((p) => [...p, emptyExercise()])}
            className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium py-1.5 px-3 rounded-lg hover:bg-indigo-50 active:bg-indigo-100 transition-colors">
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
                    className={inputCls()} placeholder="운동명 (예: 스쿼트)" />
                  {suggestion?.idx === i && (
                    <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                      {suggestion.results.map((r) => (
                        <button key={r} type="button"
                          onClick={() => { setEx(i, "name", r); setSuggestion(null); }}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-indigo-50 transition-colors">{r}</button>
                      ))}
                    </div>
                  )}
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

              <input value={ex.memo} onChange={(e) => setEx(i, "memo", e.target.value)}
                className={inputCls()} placeholder="메모 (선택)" />

              <div>
                <input ref={(el) => { videoInputRefs.current[i] = el; }} type="file" accept="video/*"
                  className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoSelect(i, f); }} />
                {ex.videoUrl ? (
                  <div className="flex items-center gap-2 py-1">
                    <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                    <span className="text-xs text-emerald-600 font-medium flex-1">영상 등록됨</span>
                    <button type="button" onClick={() => clearVideo(i)} className="p-1 text-gray-300 hover:text-red-400 transition-colors"><X size={14} /></button>
                  </div>
                ) : ex.videoUploading ? (
                  <div className="flex items-center gap-2 py-1">
                    <Loader2 size={15} className="animate-spin text-indigo-500 shrink-0" />
                    <span className="text-xs text-gray-400">업로드 중...</span>
                  </div>
                ) : (
                  <button type="button" onClick={() => videoInputRefs.current[i]?.click()}
                    className="flex items-center gap-2 py-2 px-3 w-full border border-dashed border-gray-200 rounded-lg text-xs text-gray-400 hover:text-indigo-600 hover:border-indigo-300 active:bg-indigo-50 transition-colors">
                    <Video size={14} />
                    영상 첨부 (카메라롤 또는 파일, 50MB 이하)
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 메모 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
        <label className="text-sm font-semibold text-gray-700">메모</label>
        <textarea value={memo} onChange={(e) => setMemo(e.target.value)}
          className={cn(inputCls(), "h-24 resize-none")}
          placeholder="수업 특이사항, 참가자 반응 등" />
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={() => router.back()}
          className="flex-1 py-3.5 border border-gray-200 rounded-2xl text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors">
          취소
        </button>
        <button type="submit" disabled={loading}
          className="flex-1 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-semibold hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              저장 중...
            </span>
          ) : "그룹 수업 저장"}
        </button>
      </div>
    </form>
  );
}

function inputCls() {
  return "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white";
}
