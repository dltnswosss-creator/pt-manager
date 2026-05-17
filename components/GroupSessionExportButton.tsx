"use client";

import { useState, useRef } from "react";
import { Image as ImageIcon, Download, Copy, Check, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

type Exercise = {
  name: string;
  sets: number | null;
  reps: string | null;
  weight: number | null;
  unit: string;
  memo: string | null;
};

type GroupSession = {
  id: number;
  date: string;
  title: string | null;
  memo: string | null;
  participants: string[];
  exercises: Exercise[];
};

export default function GroupSessionExportButton({ session }: { session: GroupSession }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadingCopy, setLoadingCopy] = useState(false);
  const [loadingDown, setLoadingDown] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const getBlob = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const { toBlob } = await import("html-to-image");
    return await toBlob(cardRef.current, { backgroundColor: "#ffffff", pixelRatio: 2 });
  };

  const handleDownload = async () => {
    setLoadingDown(true);
    try {
      const blob = await getBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `그룹수업_${session.date}${session.title ? `_${session.title}` : ""}_수업일지.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setLoadingDown(false);
    }
  };

  const handleCopy = async () => {
    setLoadingCopy(true);
    try {
      const blob = await getBlob();
      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      await handleDownload();
    } finally {
      setLoadingCopy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 text-gray-300 hover:text-indigo-600 transition-colors"
        title="이미지로 내보내기"
      >
        <ImageIcon size={14} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-[480px] max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">수업 일지 내보내기</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            </div>

            <div ref={cardRef} style={{ backgroundColor: "#ffffff", borderRadius: 12, border: "1px solid #f3f4f6", padding: 20, fontFamily: "system-ui, sans-serif" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>그룹 수업 일지</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#111827" }}>{session.title || "그룹 수업"}</p>
                  {session.participants?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                      {session.participants.map((name) => (
                        <span key={name} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#eef2ff", color: "#4f46e5", fontWeight: 600 }}>{name}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{formatDate(session.date)}</p>
                  <span style={{ display: "inline-block", marginTop: 4, fontSize: 11, padding: "2px 8px", borderRadius: 999, background: "#f5f3ff", color: "#7c3aed", fontWeight: 600 }}>그룹</span>
                </div>
              </div>

              {session.exercises.length > 0 && (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                      {["#", "운동명", "세트", "횟수", "중량", "메모"].map((h) => (
                        <th key={h} style={{ padding: "6px 4px", textAlign: h === "운동명" || h === "#" || h === "메모" ? "left" : "center", fontSize: 11, fontWeight: 500, color: "#9ca3af" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {session.exercises.map((e, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #fafafa" }}>
                        <td style={{ padding: "8px 4px", fontSize: 11, color: "#d1d5db" }}>{i + 1}</td>
                        <td style={{ padding: "8px 4px", fontWeight: 600, color: "#111827" }}>{e.name}</td>
                        <td style={{ padding: "8px 4px", textAlign: "center", color: "#4b5563" }}>{e.sets ?? "-"}</td>
                        <td style={{ padding: "8px 4px", textAlign: "center", color: "#4b5563" }}>{e.reps ?? "-"}</td>
                        <td style={{ padding: "8px 4px", textAlign: "center", color: "#4b5563" }}>{e.weight ? `${e.weight}${e.unit}` : "-"}</td>
                        <td style={{ padding: "8px 4px", fontSize: 11, color: "#9ca3af" }}>{e.memo ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {session.memo && (
                <div style={{ background: "#f9fafb", borderRadius: 8, padding: "10px 14px", marginTop: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 500, color: "#6b7280", marginBottom: 4 }}>메모</p>
                  <p style={{ fontSize: 13, color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{session.memo}</p>
                </div>
              )}

              <div style={{ borderTop: "1px solid #f3f4f6", marginTop: 16, paddingTop: 10 }}>
                <p style={{ fontSize: 11, color: "#d1d5db", textAlign: "right" }}>PT Manager</p>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleCopy}
                disabled={loadingCopy || loadingDown}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {loadingCopy ? <Loader2 size={15} className="animate-spin" /> : copied ? <Check size={15} /> : <Copy size={15} />}
                {loadingCopy ? "처리 중..." : copied ? "복사됨!" : "클립보드 복사"}
              </button>
              <button
                onClick={handleDownload}
                disabled={loadingCopy || loadingDown}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-60 transition-colors"
              >
                {loadingDown ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                {loadingDown ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
