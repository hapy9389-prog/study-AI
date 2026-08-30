"use client";

import type { CalendarMonthCell } from "@/lib/calendarMonth";
import type { CalendarDaySummary } from "@/lib/calendarMemory";
import type { ReflectionEvidence } from "@/lib/types";
import { WEEKDAY_LABELS } from "@/lib/studyStats";

// partial/unclear가 공유하는 구름 실루엣. 겹치는 원 2개 + 둥근 밑변 사각형을
// 전부 같은 currentColor로 채워서(겹침 경계선 없음) 별도 path 튜닝 없이
// 안정적으로 구름 모양이 나오게 한다.
function CloudGlyph({ className }: { className: string }) {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true" className={className}>
      <circle cx="3.4" cy="4.6" r="1.5" fill="currentColor" />
      <circle cx="6.1" cy="4" r="1.9" fill="currentColor" />
      <rect x="1.6" y="5" width="6.8" height="2.6" rx="1.3" fill="currentColor" />
    </svg>
  );
}

// 날짜 셀 clarity 마커. emoji 대신 다른 탭과 같은 인라인 SVG line-icon 언어를
// 그대로 쓴다(components/layout/BottomNavigation.tsx 참고). "선명도"를 날씨
// 은유로 표현한다 — clear=sparkle, partial/unclear=구름(흐릴수록 옅고 안개
// haze가 붙는다). 흐림(blur)은 항상 decorative aria-hidden span에만 건다 —
// 숫자/텍스트에는 절대 걸지 않는다(components/memory/MemoryRecordCard.tsx의
// MemoryHaze와 같은 원칙).
function ClarityMark({
  clarity,
  hasRecords,
}: {
  clarity: ReflectionEvidence | null;
  hasRecords: boolean;
}) {
  if (!hasRecords) return null;

  if (clarity === "clear") {
    return (
      <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden="true" className="text-peach-deep">
        <path d="M5 0 6 4 10 5 6 6 5 10 4 6 0 5 4 4Z" fill="currentColor" />
      </svg>
    );
  }
  if (clarity === "partial") {
    return <CloudGlyph className="text-cocoa/55" />;
  }
  if (clarity === "unclear") {
    return (
      <span className="relative inline-flex h-[9px] w-[9px] items-center justify-center">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-2 rounded-full bg-cocoa/18 blur-sm"
        />
        <CloudGlyph className="relative text-cocoa/18" />
      </span>
    );
  }
  // clarity 판정이 없는(legacy) 기록만 있는 날 — 의미 없이 "기록 있음"만 표시.
  return <span aria-hidden="true" className="h-[5px] w-[5px] rounded-full bg-warm-gray" />;
}

interface CalendarGridProps {
  cells: CalendarMonthCell[];
  summaries: Map<number, CalendarDaySummary>;
  selectedDayStart: number;
  todayDayStart: number;
  onSelectDay: (dayStart: number) => void;
}

// 월간 날짜 그리드(7열×6행). 순수 표시 컴포넌트 — 선택 state는 CalendarScreen이
// 갖고, 여기서는 클릭을 그대로 위로 올려보낸다. 이전/다음 달에서 채운 칸은
// 클릭할 수 없다(옅은 숫자만 표시) — "지금 몇 월을 보는지" 혼동을 피하기 위함.
export default function CalendarGrid({
  cells,
  summaries,
  selectedDayStart,
  todayDayStart,
  onSelectDay,
}: CalendarGridProps) {
  return (
    <div>
      <div className="grid grid-cols-7 text-center text-[11px] text-warm-gray">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell) => {
          const dayNumber = new Date(cell.dayStart).getDate();

          if (!cell.isCurrentMonth) {
            return (
              <div
                key={cell.dayStart}
                className="flex aspect-square items-center justify-center"
              >
                <span className="text-xs text-warm-gray/40">{dayNumber}</span>
              </div>
            );
          }

          const summary = summaries.get(cell.dayStart);
          const isSelected = cell.dayStart === selectedDayStart;
          const isToday = cell.dayStart === todayDayStart;

          return (
            <button
              key={cell.dayStart}
              type="button"
              onClick={() => onSelectDay(cell.dayStart)}
              aria-current={isSelected ? "date" : undefined}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors ${
                isSelected ? "bg-cream-deep" : "hover:bg-cream-deep/50"
              }`}
            >
              <span className="text-xs text-cocoa">{dayNumber}</span>
              <span
                aria-hidden="true"
                className={`h-1 w-1 rounded-full ${isToday ? "bg-peach-deep" : "bg-transparent"}`}
              />
              <ClarityMark
                clarity={summary?.clarity ?? null}
                hasRecords={summary?.hasRecords ?? false}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
