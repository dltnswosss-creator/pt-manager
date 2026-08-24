"use client";

import { useMemo, useRef, useState } from "react";
import { formatDateShort } from "@/lib/utils";

type Point = { date: string; weight: number; unit: string };

const WIDTH = 640;
const HEIGHT = 280;
const PAD = { top: 20, right: 16, bottom: 32, left: 40 };
const PLOT_W = WIDTH - PAD.left - PAD.right;
const PLOT_H = HEIGHT - PAD.top - PAD.bottom;

function niceTicks(rawMin: number, rawMax: number, count = 4) {
  let min = rawMin;
  let max = rawMax;
  if (min === max) { min -= 1; max += 1; }
  const range = max - min;
  const rawStep = range / count;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const step = norm < 1.5 ? mag : norm < 3 ? 2 * mag : norm < 7 ? 5 * mag : 10 * mag;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step * 0.5; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

export default function ProgressTrendChart({ points }: { points: Point[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const weights = points.map((p) => p.weight);
  const ticks = niceTicks(Math.min(...weights), Math.max(...weights));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const yRange = yMax - yMin || 1;

  const stepX = points.length > 1 ? PLOT_W / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: PAD.left + i * stepX,
    y: PAD.top + PLOT_H * (1 - (p.weight - yMin) / yRange),
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const baseY = PAD.top + PLOT_H;
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${baseY} L${coords[0].x.toFixed(1)},${baseY} Z`;

  const xTickIdx = useMemo(() => {
    const n = points.length;
    if (n <= 5) return points.map((_, i) => i);
    const count = 5;
    const idxs = new Set<number>();
    for (let i = 0; i < count; i++) idxs.add(Math.round((i * (n - 1)) / (count - 1)));
    return Array.from(idxs).sort((a, b) => a - b);
  }, [points.length]);

  const updateHover = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const fracX = (clientX - rect.left) / rect.width;
    const dataX = fracX * WIDTH;
    let nearest = 0;
    let best = Infinity;
    coords.forEach((c, i) => {
      const d = Math.abs(c.x - dataX);
      if (d < best) { best = d; nearest = i; }
    });
    setHoverIdx(nearest);
  };

  const hovered = hoverIdx != null ? points[hoverIdx] : null;
  const hoveredCoord = hoverIdx != null ? coords[hoverIdx] : null;
  const tooltipAlign = hoveredCoord ? (hoveredCoord.x > WIDTH * 0.7 ? "end" : hoveredCoord.x < WIDTH * 0.3 ? "start" : "center") : "center";

  return (
    <div className="relative w-full" style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-full touch-none select-none"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); updateHover(e.clientX); }}
        onPointerMove={(e) => updateHover(e.clientX)}
        onPointerLeave={() => setHoverIdx(null)}
      >
        {ticks.map((t) => {
          const y = PAD.top + PLOT_H * (1 - (t - yMin) / yRange);
          return (
            <g key={t}>
              <line x1={PAD.left} x2={WIDTH - PAD.right} y1={y} y2={y} stroke="#f3f4f6" strokeWidth={1} />
              <text x={PAD.left - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#9ca3af">{t}</text>
            </g>
          );
        })}

        {xTickIdx.map((i) => (
          <text
            key={i}
            x={coords[i].x}
            y={HEIGHT - 8}
            textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
            fontSize={10}
            fill="#9ca3af"
          >
            {formatDateShort(points[i].date)}
          </text>
        ))}

        <path d={areaPath} fill="#6366f1" opacity={0.08} stroke="none" />
        <path d={linePath} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={i === coords.length - 1 ? 5 : 4}
            fill={i === coords.length - 1 ? "#4338ca" : "#a5b4fc"}
            stroke="#fff"
            strokeWidth={2}
          />
        ))}

        {hoveredCoord && (
          <>
            <line x1={hoveredCoord.x} x2={hoveredCoord.x} y1={PAD.top} y2={baseY} stroke="#c7d2fe" strokeWidth={1} />
            <circle cx={hoveredCoord.x} cy={hoveredCoord.y} r={6} fill="#4338ca" stroke="#fff" strokeWidth={2} />
          </>
        )}
      </svg>

      {hovered && hoveredCoord && (
        <div
          className="absolute pointer-events-none bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap z-10"
          style={{
            left: `${(hoveredCoord.x / WIDTH) * 100}%`,
            top: `${(hoveredCoord.y / HEIGHT) * 100}%`,
            transform: `translate(${tooltipAlign === "end" ? "-100%" : tooltipAlign === "start" ? "0%" : "-50%"}, -130%)`,
          }}
        >
          <span className="font-semibold">{hovered.weight}{hovered.unit}</span>
          <span className="text-gray-300 ml-1.5">{formatDateShort(hovered.date)}</span>
        </div>
      )}
    </div>
  );
}
