import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

export function formatDateShort(dateStr: string) {
  const d = new Date(dateStr);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}/${mm}/${dd}`;
}

// PUT을 fetch가 아닌 XHR로 보내는 이유: fetch는 업로드 진행률을 알 수 없고,
// 네트워크가 끊겨도 요청이 영원히 pending 상태로 남을 수 있어 대용량 영상(모바일 회선)에서 "업로드 중"에 멈춘 것처럼 보임.
export function uploadWithProgress(
  url: string,
  body: Blob,
  onProgress?: (percent: number) => void,
  timeoutMs = 10 * 60 * 1000
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.timeout = timeoutMs;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`upload failed with status ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error("network error"));
    xhr.ontimeout = () => reject(new Error("upload timed out"));
    xhr.send(body);
  });
}

export function calcAge(birthDate: string) {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// 브라우저 기준 오늘 날짜 "YYYY-MM-DD" (toISOString은 UTC라 한국 시간 0~9시에는 전날이 됨)
export function todayLocal(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// 서버(Vercel, UTC)에서도 한국 시간 기준 "오늘"과 현재 시각(분)을 구한다
export function seoulNow(d: Date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(d).map((p) => [p.type, p.value])
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

// "오늘" / "어제" / "11월 8일"
export function relativeDayLabel(dateStr: string, today: string) {
  if (dateStr === today) return "오늘";
  const t = new Date(`${today}T00:00:00`);
  const d = new Date(`${dateStr}T00:00:00`);
  const diff = Math.round((t.getTime() - d.getTime()) / 86_400_000);
  if (diff === 1) return "어제";
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
