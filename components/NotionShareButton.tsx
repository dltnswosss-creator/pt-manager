"use client";

import { useState } from "react";
import { ExternalLink, Loader2, RefreshCw, Check } from "lucide-react";

type Props = {
  sessionId: number;
  type: "session" | "group";
  existingUrl?: string | null;
};

export default function NotionShareButton({ sessionId, type, existingUrl }: Props) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState(existingUrl ?? null);
  const [copied, setCopied] = useState(false);

  const apiPath = type === "session"
    ? `/api/sessions/${sessionId}/share`
    : `/api/group-sessions/${sessionId}/share`;

  const handleShare = async () => {
    setLoading(true);
    try {
      const res = await fetch(apiPath, { method: "POST" });
      const data = await res.json();
      if (data.url) setUrl(data.url);
    } finally {
      setLoading(false);
    }
  };

  const handleReshare = async () => {
    setLoading(true);
    try {
      await fetch(apiPath, { method: "DELETE" });
      const res = await fetch(apiPath, { method: "POST" });
      const data = await res.json();
      if (data.url) setUrl(data.url);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (url) {
    return (
      <div className="flex items-center gap-1">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 text-emerald-500 hover:text-emerald-600 transition-colors"
          title="Notion에서 열기"
        >
          <ExternalLink size={14} />
        </a>
        <button
          onClick={handleCopy}
          className="p-1.5 text-gray-300 hover:text-indigo-600 transition-colors"
          title="링크 복사"
        >
          {copied ? <Check size={14} className="text-emerald-500" /> : <span className="text-[10px] font-medium">복사</span>}
        </button>
        <button
          onClick={handleReshare}
          disabled={loading}
          className="p-1.5 text-gray-300 hover:text-amber-500 transition-colors"
          title="Notion 페이지 재생성"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleShare}
      disabled={loading}
      className="flex items-center gap-1 p-1.5 text-gray-300 hover:text-indigo-600 transition-colors disabled:opacity-50"
      title="Notion으로 공유"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : (
        <>
          <ExternalLink size={14} />
          <span className="text-[10px] font-medium">Notion</span>
        </>
      )}
    </button>
  );
}
