"use client";

import { useRef, useState } from "react";
import { Video, Loader2, CheckCircle, X, ExternalLink } from "lucide-react";
import { uploadWithProgress } from "@/lib/utils";
import { maybeCompressVideo } from "@/lib/video";

export default function ExerciseVideoUpload({
  exerciseId,
  initialVideoUrls,
}: {
  exerciseId: number;
  initialVideoUrls: string[];
}) {
  const [videoUrls, setVideoUrls] = useState(initialVideoUrls);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState<"compressing" | "uploading">("uploading");
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > 200 * 1024 * 1024) {
      alert("영상은 200MB 이하만 업로드 가능합니다.");
      return;
    }
    setUploading(true);
    setProgress(0);
    setStage("compressing");
    try {
      const { blob, fileName } = await maybeCompressVideo(file);
      setStage("uploading");
      const res = await fetch("/api/upload/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, fileSize: blob.size }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "업로드 실패");
        return;
      }
      await uploadWithProgress(data.signedUrl, blob, setProgress);

      const newUrls = [...videoUrls, data.publicUrl];
      const patchRes = await fetch(`/api/exercises/${exerciseId}/videos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrls: newUrls }),
      });
      if (!patchRes.ok) throw new Error("DB 저장 실패");
      setVideoUrls(newUrls);
    } catch (err) {
      const timedOut = err instanceof Error && err.message === "upload timed out";
      alert(timedOut
        ? "업로드가 너무 오래 걸려 취소했습니다. 네트워크 상태를 확인하고 다시 시도해주세요."
        : "영상 업로드에 실패했습니다. 네트워크 상태를 확인하고 다시 시도해주세요.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeVideo = async (idx: number) => {
    const newUrls = videoUrls.filter((_, i) => i !== idx);
    const res = await fetch(`/api/exercises/${exerciseId}/videos`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ videoUrls: newUrls }),
    });
    if (res.ok) setVideoUrls(newUrls);
  };

  return (
    <div className="mt-1.5 space-y-1">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {videoUrls.map((url, i) => (
        <div key={url} className="flex items-center gap-1.5">
          <CheckCircle size={13} className="text-emerald-500 shrink-0" />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-emerald-600 font-medium hover:underline"
          >
            영상 {i + 1} <ExternalLink size={11} />
          </a>
          <button
            onClick={() => removeVideo(i)}
            className="p-0.5 text-gray-300 hover:text-red-400 transition-colors ml-1"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      {uploading ? (
        <div className="flex items-center gap-1.5">
          <Loader2 size={13} className="animate-spin text-indigo-500 shrink-0" />
          <span className="text-xs text-gray-400">
            {stage === "compressing" ? "영상 압축 중..." : `업로드 중... ${progress}%`}
          </span>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-indigo-500 transition-colors"
        >
          <Video size={13} />
          {videoUrls.length > 0 ? "영상 추가" : "영상 업로드"}
        </button>
      )}
    </div>
  );
}
