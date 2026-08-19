type PartVolume = { part: string; label: string; totalSets: number };

// 세트수 → 채도 단계 (indigo-100 ~ indigo-600, 낮음 → 높음). 0은 무채색.
const INTENSITY_STEPS = ["#e0e7ff", "#c7d2fe", "#a5b4fc", "#818cf8", "#6366f1", "#4f46e5"];
const NO_DATA_FILL = "#f3f4f6"; // gray-100
const NO_DATA_STROKE = "#e5e7eb"; // gray-200
const NEUTRAL_FILL = "#e5e7eb"; // 머리 등 태그 대상이 아닌 부위

function colorFor(ratio: number): string {
  if (ratio <= 0) return NO_DATA_FILL;
  const idx = Math.min(INTENSITY_STEPS.length - 1, Math.floor(ratio * INTENSITY_STEPS.length));
  return INTENSITY_STEPS[idx];
}

export default function BodyMap({ volume }: { volume: PartVolume[] }) {
  const bySets = new Map(volume.map((v) => [v.part, v.totalSets]));
  const byLabel = new Map(volume.map((v) => [v.part, v.label]));

  // 인체 일러스트에 표현 가능한 부위만 대상으로 강도를 계산 (전신/기능적은 특정 부위가 아니라 별도 표시)
  const regionKeys = ["lower", "back", "chest", "shoulder", "arm", "core"];
  const maxSets = Math.max(0, ...regionKeys.map((k) => bySets.get(k) ?? 0));

  const fillOf = (part: string) => {
    const sets = bySets.get(part) ?? 0;
    return colorFor(maxSets > 0 ? sets / maxSets : 0);
  };
  const strokeOf = (part: string) => ((bySets.get(part) ?? 0) > 0 ? "#c7d2fe" : NO_DATA_STROKE);
  const titleOf = (part: string) => `${byLabel.get(part) ?? part} · ${bySets.get(part) ?? 0}세트`;

  const others = volume.filter((v) => v.part === "full" || v.part === "functional");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-6">
        <Figure fillOf={fillOf} strokeOf={strokeOf} titleOf={titleOf} view="front" />
        <Figure fillOf={fillOf} strokeOf={strokeOf} titleOf={titleOf} view="back" />
      </div>

      {/* 범례 */}
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-[10px] text-gray-400">적음</span>
        {[NO_DATA_FILL, ...INTENSITY_STEPS].map((c, i) => (
          <span key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />
        ))}
        <span className="text-[10px] text-gray-400">많음</span>
      </div>

      {others.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {others.map((o) => (
            <span key={o.part} className="text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-100">
              {o.label} · {o.totalSets}세트
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Figure({
  view, fillOf, strokeOf, titleOf,
}: {
  view: "front" | "back";
  fillOf: (part: string) => string;
  strokeOf: (part: string) => string;
  titleOf: (part: string) => string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 175" className="w-20 sm:w-24">
        {/* 머리 */}
        <circle cx={50} cy={16} r={13} fill={NEUTRAL_FILL} />
        <rect x={44} y={26} width={12} height={10} rx={3} fill={NEUTRAL_FILL} />

        {/* 어깨 */}
        <circle cx={26} cy={44} r={10} fill={fillOf("shoulder")} stroke={strokeOf("shoulder")} strokeWidth={1}>
          <title>{titleOf("shoulder")}</title>
        </circle>
        <circle cx={74} cy={44} r={10} fill={fillOf("shoulder")} stroke={strokeOf("shoulder")} strokeWidth={1}>
          <title>{titleOf("shoulder")}</title>
        </circle>

        {/* 팔 */}
        <rect x={10} y={42} width={16} height={60} rx={8} fill={fillOf("arm")} stroke={strokeOf("arm")} strokeWidth={1}>
          <title>{titleOf("arm")}</title>
        </rect>
        <rect x={74} y={42} width={16} height={60} rx={8} fill={fillOf("arm")} stroke={strokeOf("arm")} strokeWidth={1}>
          <title>{titleOf("arm")}</title>
        </rect>

        {view === "front" ? (
          <>
            {/* 가슴 */}
            <rect x={33} y={38} width={34} height={30} rx={7} fill={fillOf("chest")} stroke={strokeOf("chest")} strokeWidth={1}>
              <title>{titleOf("chest")}</title>
            </rect>
            {/* 코어 */}
            <rect x={36} y={68} width={28} height={28} rx={6} fill={fillOf("core")} stroke={strokeOf("core")} strokeWidth={1}>
              <title>{titleOf("core")}</title>
            </rect>
          </>
        ) : (
          /* 등 (가슴+코어 자리를 합쳐 하나의 영역으로 표현) */
          <rect x={33} y={38} width={34} height={58} rx={7} fill={fillOf("back")} stroke={strokeOf("back")} strokeWidth={1}>
            <title>{titleOf("back")}</title>
          </rect>
        )}

        {/* 하체 */}
        <rect x={33} y={98} width={16} height={68} rx={7} fill={fillOf("lower")} stroke={strokeOf("lower")} strokeWidth={1}>
          <title>{titleOf("lower")}</title>
        </rect>
        <rect x={51} y={98} width={16} height={68} rx={7} fill={fillOf("lower")} stroke={strokeOf("lower")} strokeWidth={1}>
          <title>{titleOf("lower")}</title>
        </rect>
      </svg>
      <span className="text-[10px] text-gray-400">{view === "front" ? "앞" : "뒤"}</span>
    </div>
  );
}
