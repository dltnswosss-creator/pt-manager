"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const isPlainNumber = (v: string) => /^-?\d+(\.\d+)?$/.test(v.trim());

export default function NumberStepper({
  value,
  onChange,
  step = 1,
  min = 0,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  step?: number;
  min?: number;
  placeholder?: string;
}) {
  const steppable = isPlainNumber(value) || value.trim() === "";

  const bump = (dir: 1 | -1) => {
    const current = parseFloat(value) || 0;
    const next = Math.max(min, Math.round((current + dir * step) * 100) / 100);
    onChange(String(next));
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => bump(-1)}
        disabled={!steppable}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-40 disabled:pointer-events-none transition-colors"
      >
        <Minus size={14} />
      </button>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full min-w-0 px-1 py-2 border border-gray-200 rounded-lg text-sm text-center text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
        )}
      />
      <button
        type="button"
        onClick={() => bump(1)}
        disabled={!steppable}
        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-40 disabled:pointer-events-none transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
