"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { COMMON_EXERCISES, BODY_PART_ORDER, BODY_PART_LABELS, type BodyPart, type SessionAnalysis } from "@/lib/types";
import { cn, uploadWithProgress, todayLocal } from "@/lib/utils";
import { maybeCompressVideo } from "@/lib/video";
import { parseQuickInputWithFeedback } from "@/lib/quickInput";
import NumberStepper from "@/components/NumberStepper";
import { AI_HANDOFF_KEY, recordingKey } from "@/lib/sessionRecording";
import {
  Plus, Trash2, Video, CheckCircle, Loader2, X,
  Check, ChevronUp, ChevronDown, ChevronLeft, ClipboardPaste, Mic,
} from "lucide-react";

type ExerciseRow = {
  name: string; sets: string; reps: string; weight: string;
  unit: string; memo: string; isMain: boolean;
  bodyParts: string[];
  videoUrls: string[];
  videoUploading: boolean;
  videoProgress: number;
  videoStage: "compressing" | "uploading";
  expanded: boolean;
};
type Client = { id: number; name: string };
type ClientHistoryEntry = { name: string; sets: string; reps: string; weight: string; unit: string; bodyParts: string[]; lastDate: string };
type SuggestionItem = { name: string; fromHistory: boolean } & Partial<Omit<ClientHistoryEntry, "name">>;

const hasSecondaryData = (e: { bodyParts: string[]; memo: string; videoUrls: string[] }) =>
  e.bodyParts.length > 0 || e.memo.trim() !== "" || e.videoUrls.length > 0;

const formatShortMD = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const emptyExercise = (): ExerciseRow => ({
  name: "", sets: "", reps: "", weight: "", unit: "kg", memo: "", isMain: true,
  bodyParts: [],
  videoUrls: [], videoUploading: false, videoProgress: 0, videoStage: "uploading",
  expanded: false,
});

// 녹음 분석 결과(AI) → 운동 카드
const rowsFromAnalysis = (result: SessionAnalysis): ExerciseRow[] =>
  result.exercises.map((e) => {
    const merged: ExerciseRow = {
      ...emptyExercise(),
      name: e.name,
      sets: e.sets != null ? String(e.sets) : "",
      reps: e.reps ?? "",
      weight: e.weight != null ? String(e.weight) : "",
      unit: e.unit,
      memo: e.memo ?? "",
      isMain: e.isMain,
      bodyParts: e.bodyParts.filter((p): p is BodyPart => (BODY_PART_ORDER as string[]).includes(p)),
    };
    return { ...merged, expanded: hasSecondaryData(merged) };
  });

// 녹음 분석 결과(AI) → 특이사항 메모 (빠른 입력과 같은 형식)
const memoFromAnalysis = (result: SessionAnalysis): string => {
  const sections: string[] = [];
  if (result.workoutFeedback?.trim()) sections.push(`💪 운동 피드백\n${result.workoutFeedback.trim()}`);
  if (result.lifestyleFeedback?.trim()) sections.push(`🍎 영양&생활습관 피드백\n${result.lifestyleFeedback.trim()}`);
  return sections.join("\n\n");
};

export default function SessionForm({
  clients,
  defaultClientId,
}: {
  clients: Client[];
  defaultClientId?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState<number | "">(defaultClientId ?? "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [duration, setDuration] = useState("60");
  const [memo, setMemo] = useState("");
  const [transcript, setTranscript] = useState("");
  // 이 기록의 녹음 문장이 보관된 회원 (저장하면 그 녹음 문장을 지움). 녹음과 무관하면 undefined
  const [recordingSource, setRecordingSource] = useState<number | "" | undefined>(undefined);
  const [exercises, setExercises] = useState<ExerciseRow[]>([emptyExercise()]);
  const [suggestion, setSuggestion] = useState<{ idx: number; results: SuggestionItem[] } | null>(null);
  const [clientHistory, setClientHistory] = useState<Map<string, ClientHistoryEntry>>(new Map());
  const [saved, setSaved] = useState(false);
  const [notionUrl, setNotionUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);
  // AI가 채운 기록은 먼저 요약("이렇게 기록할게요")으로 보여주고, 고칠 때만 전체 양식을 연다
  const [editFull, setEditFull] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [quickInputOpen, setQuickInputOpen] = useState(false);
  const [quickInputText, setQuickInputText] = useState("");
  const [quickInputFeedback, setQuickInputFeedback] = useState<string | null>(null);
  const videoInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const draftLoadedRef = useRef(false);

  const draftKey = `pt-manager:session-draft:${defaultClientId ?? "general"}`;

  // 임시 저장된 작성 중인 기록 복원 (녹음 화면에서 AI가 작성해 넘긴 결과가 있으면 그걸 우선 적용)
  useEffect(() => {
    // 개발 모드(StrictMode)에서 effect가 두 번 실행돼도 복원은 한 번만
    // (두 번째 실행 때는 AI 결과가 이미 지워졌고, 임시 저장도 초기값으로 덮어써진 뒤라 결과가 사라짐)
    if (draftLoadedRef.current) return;
    // 서버(UTC)에서 렌더링한 초기 날짜를 브라우저 기준 오늘로 맞춘다 (임시 저장된 날짜가 있으면 아래에서 덮어씀)
    setDate(todayLocal());
    let handoff: { clientId: number | null; recordingClientId?: number | null; transcript: string; analysis: SessionAnalysis } | null = null;
    try {
      const rawHandoff = localStorage.getItem(AI_HANDOFF_KEY);
      if (rawHandoff) {
        localStorage.removeItem(AI_HANDOFF_KEY);
        handoff = JSON.parse(rawHandoff);
      }
    } catch {}

    try {
      const raw = localStorage.getItem(draftKey);
      const draft = raw ? JSON.parse(raw) : null;
      const draftHasContent = !!draft && (
        !!draft.memo?.trim() ||
        (Array.isArray(draft.exercises) && draft.exercises.some((e: Partial<ExerciseRow>) => e.name?.trim()))
      );

      if (handoff && (!draftHasContent || confirm("작성 중이던 수업 기록이 있어요. 녹음으로 AI가 작성한 내용으로 바꿀까요?"))) {
        if (handoff.clientId) setClientId(handoff.clientId);
        else if (draft?.clientId !== undefined) setClientId(draft.clientId);
        setTranscript(handoff.transcript);
        setRecordingSource(handoff.recordingClientId ?? "");
        const rows = rowsFromAnalysis(handoff.analysis);
        setExercises(rows.length ? rows : [emptyExercise()]);
        setMemo(memoFromAnalysis(handoff.analysis));
        setAiFilled(true);
      } else if (draft) {
        if (draft.clientId !== undefined) setClientId(draft.clientId);
        if (draft.date) setDate(draft.date);
        if (draft.duration !== undefined) setDuration(draft.duration);
        if (draft.memo !== undefined) setMemo(draft.memo);
        if (typeof draft.transcript === "string") setTranscript(draft.transcript);
        if (draft.recordingSource !== undefined) setRecordingSource(draft.recordingSource);
        if (Array.isArray(draft.exercises) && draft.exercises.length) {
          setExercises(draft.exercises.map((e: Partial<ExerciseRow> & { videoUrl?: string | null }) => {
            const merged = {
              ...emptyExercise(), ...e,
              videoUrls: Array.isArray(e.videoUrls) ? e.videoUrls : (e.videoUrl ? [e.videoUrl] : []),
              videoUploading: false,
              videoProgress: 0,
              videoStage: "uploading" as const,
            };
            return { ...merged, expanded: hasSecondaryData(merged) };
          }));
        }
        setDraftRestored(true);
      }
    } catch {}
    draftLoadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 작성 중인 내용을 자동 저장 (입력된 내용이 없으면 저장하지 않음)
  useEffect(() => {
    if (!draftLoadedRef.current || saved) return;
    const isEmpty = !clientId && !memo.trim() && !transcript.trim() &&
      exercises.every((e) => !e.name.trim() && !e.sets && !e.reps && !e.weight && !e.memo.trim() && e.videoUrls.length === 0);
    try {
      if (isEmpty) {
        localStorage.removeItem(draftKey);
      } else {
        // 녹음 전사본도 함께 저장해 두어, 녹음 중 페이지가 새로고침되거나 브라우저가 꺼져도 복구할 수 있게 한다
        localStorage.setItem(draftKey, JSON.stringify({ clientId, date, duration, memo, transcript, recordingSource, exercises }));
      }
    } catch {}
  }, [draftKey, clientId, date, duration, memo, transcript, recordingSource, exercises, saved]);

  // 저장 완료 시 임시 기록 삭제
  useEffect(() => {
    if (saved) {
      try { localStorage.removeItem(draftKey); } catch {}
    }
  }, [saved, draftKey]);

  const discardDraft = () => {
    try { localStorage.removeItem(draftKey); } catch {}
    setClientId(defaultClientId ?? "");
    setDate(todayLocal());
    setDuration("60");
    setMemo("");
    setTranscript("");
    setRecordingSource(undefined);
    setExercises([emptyExercise()]);
    setDraftRestored(false);
    setAiFilled(false);
    setEditFull(false);
  };

  const moveExercise = (i: number, dir: -1 | 1) => {
    setExercises((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  };

  // 회원별 운동 히스토리: 운동명 자동완성에 "예전에 한 운동"을 띄워주기 위해 수집
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!clientId) {
        if (!cancelled) setClientHistory(new Map());
        return;
      }
      try {
        const res = await fetch(`/api/clients/${clientId}`);
        const data = await res.json();
        if (cancelled) return;
        const map = new Map<string, ClientHistoryEntry>();
        const sessions = Array.isArray(data.sessions) ? data.sessions : [];
        for (const s of sessions) {
          for (const e of s.exercises ?? []) {
            if (map.has(e.name)) continue;
            map.set(e.name, {
              name: e.name,
              sets: e.sets != null ? String(e.sets) : "",
              reps: e.reps ?? "",
              weight: e.weight != null ? String(e.weight) : "",
              unit: e.unit ?? "kg",
              bodyParts: e.bodyParts ?? [],
              lastDate: s.date,
            });
          }
        }
        setClientHistory(map);
      } catch {
        if (!cancelled) setClientHistory(new Map());
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  const buildSuggestions = (query: string): SuggestionItem[] => {
    const q = query.toLowerCase();
    const historyNames = Array.from(clientHistory.keys());
    const historyMatches = (q ? historyNames.filter((n) => n.toLowerCase().includes(q)) : historyNames).slice(0, 6);
    const historySet = new Set(historyMatches);
    const commonMatches = q
      ? COMMON_EXERCISES.filter((ex) => ex.toLowerCase().includes(q) && !historySet.has(ex)).slice(0, 5)
      : [];
    const results: SuggestionItem[] = [
      ...historyMatches.map((n) => ({ name: n, fromHistory: true, ...clientHistory.get(n) })),
      ...commonMatches.map((n) => ({ name: n, fromHistory: false })),
    ];
    return results.slice(0, 8);
  };

  // 파싱된 운동은 기존 카드 목록 뒤에 이어붙이고, 피드백은 특이사항 메모에 반영한다 (성공 시 true)
  const applyQuickInputText = (text: string) => {
    const parsed = parseQuickInputWithFeedback(text, COMMON_EXERCISES);
    if (parsed.exercises.length === 0 && !parsed.feedback) return false;

    if (parsed.exercises.length > 0) {
      const newRows: ExerciseRow[] = parsed.exercises.map((p) => {
        const merged = { ...emptyExercise(), ...p };
        return { ...merged, expanded: hasSecondaryData(merged) };
      });
      setExercises((prev) => {
        const kept = prev.filter((e) =>
          e.name.trim() || e.sets || e.reps || e.weight || e.memo.trim() || e.videoUrls.length > 0
        );
        return [...kept, ...newRows];
      });
    }

    if (parsed.feedback) {
      setMemo((prev) => (prev.trim() ? `${prev.trim()}\n\n${parsed.feedback}` : parsed.feedback));
    }

    setQuickInputText("");
    setQuickInputOpen(false);
    const parts: string[] = [];
    if (parsed.exercises.length > 0) parts.push(`${parsed.exercises.length}개 운동`);
    if (parsed.feedback) parts.push("피드백");
    setQuickInputFeedback(`${parts.join(" + ")}을 추가했어요`);
    setTimeout(() => setQuickInputFeedback(null), 2500);
    return true;
  };

  const applyQuickInput = () => {
    if (!applyQuickInputText(quickInputText)) {
      alert("인식된 내용이 없어요. 형식을 확인해주세요.\n예) 스쿼트 / 10kg / 10reps");
    }
  };

  // 붙여넣는 즉시 자동으로 운동 목록에 반영 (적용 버튼 클릭 불필요)
  const handleQuickInputPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData("text");
    if (!text.trim()) return;
    e.preventDefault();
    if (!applyQuickInputText(text)) {
      setQuickInputText(text);
    }
  };

  const setEx = (i: number, k: keyof ExerciseRow, v: string) => {
    setExercises((prev) => prev.map((e, idx) => (idx === i ? { ...e, [k]: v } : e)));
    if (k === "name") {
      const results = buildSuggestions(v);
      setSuggestion(results.length ? { idx: i, results } : null);
    }
  };

  const focusNameSuggestions = (i: number, currentName: string) => {
    const results = buildSuggestions(currentName);
    if (results.length) setSuggestion({ idx: i, results });
  };

  const applySuggestion = (i: number, item: SuggestionItem) => {
    setExercises((prev) => prev.map((e, idx) => {
      if (idx !== i) return e;
      if (!item.fromHistory) return { ...e, name: item.name };
      const next = {
        ...e,
        name: item.name,
        sets: item.sets ?? e.sets,
        reps: item.reps ?? e.reps,
        weight: item.weight ?? e.weight,
        unit: item.unit ?? e.unit,
        bodyParts: item.bodyParts ?? e.bodyParts,
      };
      return { ...next, expanded: next.expanded || hasSecondaryData(next) };
    }));
    setSuggestion(null);
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

  const toggleExpanded = (i: number) => {
    setExercises((prev) => prev.map((e, idx) => (idx === i ? { ...e, expanded: !e.expanded } : e)));
  };

  const toggleBodyPart = (i: number, part: BodyPart) => {
    setExercises((prev) => prev.map((e, idx) => (idx === i ? {
      ...e,
      bodyParts: e.bodyParts.includes(part) ? e.bodyParts.filter((p) => p !== part) : [...e.bodyParts, part],
    } : e)));
  };

  const removeVideo = (i: number, videoIdx: number) => {
    setExercises((prev) => prev.map((e, idx) =>
      idx === i ? { ...e, videoUrls: e.videoUrls.filter((_, vi) => vi !== videoIdx) } : e
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setLoading(true);
    const payload = {
      clientId: Number(clientId),
      date,
      sessionType: "individual",
      duration: duration ? Number(duration) : null,
      memo: memo || null,
      transcript: transcript.trim() || null,
      exercises: exercises
        .filter((e) => e.name.trim())
        .map((e) => ({
          name: e.name,
          sets: e.sets ? Number(e.sets) : null,
          reps: e.reps || null,
          weight: e.weight ? Number(e.weight) : null,
          unit: e.unit,
          memo: e.memo || null,
          isMain: e.isMain,
          bodyParts: e.bodyParts,
          videoUrls: e.videoUrls,
        })),
    };
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      setNotionUrl(data.notionUrl ?? null);
      setSaved(true);
      // 녹음 화면에 보관된 그 회원의 문장들도 이 기록으로 확정됐으므로 비운다
      if (recordingSource !== undefined) {
        try { localStorage.removeItem(recordingKey(recordingSource)); } catch {}
      }
    }
    setLoading(false);
  };

  const copyNotion = async () => {
    if (!notionUrl) return;
    await navigator.clipboard.writeText(notionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clientName = clients.find((c) => c.id === clientId)?.name;
  const filledExercises = exercises.filter((e) => e.name.trim());

  // 저장 완료 화면
  if (saved) {
    return (
      <div className="max-w-2xl mx-auto min-h-full flex flex-col px-5">
        <div className="flex-1 flex flex-col items-center justify-center gap-6 py-16 text-center">
          <span className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center">
            <Check size={36} strokeWidth={2.4} className="text-indigo-600" />
          </span>
          <div className="space-y-2">
            <h1 className="text-[28px] leading-snug font-bold text-gray-900">기록을 저장했어요</h1>
            <p className="text-[15px] text-gray-500">
              {clientName ? `${clientName} 님 · ` : ""}운동 {filledExercises.length}개
            </p>
          </div>
          {notionUrl && (
            <div className="self-stretch mt-2 rounded-2xl bg-gray-50 px-5 py-4 flex items-center gap-3 text-left">
              <a href={notionUrl} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-gray-900">노션 일지</p>
                <p className="text-[13px] text-gray-500 truncate">{date.slice(5).replace("-", "월 ")}일 {clientName ?? ""} 수업 일지</p>
              </a>
              <button
                type="button"
                onClick={copyNotion}
                className="press h-9 px-3 rounded-[10px] bg-indigo-50 text-[13px] font-semibold text-indigo-600 shrink-0"
              >
                {copied ? "복사했어요" : "링크 복사"}
              </button>
            </div>
          )}
        </div>
        <div className="pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-1">
          <Link href="/" className="press h-14 rounded-2xl bg-indigo-600 active:bg-indigo-700 text-white text-[17px] font-semibold flex items-center justify-center">
            확인
          </Link>
          {clientId && (
            <Link href={`/clients/${clientId}`} className="h-12 flex items-center justify-center text-[15px] font-medium text-gray-700">
              회원 정보 보기
            </Link>
          )}
        </div>
      </div>
    );
  }

  // AI가 녹음으로 채운 기록: 요약으로 확인하고 바로 저장
  if (aiFilled && !editFull) {
    return (
      <div className="max-w-2xl mx-auto">
        <header className="sticky top-0 z-10 bg-white h-14 px-2 flex items-center justify-between">
          <Link
            href={clientId ? `/sessions/record?clientId=${clientId}` : "/sessions/record"}
            aria-label="녹음으로 돌아가기"
            className="w-11 h-11 flex items-center justify-center text-gray-900"
          >
            <ChevronLeft size={26} strokeWidth={2} />
          </Link>
          <button type="button" onClick={() => setEditFull(true)} className="press h-11 px-3 text-[17px] font-semibold text-gray-700">
            수정
          </button>
        </header>

        <div className="px-5 pt-2 space-y-2">
          <h1 className="text-[28px] leading-snug font-bold text-gray-900">이렇게 기록할게요</h1>
          <div className="flex items-center flex-wrap gap-2 text-[15px] text-gray-500">
            <span>
              {clientName ? `${clientName} 님 · ` : ""}
              {Number(date.slice(5, 7))}월 {Number(date.slice(8, 10))}일
              {duration ? ` · ${duration}분` : ""}
            </span>
            {!clientId && (
              <span className="press relative h-8 px-2.5 rounded-lg bg-indigo-50 text-[13px] font-semibold text-indigo-600 flex items-center">
                회원 선택
                <select
                  aria-label="회원 선택"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : "")}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                >
                  <option value="">회원 선택</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </span>
            )}
          </div>
        </div>

        <section className="mx-5 mt-6 rounded-[20px] bg-gray-50 px-5 py-2">
          {filledExercises.length === 0 && (
            <p className="py-4 text-[15px] text-gray-500">녹음에서 운동을 찾지 못했어요</p>
          )}
          {filledExercises.map((e, i) => {
            const sub = [
              e.sets && `${e.sets}세트`,
              e.reps && (/^\d+$/.test(e.reps) ? `${e.reps}회` : e.reps),
              e.memo.trim(),
            ].filter(Boolean).join(" · ");
            return (
              <button key={i} type="button" onClick={() => setEditFull(true)} className="press w-full flex items-center gap-3 py-3.5 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-semibold text-gray-900">{e.name}</span>
                  {sub && <span className="block text-[13px] text-gray-500 truncate">{sub}</span>}
                </span>
                {e.weight && (
                  <span className="text-xl font-bold text-gray-900 shrink-0">
                    {e.weight}<span className="ml-0.5 text-[13px] font-medium text-gray-700">{e.unit}</span>
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => { setExercises((p) => [...p.filter((x) => x.name.trim()), emptyExercise()]); setEditFull(true); }}
            className="press flex items-center gap-1.5 py-3.5 text-[15px] font-semibold text-indigo-600"
          >
            <Plus size={18} strokeWidth={2} /> 운동 추가
          </button>
        </section>

        {memo.trim() && (
          <section className="px-5 pt-8 space-y-2.5">
            <h2 className="text-xl font-bold text-gray-900">피드백</h2>
            <button type="button" onClick={() => setEditFull(true)} className="block w-full text-left space-y-1">
              {/* 메모의 "💪 운동 피드백" 같은 구분 줄은 화면에서만 이모지 없이 작은 제목으로 보여준다 (저장 내용은 그대로) */}
              {memo.trim().split("\n").map((line, i) => {
                const heading = line.match(/^\s*(?:💪|🍎)\s*(.+피드백)\s*$/);
                return heading ? (
                  <span key={i} className={cn("block text-[13px] font-semibold text-gray-500", i > 0 && "pt-3")}>{heading[1]}</span>
                ) : (
                  <span key={i} className="block text-[17px] leading-relaxed text-gray-800 break-keep min-h-[1em]">{line}</span>
                );
              })}
            </button>
          </section>
        )}

        <div className="h-32" />
        <div className="fixed left-0 right-0 lg:left-60 bottom-0 z-20 bg-white px-5 pt-3 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <div className="max-w-2xl mx-auto">
            <button
              type="button"
              onClick={(ev) => handleSubmit(ev as unknown as React.FormEvent)}
              disabled={loading || !clientId}
              className="press w-full h-14 rounded-2xl bg-indigo-600 active:bg-indigo-700 text-white text-[17px] font-semibold disabled:bg-gray-200 disabled:text-gray-400 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? "저장하고 있어요" : !clientId ? "회원을 선택해 주세요" : "저장하기"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        // 모바일 키보드 "완료/이동"(Enter)으로 인한 의도치 않은 저장 방지
        // textarea와 button은 그대로 동작, 나머지 input에서 Enter 차단
        const tag = (e.target as HTMLElement).tagName;
        if (e.key === "Enter" && tag !== "BUTTON" && tag !== "TEXTAREA") {
          e.preventDefault();
        }
      }}
      className="space-y-4 px-5 pb-36 max-w-2xl mx-auto"
    >
      <header className="sticky top-0 z-10 -mx-5 bg-white h-14 px-2 flex items-center">
        <button
          type="button"
          onClick={() => (aiFilled ? setEditFull(false) : router.back())}
          aria-label="뒤로"
          className="w-11 h-11 flex items-center justify-center text-gray-900"
        >
          <ChevronLeft size={26} strokeWidth={2} />
        </button>
      </header>
      <h1 className="text-[28px] leading-snug font-bold text-gray-900 pt-1 pb-2">
        {aiFilled ? "기록 수정" : "수업 기록"}
      </h1>

      {draftRestored && !aiFilled && (
        <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-2xl px-4 py-3.5 text-[13px] text-gray-700">
          <span>작성하던 기록을 불러왔어요</span>
          <button type="button" onClick={discardDraft} className="font-semibold text-indigo-600 shrink-0">
            새로 쓰기
          </button>
        </div>
      )}

      {/* 기본 정보 */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">기본 정보</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5 sm:col-span-1">
            <label className="text-xs font-medium text-gray-500">회원 *</label>
            <select
              required
              value={clientId}
              onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : "")}
              className={inputCls()}
            >
              <option value="">회원 선택</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
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

      {/* 운동 목록 */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-y-2">
          <h3 className="text-sm font-semibold text-gray-700">운동 목록</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setQuickInputOpen((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 text-xs font-medium py-1.5 px-3 rounded-lg transition-colors",
                quickInputOpen ? "text-indigo-600 bg-indigo-50" : "text-gray-500 hover:bg-gray-100 active:bg-gray-200"
              )}
            >
              <ClipboardPaste size={14} /> 빠른 입력
            </button>
            <button
              type="button"
              onClick={() => setExercises((p) => [...p, emptyExercise()])}
              className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium py-1.5 px-3 rounded-lg hover:bg-indigo-50 active:bg-indigo-100 transition-colors"
            >
              <Plus size={14} /> 운동 추가
            </button>
          </div>
        </div>

        {quickInputFeedback && (
          <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle size={12} /> {quickInputFeedback}
          </p>
        )}

        {quickInputOpen && (
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 space-y-2">
            <p className="text-xs text-indigo-600">운동과 피드백까지 전체를 복사해서 붙여넣으면 바로 전부 반영돼요.</p>
            <textarea
              value={quickInputText}
              onChange={(e) => setQuickInputText(e.target.value)}
              onPaste={handleQuickInputPaste}
              className="w-full h-40 px-3 py-2.5 border border-indigo-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white resize-none"
              placeholder={
                "스쿼트 / 10kg / 10reps\n데드리프트 / 15kg / 10reps\n\n✅운동 피드백\n오늘 컨디션 좋아서 중량 조금 올림\n\n✅영양&생활습관 피드백\n수면 시간 늘리기로 함"
              }
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setQuickInputOpen(false); setQuickInputText(""); }}
                className="text-xs text-gray-500 font-medium py-2 px-3 rounded-lg hover:bg-white transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={applyQuickInput}
                disabled={!quickInputText.trim()}
                className="text-xs text-white font-medium py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                운동 목록에 적용
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {exercises.map((ex, i) => (
            <div key={i} className="bg-white rounded-xl p-3 space-y-3">
              {/* 운동명 + 삭제 */}
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    value={ex.name}
                    onChange={(e) => setEx(i, "name", e.target.value)}
                    onFocus={() => focusNameSuggestions(i, ex.name)}
                    onBlur={() => setTimeout(() => setSuggestion(null), 150)}
                    className={inputCls()}
                    placeholder="운동명 (예: 스쿼트)"
                  />
                  {suggestion?.idx === i && (
                    <div className="absolute top-full left-0 right-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden max-h-64 overflow-y-auto">
                      {suggestion.results.map((r) => (
                        <button
                          key={`${r.fromHistory ? "h" : "c"}-${r.name}`}
                          type="button"
                          onClick={() => applySuggestion(i, r)}
                          className="w-full flex items-center justify-between gap-2 text-left px-4 py-3 text-sm hover:bg-indigo-50 transition-colors"
                        >
                          <span>{r.name}</span>
                          {r.fromHistory && (
                            <span className="flex flex-col items-end text-xs text-indigo-400 shrink-0 leading-tight">
                              {r.lastDate && <span>{formatShortMD(r.lastDate)} 기록</span>}
                              <span>{r.weight ? `${r.weight}${r.unit}` : ""}{r.reps ? ` · ${r.reps}회` : ""}{r.sets ? ` · ${r.sets}세트` : ""}</span>
                            </span>
                          )}
                        </button>
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
                <button
                  type="button"
                  onClick={() => setExercises((p) => p.filter((_, idx) => idx !== i))}
                  className="p-2.5 text-gray-300 hover:text-red-400 active:text-red-500 transition-colors shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* 세트 / 횟수 / 중량 / 단위 — 모바일은 2x2, 넓은 화면은 1줄 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-gray-400 text-center">세트</p>
                  <NumberStepper value={ex.sets} onChange={(v) => setEx(i, "sets", v)} step={1} placeholder="3" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-gray-400 text-center">횟수</p>
                  <NumberStepper value={ex.reps} onChange={(v) => setEx(i, "reps", v)} step={1} placeholder="12" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-gray-400 text-center">중량</p>
                  <NumberStepper value={ex.weight} onChange={(v) => setEx(i, "weight", v)} step={0.5} placeholder="60" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-gray-400 text-center">단위</p>
                  <select
                    value={ex.unit}
                    onChange={(e) => setEx(i, "unit", e.target.value)}
                    className={cn(inputCls(), "text-center px-1")}
                  >
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                  </select>
                </div>
              </div>

              {/* 더보기 토글 */}
              <button
                type="button"
                onClick={() => toggleExpanded(i)}
                className="w-full flex items-center justify-between gap-2 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
              >
                <span className="flex flex-wrap gap-1.5 flex-1 text-left">
                  {!ex.expanded && ex.bodyParts.map((p) => (
                    <span key={p} className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-500">{BODY_PART_LABELS[p as BodyPart] ?? p}</span>
                  ))}
                  {!ex.expanded && ex.memo.trim() && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">메모 있음</span>}
                  {!ex.expanded && ex.videoUrls.length > 0 && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">영상 {ex.videoUrls.length}개</span>}
                </span>
                <span className="flex items-center gap-1 shrink-0 font-medium">
                  {ex.expanded ? "간략히" : "더보기"}
                  {ex.expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </span>
              </button>

              {ex.expanded && (
                <>
                  {/* 부위 태그 */}
                  <div className="flex flex-wrap gap-1.5">
                    {BODY_PART_ORDER.map((part) => (
                      <button
                        key={part}
                        type="button"
                        onClick={() => toggleBodyPart(i, part)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors",
                          ex.bodyParts.includes(part)
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-gray-500 border-gray-200 hover:bg-gray-100"
                        )}
                      >
                        {BODY_PART_LABELS[part]}
                      </button>
                    ))}
                  </div>

                  {/* 메인 운동 여부 */}
                  <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer w-fit">
                    <input
                      type="checkbox"
                      checked={ex.isMain}
                      onChange={() => toggleMain(i)}
                      className="accent-indigo-600"
                    />
                    메인 운동 (월간 리포트에서 중량·세트·반복수 추적)
                  </label>

                  {/* 메모 */}
                  <input
                    value={ex.memo}
                    onChange={(e) => setEx(i, "memo", e.target.value)}
                    className={inputCls()}
                    placeholder="메모 (선택)"
                  />

                  {/* 영상 업로드 */}
                  <div className="space-y-1.5">
                    <input
                      ref={(el) => { videoInputRefs.current[i] = el; }}
                      type="file"
                      accept="video/*"
                      className="hidden"
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
                    {ex.videoUrls.length > 0 ? "영상 추가 첨부" : "영상 첨부 (카메라롤 또는 파일, 50MB 이하)"}
                  </button>
                )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 메모 */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
        <label className="text-sm font-semibold text-gray-700">특이사항 / 메모</label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className={cn(inputCls(), "h-24 resize-none")}
          placeholder="오늘 수업 특이사항, 컨디션, 피드백 등"
        />
      </div>

      {/* 녹음 내용 (녹음 화면에서 넘어온 경우) */}
      {transcript.trim() && (
        <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setTranscriptOpen((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-700"
            >
              <Mic size={15} className="text-gray-500" /> 녹음 내용
              {transcriptOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            <Link href={clientId ? `/sessions/record?clientId=${clientId}` : "/sessions/record"} className="text-xs text-indigo-600 font-medium">녹음 화면으로</Link>
          </div>
          {transcriptOpen && (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-keep">{transcript}</p>
          )}
        </div>
      )}

      {/* 저장 버튼: 하단 고정 */}
      <div className="fixed left-0 right-0 lg:left-60 bottom-0 z-20 bg-white px-5 pt-3 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto">
          <button
            type="submit"
            disabled={loading || !clientId}
            className="press w-full h-14 rounded-2xl bg-indigo-600 active:bg-indigo-700 text-white text-[17px] font-semibold disabled:bg-gray-200 disabled:text-gray-400 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? "저장하고 있어요" : !clientId ? "회원을 선택해 주세요" : "저장하기"}
          </button>
        </div>
      </div>
    </form>
  );
}

function inputCls() {
  return "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white";
}
