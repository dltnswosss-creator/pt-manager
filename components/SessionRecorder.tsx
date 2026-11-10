"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SonioxClient, Recording, RealtimeResult } from "@soniox/client";
import { ChevronLeft, ChevronDown, Mic, Loader2 } from "lucide-react";
import { cn, todayLocal } from "@/lib/utils";
import { COMMON_EXERCISES, type SessionAnalysis } from "@/lib/types";
import {
  AI_HANDOFF_KEY, loadRecording, saveRecording, migrateLegacyRecording, type RecordingEntry,
} from "@/lib/sessionRecording";

// 수업 녹음 화면: 버튼을 누르고 있는 동안만 녹음(push-to-talk)하고, 말한 문장이 목록에 쌓인다.
// 누를 때마다 Soniox 실시간 STT에 새로 연결한다. 마이크가 먼저 켜지고 연결되는 동안의 음성은 SDK가 버퍼링하므로
// 첫마디가 잘리지 않고, 과금도 누르고 있는 시간만큼만 된다.
// 끝나면 AI가 문장들을 분석해 수업 기록 작성 화면으로 넘긴다.

type Entry = RecordingEntry;
type Client = { id: number; name: string };
type ScheduleLite = { date: string; startTime: string; endTime: string | null; clientId: number; locationName: string | null };

// Soniox 제어 토큰(<end>, <fin>)은 SDK가 걸러 주지만 혹시 남아 있으면 무시한다.
// 문장 구분은 SDK의 "endpoint" 이벤트(말이 끊긴 지점)로 한다.
const CONTROL_TOKEN = /^<\w+>$/;
const MIN_HOLD_MS = 400;
// 마지막으로 녹음 화면에서 고른 회원 (회원 상세가 아닌 곳에서 들어왔을 때 이어서 보여주기 위함)
const LAST_CLIENT_KEY = "pt-manager:session-recording:last";

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

// 오늘 일정 중 지금 진행 중이거나 30분 안에 시작/종료되는 수업의 회원
function pickCurrentClient(schedules: ScheduleLite[]): number | null {
  const now = new Date();
  const today = todayLocal(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let best: { clientId: number; dist: number } | null = null;
  for (const s of schedules) {
    if (s.date !== today) continue;
    const start = toMin(s.startTime);
    const end = s.endTime ? toMin(s.endTime) : start + 60;
    if (nowMin < start - 30 || nowMin > end + 30) continue;
    const dist = Math.abs(nowMin - start);
    if (!best || dist < best.dist) best = { clientId: s.clientId, dist };
  }
  return best?.clientId ?? null;
}

export default function SessionRecorder({
  clients,
  schedules,
  defaultClientId,
}: {
  clients: Client[];
  schedules: ScheduleLite[];
  defaultClientId?: number;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState<number | "">(defaultClientId ?? "");
  const [clientAuto, setClientAuto] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [partials, setPartials] = useState<Record<string, string>>({});
  const [holding, setHolding] = useState(false);
  const [holdMs, setHoldMs] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleted, setDeleted] = useState<{ entry: Entry; index: number } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  // 버튼을 뗀 뒤 마지막 인식 결과를 기다리는 녹음 수 (그동안 회원을 바꾸면 결과가 다른 회원 쪽에 들어가므로 막는다)
  const [finishing, setFinishing] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  const clientRef = useRef<SonioxClient | null>(null);
  const activeRef = useRef<{ rec: Recording; startedAt: number } | null>(null);
  const loadedRef = useRef(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  // 해당 회원의 녹음 문장. 회원 없이 녹음해 둔 문장이 있으면 그 회원 쪽으로 옮겨 이어붙인다.
  const entriesFor = (id: number | ""): Entry[] => {
    const own = loadRecording(id);
    if (!id) return own;
    const unassigned = loadRecording("");
    if (unassigned.length === 0) return own;
    saveRecording("", []);
    return [...own, ...unassigned];
  };

  const changeClient = (next: number | "") => {
    if (next === clientId) return;
    // 회원 없이 녹음 중이던 문장은 새로 고른 회원 쪽으로 옮긴다 (현재 화면 상태 기준)
    const carry = !clientId && next ? entries : [];
    if (carry.length) saveRecording("", []);
    const nextEntries = [...loadRecording(next), ...carry];
    setClientId(next);
    setClientAuto(false);
    setEntries(nextEntries);
    setEditingId(null);
    setDeleted(null);
  };

  // 녹음 내용 복원 + 회원 자동 선택.
  // localStorage와 현재 시각은 서버 렌더링 때 알 수 없어 마운트 후에 반영한다 (렌더 중에 읽으면 hydration 불일치)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // 개발 모드(StrictMode)에서 effect가 두 번 실행돼도 복원은 한 번만
    // (두 번째 실행 때는 자동 저장이 초기값으로 덮어쓴 뒤라 빈 내용을 다시 읽게 됨)
    if (loadedRef.current) return;
    migrateLegacyRecording();

    // 회원 결정: 회원 상세에서 들어옴 > (회원 없이 녹음해 둔 문장이 있으면 그걸 그대로 보여줌)
    //            > 지금 진행 중인 일정 > 마지막으로 녹음하던 회원(남은 문장이 있을 때)
    let initial: number | "" = "";
    if (defaultClientId) {
      initial = defaultClientId;
    } else if (loadRecording("").length > 0) {
      initial = "";
    } else {
      const auto = pickCurrentClient(schedules);
      if (auto) {
        initial = auto;
        setClientAuto(true);
      } else {
        try {
          const last = Number(localStorage.getItem(LAST_CLIENT_KEY));
          if (last && clients.some((c) => c.id === last) && loadRecording(last).length > 0) initial = last;
        } catch {}
      }
    }
    setClientId(initial);
    setEntries(entriesFor(initial));
    loadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // 녹음 내용은 회원별로 기기에 계속 임시 저장 (새로고침·화면 이동에도 유지)
  useEffect(() => {
    if (!loadedRef.current) return;
    try {
      saveRecording(clientId, entries);
      if (clientId) localStorage.setItem(LAST_CLIENT_KEY, String(clientId));
    } catch {}
  }, [entries, clientId]);

  // 선택한 회원이 예전에 한 운동 이름 → 음성 인식 힌트와 AI 분석에 사용
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!clientId) { setHistory([]); return; }
      try {
        const res = await fetch(`/api/clients/${clientId}`);
        const data = await res.json();
        if (cancelled) return;
        const names = new Set<string>();
        for (const s of data.sessions ?? []) for (const e of s.exercises ?? []) names.add(e.name);
        setHistory([...names]);
      } catch {
        if (!cancelled) setHistory([]);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  // 누르고 있는 동안 경과 시간
  useEffect(() => {
    if (!holding) return;
    const t0 = Date.now();
    const id = setInterval(() => setHoldMs(Date.now() - t0), 200);
    return () => clearInterval(id);
  }, [holding]);

  // 새 문장이 생기면 맨 아래로
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [entries.length, partials]);

  // 페이지를 떠나면 진행 중인 녹음 연결을 닫는다
  useEffect(() => () => activeRef.current?.rec.cancel(), []);

  const knownExercises = [...new Set([...history, ...COMMON_EXERCISES])];

  const getClient = async () => {
    if (clientRef.current) return clientRef.current;
    const { SonioxClient } = await import("@soniox/client");
    clientRef.current = new SonioxClient({
      config: async () => {
        const res = await fetch("/api/stt/token", { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.api_key) throw new Error(data.error ?? "음성 인식 연결 키를 받지 못했습니다");
        return { api_key: data.api_key as string };
      },
    });
    return clientRef.current;
  };

  // 한 번 누르는 동안의 인식 결과를 문장 단위로 목록에 반영
  const handleResult = (ctx: { entryId: string | null }, result: RealtimeResult) => {
    let partial = "";
    for (const t of result.tokens) {
      const text = t.text;
      if (CONTROL_TOKEN.test(text.trim())) continue;
      if (!t.is_final) { partial += text; continue; }
      if (!ctx.entryId) {
        const entry: Entry = { id: newId(), text: text.trimStart(), at: new Date().toISOString() };
        ctx.entryId = entry.id;
        setEntries((prev) => [...prev, entry]);
      } else {
        const id = ctx.entryId;
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, text: e.text + text } : e)));
      }
    }
    // 아직 확정 전인 말은 현재 문장 뒤에 흐리게 보여준다 (문장이 아직 없으면 임시 자리)
    const key = ctx.entryId ?? "__pending__";
    setPartials((p) => {
      const n = { ...p };
      if (partial.trim()) n[key] = partial; else delete n[key];
      if (ctx.entryId) delete n.__pending__;
      return n;
    });
  };

  const startHold = async () => {
    if (activeRef.current || analyzing) return;
    setError(null);
    setHint(null);
    setHoldMs(0);
    setHolding(true);
    setConnecting(true);
    navigator.vibrate?.(20);

    try {
      const client = await getClient();
      const { AudioPermissionError, AudioDeviceError } = await import("@soniox/client");
      const ctx = { entryId: null as string | null };
      const rec = client.realtime.record({
        model: "stt-rt-v6",
        language_hints: ["ko"],
        enable_endpoint_detection: true,
        context: {
          general: [
            { key: "domain", value: "퍼스널 트레이닝(PT) 헬스 수업" },
            { key: "speaker", value: "트레이너가 수업 내용을 기록하려고 말하는 중" },
          ],
          terms: knownExercises.slice(0, 100),
        },
      });
      activeRef.current = { rec, startedAt: Date.now() };
      rec.on("connected", () => setConnecting(false));
      rec.on("result", (r) => handleResult(ctx, r));
      // 말이 끊긴 지점 → 다음 말은 새 문장으로
      rec.on("endpoint", () => { ctx.entryId = null; });
      rec.on("error", (err) => {
        console.error("녹음 오류:", err);
        if (err instanceof AudioPermissionError) setError("마이크 권한이 필요해요. 브라우저 설정에서 마이크를 허용해 주세요.");
        else if (err instanceof AudioDeviceError) setError("마이크를 찾을 수 없어요.");
        else setError(err.message || "녹음 중 문제가 생겼어요");
        if (activeRef.current?.rec === rec) activeRef.current = null;
        setHolding(false);
        setConnecting(false);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "녹음을 시작하지 못했어요");
      activeRef.current = null;
      setHolding(false);
      setConnecting(false);
    }
  };

  const endHold = async () => {
    const active = activeRef.current;
    setHolding(false);
    setConnecting(false);
    if (!active) return;
    activeRef.current = null;

    if (Date.now() - active.startedAt < MIN_HOLD_MS) {
      active.rec.cancel();
      setPartials((p) => { const n = { ...p }; delete n.__pending__; return n; });
      setHint("버튼을 누른 채로 말씀하세요");
      return;
    }
    setFinishing((n) => n + 1);
    try {
      await active.rec.stop(); // 남은 음성까지 확정된 결과를 받은 뒤 종료
    } catch (err) {
      console.error("녹음 종료 오류:", err);
    } finally {
      setFinishing((n) => n - 1);
    }
    setPartials({});
    setEntries((prev) => prev.filter((e) => e.text.trim()));
  };

  // 데스크톱: 스페이스바를 누르고 있는 동안 녹음
  useEffect(() => {
    const isTyping = (el: EventTarget | null) =>
      el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || isTyping(e.target)) return;
      e.preventDefault();
      startHold();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isTyping(e.target)) return;
      e.preventDefault();
      endHold();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  });

  const startEdit = (e: Entry) => {
    setEditingId(e.id);
    setEditText(e.text);
  };
  const saveEdit = () => {
    if (!editingId) return;
    const text = editText.trim();
    if (!text) {
      removeEntry(editingId);
    } else {
      setEntries((prev) => prev.map((e) => (e.id === editingId ? { ...e, text } : e)));
    }
    setEditingId(null);
  };
  const removeEntry = (id: string) => {
    const index = entries.findIndex((e) => e.id === id);
    if (index === -1) return;
    setDeleted({ entry: entries[index], index });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };
  const undoDelete = () => {
    if (!deleted) return;
    setEntries((prev) => {
      const copy = [...prev];
      copy.splice(Math.min(deleted.index, copy.length), 0, deleted.entry);
      return copy;
    });
    setDeleted(null);
  };

  // 삭제 실행 취소 안내는 잠시 후 사라짐
  useEffect(() => {
    if (!deleted) return;
    const t = setTimeout(() => setDeleted(null), 5000);
    return () => clearTimeout(t);
  }, [deleted]);

  const clearAll = () => {
    if (!confirm("녹음한 문장을 모두 지울까요?")) return;
    setEntries([]);
    setDeleted(null);
  };

  const analyze = async () => {
    const transcript = entries.map((e) => e.text.trim()).filter(Boolean).join("\n");
    if (!transcript) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, knownExercises }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "녹음 분석에 실패했어요");
      localStorage.setItem(AI_HANDOFF_KEY, JSON.stringify({
        clientId: clientId || null,
        recordingClientId: clientId || null, // 수업 기록을 저장하면 이 회원의 녹음 문장을 지운다
        transcript,
        analysis: data as SessionAnalysis,
      }));
      router.push(clientId ? `/sessions/new?clientId=${clientId}` : "/sessions/new");
    } catch (err) {
      setError(err instanceof Error ? err.message : "녹음 분석에 실패했어요");
      setAnalyzing(false);
    }
  };

  const busy = holding || analyzing || finishing > 0;
  const pendingPartial = partials.__pending__;
  const client = clients.find((c) => c.id === clientId);
  const today = todayLocal();
  const todaySchedule = clientId ? schedules.find((s) => s.clientId === clientId && s.date === today) : undefined;
  const started = entries.length > 0 || !!pendingPartial || holding;
  const editing = editingId ? entries.find((e) => e.id === editingId) ?? null : null;
  const holdSec = Math.floor(holdMs / 1000);

  // 회원 고르기: 칩/제목 위에 투명한 select를 덮어 기본 선택창을 띄운다
  const clientSelect = (
    <select
      aria-label="회원 선택"
      value={clientId}
      onChange={(e) => changeClient(e.target.value ? Number(e.target.value) : "")}
      disabled={busy}
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
    >
      <option value="">회원 선택 안 함</option>
      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  );

  return (
    <div className="max-w-2xl mx-auto bg-white">
      {/* 상단 바 */}
      <header className="sticky top-0 z-10 bg-white h-14 px-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
          className="w-11 h-11 flex items-center justify-center text-gray-900 shrink-0"
          aria-label="뒤로"
        >
          <ChevronLeft size={26} strokeWidth={2} />
        </button>
        {started && (
          <span className="relative min-w-0 flex items-center gap-1 text-[17px] font-semibold text-gray-900">
            <span className="truncate">{client ? `${client.name} 님` : "회원 미지정"}</span>
            <ChevronDown size={18} className="text-gray-400 shrink-0" />
            {clientSelect}
          </span>
        )}
        <button
          type="button"
          onClick={analyze}
          disabled={busy || entries.length === 0}
          className="press h-11 px-3 text-[17px] font-semibold text-indigo-600 disabled:text-gray-300 shrink-0"
        >
          정리
        </button>
      </header>

      {/* 시작 전: 누구의 수업인지 크게 */}
      {!started && (
        <div className="px-5 pt-2 space-y-3">
          <h1 className="text-[28px] leading-snug font-bold text-gray-900 break-keep">
            {client ? <>{client.name} 님 수업을<br />기록할게요</> : <>누구의 수업을<br />기록할까요?</>}
          </h1>
          <div className="flex items-center flex-wrap gap-2">
            {todaySchedule && (
              <span className="text-[15px] text-gray-500">
                {todaySchedule.startTime}{todaySchedule.endTime ? ` – ${todaySchedule.endTime}` : ""}
                {todaySchedule.locationName ? ` · ${todaySchedule.locationName}` : ""}
              </span>
            )}
            <span className="press relative h-8 px-2.5 rounded-lg bg-gray-100 text-[13px] font-medium text-gray-700 flex items-center">
              {client ? "회원 변경" : "회원 선택"}
              {clientSelect}
            </span>
          </div>
          {clientAuto && client && (
            <p className="text-[13px] text-indigo-600">지금 진행 중인 일정의 회원이에요</p>
          )}
        </div>
      )}

      {/* 말한 문장: 한 문단 안에서 이어지고, 탭하면 수정 시트가 열린다 */}
      <div className="px-5 pt-5 pb-[300px]">
        {started && (
          <p className="text-[17px] leading-[2.4] text-gray-900 break-keep">
            {entries.map((e) => (
              <span key={e.id}>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={() => { if (!busy) startEdit(e); }}
                  onKeyDown={(ev) => { if (!busy && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); startEdit(e); } }}
                  className={cn(
                    // 줄이 넘어가면 잘린 쪽은 모서리 없이 이어져 한 문장이 계속된다는 게 보이게 한다
                    "rounded-[10px] px-2.5 py-1 box-decoration-slice transition-colors cursor-pointer",
                    editingId === e.id ? "bg-indigo-50 text-indigo-600 font-semibold" : "bg-gray-100 hover:bg-gray-200 active:bg-gray-200"
                  )}
                >
                  {e.text}
                  {partials[e.id] && <span className="text-gray-400">{partials[e.id]}</span>}
                </span>{" "}
              </span>
            ))}
            {pendingPartial && (
              <span className="rounded-[10px] px-2.5 py-1 box-decoration-slice bg-indigo-50 text-indigo-600">{pendingPartial}</span>
            )}
          </p>
        )}
        {entries.length > 0 && !busy && (
          <button type="button" onClick={clearAll} className="mt-6 text-[13px] font-medium text-gray-500 py-2">
            모두 지우기
          </button>
        )}
        <div ref={listEndRef} />
      </div>

      {/* 하단: 누르고 있는 동안 녹음 */}
      <div className="fixed left-0 right-0 lg:left-60 bottom-0 z-20 bg-white pt-3 pb-[calc(2rem+env(safe-area-inset-bottom))] flex flex-col items-center gap-3">
        {error && (
          <p className="px-5 text-center text-[13px] text-red-500 break-keep">{error}</p>
        )}
        {deleted && (
          <div className="mx-5 self-stretch max-w-md sm:self-center sm:w-full flex items-center justify-between gap-3 rounded-2xl bg-gray-800 px-4 py-3.5 text-[15px] text-white">
            <span>문장을 지웠어요</span>
            <button type="button" onClick={undoDelete} className="font-semibold text-indigo-300">되돌리기</button>
          </div>
        )}
        <span className={cn("h-7 text-xl font-bold tabular-nums", holding ? "text-indigo-600" : "text-transparent")} aria-live="polite">
          {holding ? `${Math.floor(holdSec / 60)}:${String(holdSec % 60).padStart(2, "0")}` : "0:00"}
        </span>
        <div className={cn("w-[136px] h-[136px] rounded-full flex items-center justify-center transition-colors duration-200", holding ? "bg-indigo-50" : "bg-transparent")}>
          <button
            type="button"
            aria-label="누르고 있는 동안 녹음"
            disabled={analyzing}
            onPointerDown={(ev) => { ev.preventDefault(); ev.currentTarget.setPointerCapture(ev.pointerId); startHold(); }}
            onPointerUp={() => endHold()}
            onPointerCancel={() => endHold()}
            onContextMenu={(ev) => ev.preventDefault()}
            style={{ touchAction: "none", WebkitTouchCallout: "none" }}
            className={cn(
              "select-none w-[88px] h-[88px] rounded-full flex items-center justify-center text-white transition-all duration-200 shadow-[0_4px_12px_rgba(49,130,246,0.24)] disabled:opacity-40",
              holding ? "bg-indigo-700 scale-[0.97]" : "bg-indigo-600"
            )}
          >
            <Mic size={32} strokeWidth={2} />
          </button>
        </div>
        <p className="text-[15px] text-gray-700">
          {holding ? (connecting ? "연결 중이에요, 말씀하셔도 돼요" : "손을 떼면 멈춰요") : (hint ?? "누르고 있는 동안 녹음돼요")}
        </p>
        <p className="hidden lg:block -mt-2 text-[13px] text-gray-500">스페이스바를 누르고 있어도 돼요</p>
      </div>

      {/* 문장 수정 바텀시트 */}
      {editing && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="sentence-sheet-title">
          <button type="button" aria-label="닫기" onClick={() => setEditingId(null)} className="absolute inset-0 bg-[rgba(25,31,40,0.48)]" />
          <div className="absolute left-0 right-0 bottom-0 mx-auto max-w-2xl bg-white rounded-t-[20px] px-5 pt-3 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-5">
            <span className="block mx-auto w-9 h-1 rounded-full bg-gray-200" />
            <h2 id="sentence-sheet-title" className="text-xl font-bold text-gray-900">문장 수정</h2>
            <label htmlFor="sentence-edit" className="sr-only">문장</label>
            <textarea
              id="sentence-edit"
              autoFocus
              value={editText}
              onChange={(ev) => setEditText(ev.target.value)}
              rows={3}
              className="w-full rounded-[14px] bg-gray-50 p-4 text-[17px] leading-relaxed text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => { removeEntry(editing.id); setEditingId(null); }} className="press h-14 rounded-2xl bg-red-50 text-[17px] font-semibold text-red-500">
                삭제
              </button>
              <button type="button" onClick={saveEdit} className="press h-14 rounded-2xl bg-indigo-600 active:bg-indigo-700 text-[17px] font-semibold text-white">
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 정리 중 */}
      {analyzing && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col items-center justify-center gap-4 px-5 text-center">
          <Loader2 size={36} className="animate-spin text-indigo-600" />
          <p className="text-xl font-bold text-gray-900">수업 기록을 정리하고 있어요</p>
          <p className="text-[15px] text-gray-500">말씀하신 내용으로 운동과 피드백을 채워요</p>
        </div>
      )}
    </div>
  );
}
