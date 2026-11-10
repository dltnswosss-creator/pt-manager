// 수업 녹음 화면(/sessions/record) ↔ 수업 기록 작성 화면(/sessions/new) 사이에서 쓰는 localStorage 키와 도우미.
// 녹음한 문장은 서버에 보내지 않고 이 기기 브라우저에만 회원별로 보관한다.

export type RecordingEntry = { id: string; text: string; at: string };

// 회원별 녹음 문장. 회원을 고르지 않고 녹음한 문장은 "none"에 두었다가 회원을 고르면 그 회원 쪽으로 옮긴다.
// 해당 회원의 수업 기록을 저장하면 지운다.
export const recordingKey = (clientId: number | "" | null | undefined) =>
  `pt-manager:session-recording:${clientId ? clientId : "none"}`;

// 회원별로 나누기 전(한 개 키)에 쓰던 저장 위치. 처음 열 때 회원별 키로 옮긴다.
export const LEGACY_RECORDING_KEY = "pt-manager:session-recording";

// "AI 기록 작성" 결과를 수업 기록 작성 화면으로 넘기는 1회용 값. 작성 화면이 읽은 뒤 바로 지운다.
export const AI_HANDOFF_KEY = "pt-manager:session-ai-handoff";

export function loadRecording(clientId: number | "" | null | undefined): RecordingEntry[] {
  try {
    const raw = localStorage.getItem(recordingKey(clientId));
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRecording(clientId: number | "" | null | undefined, entries: RecordingEntry[]) {
  try {
    if (entries.length === 0) localStorage.removeItem(recordingKey(clientId));
    else localStorage.setItem(recordingKey(clientId), JSON.stringify(entries));
  } catch {}
}

// 예전 단일 키에 남아 있던 녹음을 회원별 키로 옮긴다 (그 회원 쪽에 이미 있으면 뒤에 이어붙임)
export function migrateLegacyRecording() {
  try {
    const raw = localStorage.getItem(LEGACY_RECORDING_KEY);
    if (!raw) return;
    localStorage.removeItem(LEGACY_RECORDING_KEY);
    const legacy = JSON.parse(raw);
    if (!Array.isArray(legacy?.entries) || legacy.entries.length === 0) return;
    const clientId = typeof legacy.clientId === "number" ? legacy.clientId : "";
    saveRecording(clientId, [...loadRecording(clientId), ...legacy.entries]);
  } catch {}
}
